#!/usr/bin/env node

import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const DATA_FILE = resolve(ROOT, "src/data/stations-gr.json");
const REPORT_FILE = resolve(ROOT, "reports/metadata-endpoints.json");
const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const option = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

if (hasFlag("--help")) {
  console.log(`Usage: node tools/find-station-metadata-endpoints.mjs [options]

Checks station stream servers for public now-playing APIs. The default is a dry
run; pass --write to save verified fields in src/data/stations-gr.json.

Options:
  --write            Save verified endpoints
  --refresh          Recheck stations that already have nowplaying_url
  --slug SLUG        Check one station slug (repeatable)
  --max N            Check at most N selected stations (0 means all)
  --concurrency N    Simultaneous station checks (default: 12)
  --timeout MS       Timeout for each HTTP request (default: 6000)
  --verbose          Print failed endpoint candidates
  --help             Show this help`);
  process.exit(0);
}

const valuesFor = (name) => args.flatMap((value, index) => value === name && args[index + 1] ? [args[index + 1]] : []);
const requestedSlugs = new Set(valuesFor("--slug"));
const maxStations = Math.max(0, Number.parseInt(option("--max", "0"), 10) || 0);
const concurrency = Math.max(1, Number.parseInt(option("--concurrency", "12"), 10) || 12);
const timeoutMs = Math.max(500, Number.parseInt(option("--timeout", "6000"), 10) || 6000);
const shouldWrite = hasFlag("--write");
const refresh = hasFlag("--refresh");
const verbose = hasFlag("--verbose");

const stations = JSON.parse(await readFile(DATA_FILE, "utf8"));
let selected = stations.filter((station) => {
  if (!station.stream_url) return false;
  if (requestedSlugs.size && !requestedSlugs.has(station.slug)) return false;
  return refresh || !station.nowplaying_url;
});
if (maxStations) selected = selected.slice(0, maxStations);

const responseCache = new Map();

const fetchPayload = (url, format = "json") => {
  const key = `${format}:${url}`;
  if (!responseCache.has(key)) {
    responseCache.set(key, (async () => {
      try {
        const response = await fetch(url, {
          headers: { Accept: format === "json" ? "application/json, text/plain;q=0.8" : "text/html, text/plain" },
          redirect: "follow",
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!response.ok) return null;
        const reader = response.body?.getReader();
        if (!reader) return null;
        const chunks = [];
        let size = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 2_000_000) {
            await reader.cancel();
            return null;
          }
          chunks.push(value);
        }
        const text = Buffer.concat(chunks).toString("utf8");
        if (!text || text.length > 2_000_000) return null;
        if (format === "text") return text;
        const start = Math.min(...[text.indexOf("{"), text.indexOf("[")].filter((value) => value >= 0));
        if (!Number.isFinite(start)) return null;
        return JSON.parse(text.slice(start));
      } catch {
        return null;
      }
    })());
  }
  return responseCache.get(key);
};

const parsedUrl = (value) => {
  try { return new URL(value); } catch { return null; }
};

const cleanPath = (url) => {
  try { return decodeURIComponent(url.pathname).replace(/\/+$/, "") || "/"; }
  catch { return url.pathname.replace(/\/+$/, "") || "/"; }
};
const sameStream = (left, right) => {
  const a = parsedUrl(left);
  const b = parsedUrl(right);
  if (!a || !b) return false;
  if (a.hostname.toLowerCase() !== b.hostname.toLowerCase()) return false;
  if ((a.port || "") !== (b.port || "")) return false;
  return cleanPath(a) === cleanPath(b);
};

const azuraStationUrls = (entry) => [
  entry?.station?.listen_url,
  ...(entry?.station?.mounts || []).map((mount) => mount?.url),
  ...(entry?.station?.remotes || []).map((remote) => remote?.url),
].filter((value) => typeof value === "string");

const azuraMatch = (streamUrl, entry) => {
  const shortcode = entry?.station?.shortcode;
  const stream = parsedUrl(streamUrl);
  if (!shortcode || !stream) return false;
  if (stream.pathname.toLowerCase().includes(`/listen/${String(shortcode).toLowerCase()}/`)) return true;
  return azuraStationUrls(entry).some((url) => sameStream(streamUrl, url));
};

const hasNowPlayingText = (payload) => {
  if (!payload || typeof payload !== "object") return false;
  const values = [
    payload.songtitle, payload.title, payload.text, payload.current_song,
    ...(Array.isArray(payload.data) ? payload.data.flatMap((entry) => [entry?.song, entry?.track?.title]) : []),
    payload?.now_playing?.song?.text, payload?.now_playing?.song?.title,
    payload?.current_track?.title, payload?.data?.title,
  ];
  if (values.some((value) => typeof value === "string" && value.trim())) return true;
  const sources = payload?.icestats?.source;
  return (Array.isArray(sources) ? sources : [sources]).some((source) =>
    source && typeof source === "object" && [source.title, source.yp_currently_playing]
      .some((value) => typeof value === "string" && value.trim()));
};

const isShoutcastPayload = (payload) => Boolean(
  payload && typeof payload === "object" && hasNowPlayingText(payload) &&
  ["songtitle", "servertitle", "streamstatus", "currentlisteners"]
    .some((key) => Object.hasOwn(payload, key)),
);

const isMatchingIcecastPayload = (payload, streamUrl, requestedMount) => {
  const rawSources = payload?.icestats?.source;
  const sources = (Array.isArray(rawSources) ? rawSources : [rawSources]).filter(Boolean);
  if (!sources.length) return false;
  const normalizedMount = requestedMount.replace(/\/+$/, "");
  const matching = sources.filter((source) => {
    if (typeof source?.listenurl === "string" && sameStream(streamUrl, source.listenurl)) return true;
    const sourceMount = String(source?.listenurl || source?.mount || "");
    const sourceUrl = parsedUrl(sourceMount);
    const path = (sourceUrl ? cleanPath(sourceUrl) : sourceMount).replace(/\/+$/, "");
    return path === normalizedMount;
  });
  return matching.some((source) => [source.title, source.yp_currently_playing]
    .some((value) => typeof value === "string" && value.trim()));
};

const streamParts = (streamUrl) => {
  const url = parsedUrl(streamUrl);
  if (!url) return null;
  const segments = url.pathname.split("/").filter(Boolean);
  const sid = url.searchParams.get("sid") || segments.find((part) => /^sid\d+$/i.test(part))?.replace(/\D/g, "") || "1";
  const mountParam = url.searchParams.get("mp") || url.searchParams.get("mount");
  const mount = mountParam || (segments.length ? url.pathname.replace(/\/+$/, "") : "/stream");
  return { url, origin: url.origin, segments, sid, mount: mount.startsWith("/") ? mount : `/${mount}` };
};

const discover = async (station) => {
  const parts = streamParts(station.stream_url);
  if (!parts) return null;
  const { url, origin, segments, sid, mount } = parts;

  // AzuraCast exposes a station directory, allowing a strong stream-to-shortcode match.
  const azuraListUrl = `${origin}/api/nowplaying`;
  const azuraList = await fetchPayload(azuraListUrl);
  if (Array.isArray(azuraList)) {
    const match = azuraList.find((entry) => azuraMatch(station.stream_url, entry));
    if (match) {
      const endpoint = `${origin}/api/nowplaying/${encodeURIComponent(match.station.shortcode)}`;
      const payload = await fetchPayload(endpoint);
      if (payload?.now_playing && hasNowPlayingText(payload)) {
        return {
          nowplaying_url: endpoint,
          ...(Array.isArray(payload.song_history) && payload.song_history.length ? { history_url: endpoint } : {}),
          metadata_server: "azuracast",
        };
      }
    }
  }

  const radioCoId = (url.hostname === "radio.co" || url.hostname.endsWith(".radio.co"))
    ? segments.find((part) => /^s[a-z0-9]{9}$/i.test(part))
    : null;
  const candidates = [];
  if (radioCoId) {
    candidates.push({
      nowplaying_url: `https://public.radio.co/station/${radioCoId}/nowplaying`,
      metadata_server: "radio.co",
    });
  }

  const pathLower = url.pathname.toLowerCase();
  const likelyShoutcastHost = /radiohost|shoutca\.st|radioca\.st|myradiostream|onweb\.gr|streamwithq|fastcast4u|magicstreams|viastreaming|dedicateware|proradio|viastream/i.test(url.hostname);
  const hasShoutcastIndicators = pathLower.includes(";") || pathLower.endsWith(".pls") ||
    url.searchParams.has("sid") || url.searchParams.has("type") || url.searchParams.has("icy");
  if (likelyShoutcastHost || hasShoutcastIndicators || url.port) candidates.push({
      nowplaying_url: `${origin}/stats?sid=${encodeURIComponent(sid)}&json=1`,
      history_url: `${origin}/played?sid=${encodeURIComponent(sid)}&type=json`,
      metadata_server: "shoutcast",
      validate: isShoutcastPayload,
    });

  candidates.push({
      nowplaying_url: `${origin}/status-json.xsl?mount=${encodeURIComponent(mount)}`,
      metadata_server: "icecast",
      validate: (payload) => isMatchingIcecastPayload(payload, station.stream_url, mount),
    });

  const proxyIndex = segments.findIndex((part) => ["proxy", "sc", "ssl", "ic"].includes(part.toLowerCase()));
  const account = proxyIndex >= 0 ? segments[proxyIndex + 1] : null;
  if (account) {
    // Prefer CentovaCast's HTTPS/CORS-enabled RPC response over raw Shoutcast
    // stats. It also commonly includes separate artist, title, and artwork.
    candidates.unshift({
      nowplaying_url: `${origin}/rpc/${encodeURIComponent(account)}/streaminfo.get`,
      metadata_server: "centovacast",
      validate: (payload) => payload?.type !== "error" && Array.isArray(payload?.data) && hasNowPlayingText(payload),
    });
  }

  for (const candidate of candidates) {
    const payload = await fetchPayload(candidate.nowplaying_url);
    if ((candidate.validate || hasNowPlayingText)(payload)) {
      const { validate: _validate, ...savedCandidate } = candidate;
      if (savedCandidate.history_url) {
        const history = await fetchPayload(savedCandidate.history_url);
        if (!Array.isArray(history) || !history.some((track) =>
          typeof track?.title === "string" && track.title.trim() && Number.isFinite(Number(track.playedat)))) {
          delete savedCandidate.history_url;
        }
      }
      return savedCandidate;
    }
    if (verbose) console.log(`  rejected ${candidate.nowplaying_url}`);
  }
  return null;
};

const results = new Array(selected.length);
let cursor = 0;
const worker = async () => {
  while (true) {
    const index = cursor++;
    if (index >= selected.length) return;
    const station = selected[index];
    let found = null;
    try { found = await discover(station); }
    catch (error) { console.error(`Failed ${station.slug}: ${error.message}`); }
    results[index] = found;
    console.log(`${found ? "FOUND" : "-----"} ${station.slug}${found ? ` -> ${found.nowplaying_url}` : ""}`);
  }
};
await Promise.all(Array.from({ length: Math.min(concurrency, selected.length || 1) }, worker));

let foundCount = 0;
let changedCount = 0;
selected.forEach((station, index) => {
  const found = results[index];
  if (!found) return;
  foundCount += 1;
  if (station.nowplaying_url !== found.nowplaying_url ||
      station.history_url !== (found.history_url || undefined) ||
      station.metadata_server !== found.metadata_server) {
    station.nowplaying_url = found.nowplaying_url;
    station.metadata_server = found.metadata_server;
    if (found.history_url) station.history_url = found.history_url;
    else delete station.history_url;
    changedCount += 1;
  }
});

if (shouldWrite && changedCount) {
  const temporary = `${DATA_FILE}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(stations, null, 2)}\n`);
  await rename(temporary, DATA_FILE);
}

console.log(`\nChecked ${selected.length}; found ${foundCount}; ${shouldWrite ? "saved" : "would save"} ${changedCount}.`);
if (!shouldWrite && changedCount) console.log("Dry run only. Re-run with --write to update stations-gr.json.");

await mkdir(dirname(REPORT_FILE), { recursive: true });
await writeFile(REPORT_FILE, `${JSON.stringify({
  checkedAt: new Date().toISOString(),
  checked: selected.length,
  saved: shouldWrite ? changedCount : 0,
  dryRun: !shouldWrite,
  scope: "Selected station streams; direct server checks, not browser/CORS verification",
  verified: selected.flatMap((station, index) => results[index] ? [{ slug: station.slug, name: station.name, ...results[index] }] : []),
  notFound: selected.filter((station, index) => !results[index]).map((station) => station.slug),
}, null, 2)}\n`);
console.log(`Report: ${REPORT_FILE}`);
