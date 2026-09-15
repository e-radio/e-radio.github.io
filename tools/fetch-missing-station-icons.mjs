import { site, stationsPath, countryCode } from "../countries/site.mjs";
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import sharp from "sharp";
import { discoverIconCandidates, manifestIconCandidates, uniqueCandidates, inspectIcon, normalizeIcon } from "./lib/station-icon-candidates.mjs";

const OUTPUT_DIR = path.join(process.cwd(), "public", "station-icons", ...(countryCode === "gr" ? [] : [countryCode]));
const STATIONS_PATH = stationsPath;
const FETCH_TIMEOUT_MS = 15000;
const USER_AGENT = `${site.siteName} favicon fetcher (${site.siteUrl})`;

const elapsed = (started) => {
  const seconds = Math.floor((Date.now() - started) / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};
let activeProgress;
const detail = (message) => console.log(`  ${activeProgress?.prefix || ''} ${message}`.trimEnd());
const stage = (message) => {
  if (activeProgress) activeProgress.stage = message;
  detail(message);
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithTimeout = async (url, options = {}, attempts = 2) => {
  for (let attempt = 0; attempt <= attempts; attempt++) {
    stage(`Request ${attempt + 1}/${attempts + 1} (timeout ${FETCH_TIMEOUT_MS / 1000}s): ${url}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: {
          "User-Agent": USER_AGENT,
          ...options.headers,
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response;
    } catch (error) {
      clearTimeout(timeout);
      if (attempt === attempts) {
        throw error;
      }
      const wait = 500 * (attempt + 1);
      detail(`Retry ${attempt + 1}/${attempts} after ${error.message}; waiting ${wait}ms: ${url}`);
      await delay(wait);
    }
  }

  throw new Error(`Failed to fetch ${url}`);
};

const ensureOutputDir = async () => {
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }
};

const sanitizeFilename = (base, fallback) => {
  return (base || fallback || "station")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-]+|[-]+$/g, "") || fallback || "station";
};

const massageIconUrl = (rawUrl) => {
  try {
    const parsed = new URL(rawUrl);
    if (/googleusercontent\.com$/.test(parsed.hostname)) {
      parsed.pathname = parsed.pathname.replace(/\/s\d+\//g, (segment) => {
        return segment.includes("s") ? "/s512/" : segment;
      });
      parsed.search = parsed.search.replace(/=s\d+/g, "=s512");
    }
    return parsed.toString();
  } catch {
    return rawUrl;
  }
};

const fetchIconBuffer = async (url) => {
  try {
    const preparedUrl = massageIconUrl(url);
    const response = await fetchWithTimeout(preparedUrl, {
      headers: {
        Accept: "image/png,image/svg+xml,image/jpeg,image/webp,*/*;q=0.1",
      },
    });
    const contentType = response.headers.get("content-type") || "";
    if (!/image|svg|icon/.test(contentType)) {
      throw new Error(`Unsupported content-type ${contentType}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    detail(`Failed to download ${url}: ${error.message}`);
    return null;
  }
};

const normalizeImage = async (buffer) => {
  try {
    return await normalizeIcon(buffer);
  } catch (error) {
    detail(`Failed to process image buffer: ${error.message}`);
    return null;
  }
};

const generatePlaceholder = async (station) => {
  const name = station?.name || "Radio";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "FM";

  const backgroundHue = Math.abs([...name].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 360;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="hsl(${backgroundHue}, 70%, 55%)" />
      <stop offset="100%" stop-color="hsl(${(backgroundHue + 40) % 360}, 70%, 45%)" />
    </linearGradient>
  </defs>
  <rect width="256" height="256" fill="url(#grad)" />
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="#ffffff" font-family="'Inter', 'Arial', sans-serif" font-size="96" font-weight="700">${initials}</text>
</svg>`;

  return sharp(Buffer.from(svg)).webp({ quality: 90 }).toBuffer();
};

const chooseIconUrl = async (station) => {
  const homepage = station?.homepage;
  if (!homepage) {
    detail(`${station.name}: no homepage URL, skipping fetch.`);
    return [];
  }
  if (!/^https?:\/\//i.test(homepage)) {
    detail(`${station.name}: homepage is not a valid http(s) URL (${homepage}), skipping.`);
    return [];
  }
  const lowerHomepage = homepage.toLowerCase();
  if (/\.(mp3|aac|aacp|m3u8|pls|asx|ram|ogg|opus)(\?|$)/.test(lowerHomepage) || /\/stream(\b|\.|\/|\?|$)/.test(lowerHomepage)) {
    detail(`${station.name}: homepage looks like a stream endpoint (${homepage}), skipping.`);
    return [];
  }
  try {
    const response = await fetchWithTimeout(homepage, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    }, 1);
    const contentType = response.headers.get("content-type")?.toLowerCase() || "";
    if (!/text\/html|application\/xhtml\+xml/.test(contentType)) {
      detail(`${station.name}: homepage responded with ${contentType || "unknown type"}, skipping.`);
      return [];
    }
    const html = await response.text();
    const { candidates, manifests } = discoverIconCandidates(html, response.url || homepage);
    for (const manifestUrl of manifests) {
      try {
        stage(`Checking web manifest: ${manifestUrl}`);
        const manifestResponse = await fetchWithTimeout(manifestUrl, {}, 1);
        candidates.push(...manifestIconCandidates(await manifestResponse.json(), manifestResponse.url || manifestUrl));
      } catch (error) { detail(`Manifest unavailable: ${error.message}`); }
    }
    if (candidates.length) return uniqueCandidates(candidates);
  } catch (error) {
    detail(`${station.name}: failed to inspect homepage ${homepage} (${error.message})`);
  }

  try {
    const origin = new URL(homepage).origin;
    return [{ url: `${origin}/favicon.ico`, source: 'favicon fallback', score: 4 }];
  } catch {
    detail(`${station.name}: homepage URL invalid (${homepage}), skipping.`);
    return [];
  }
};

const processStation = async (station, index, stations) => {
  const existing = station.favicon;
  if (existing && existing.startsWith("/")) {
    const filePath = path.join(process.cwd(), existing.replace(/^\//, ""));
    if (existsSync(filePath)) {
      console.log(`• Skipped ${station.name}: local icon already exists (${existing})`);
      return { status: "skipped" };
    }
  }

  const candidates = [];
  if (existing && /^https?:/i.test(existing)) {
    candidates.push({url:existing, source:'existing favicon', score:6});
  }
  const discovered = await chooseIconUrl(station);
  candidates.push(...discovered);
  const ranked = [];
  const unique = uniqueCandidates(candidates);
  for (const [candidateIndex, candidate] of unique.entries()) {
    stage(`Checking image ${candidateIndex + 1}/${unique.length} (${candidate.source})`);
    const buffer = await fetchIconBuffer(candidate.url);
    if (!buffer) continue;
    try {
      const dimensions = await inspectIcon(buffer);
      detail(`${dimensions.width}×${dimensions.height} | ${candidate.source} | ${candidate.url}`);
      ranked.push({...candidate, ...dimensions, score:candidate.score + dimensions.quality, buffer});
    } catch (error) { detail(`Unusable image: ${error.message}`); }
  }
  ranked.sort((a,b) => b.score-a.score);
  for (const candidate of ranked) {
    stage(`Selected ${candidate.source} (${candidate.width}×${candidate.height}); fitting full logo with padding`);
    const normalized = await normalizeImage(candidate.buffer);
    if (!normalized) continue;
    const filenameBase = sanitizeFilename(station.slug || station.stationuuid || String(index), `station-${index}`);
    const filename = `${filenameBase}.webp`;
    const outputPath = path.join(OUTPUT_DIR, filename);
    await writeFile(outputPath, normalized);
    station.favicon = `/station-icons/${countryCode === "gr" ? "" : countryCode + "/"}${filename}`;
    await persistStations(stations);
    detail(`Saved ${station.favicon}`);
    return { status: "ok" };
  }

  stage("No usable artwork; generating initials placeholder");
  const placeholderBuffer = await generatePlaceholder(station);
  const filenameBase = sanitizeFilename(station.slug || station.stationuuid || String(index), `station-${index}`);
  const filename = `${filenameBase}-placeholder.webp`;
  const outputPath = path.join(OUTPUT_DIR, filename);
  await writeFile(outputPath, placeholderBuffer);
  station.favicon = `/station-icons/${countryCode === "gr" ? "" : countryCode + "/"}${filename}`;
  await persistStations(stations);
  detail(`Saved ${station.favicon}`);
  return { status: "placeholder" };
};

let persistPromise = Promise.resolve();
const persistStations = async (stations) => {
  persistPromise = persistPromise
    .catch(() => {}) // Allow later stations to retry after a failed save.
    .then(() => writeFile(STATIONS_PATH, JSON.stringify(stations, null, 2) + "\n", "utf8"));
  return persistPromise;
};

const run = async () => {
  await ensureOutputDir();
  const raw = await readFile(STATIONS_PATH, "utf8");
  const stations = JSON.parse(raw);
  const pending = stations.map((station, index) => ({ station, index })).filter(({ station }) => !station.favicon);
  const skipped = stations.length - pending.length;
  const started = Date.now();
  let ok = 0;
  let placeholders = 0;
  let errors = 0;
  const failures = [];
  console.log(`\nMissing station icons — ${site.countryName} (${countryCode.toUpperCase()})`);
  console.log(`Dataset: ${STATIONS_PATH}`);
  console.log(`Total: ${stations.length} | Existing icons skipped: ${skipped} | To process: ${pending.length}`);
  console.log(`Output: ${OUTPUT_DIR}\nImages and station data are saved automatically.\n`);

  for (const [position, { station, index }] of pending.entries()) {
    const stationStarted = Date.now();
    activeProgress = { prefix: `[${position + 1}/${pending.length}]`, stage: 'Starting' };
    console.log(`${activeProgress.prefix} ${station.name} (${station.slug || station.stationuuid})`);
    const heartbeat = setInterval(() => {
      detail(`Still working: ${activeProgress.stage} | station ${elapsed(stationStarted)} | total ${elapsed(started)}`);
    }, 10000);
    let outcome;
    try {
      const result = await processStation(station, index, stations);
      if (result.status === 'ok') { ok++; outcome = 'ICON SAVED'; }
      else if (result.status === 'placeholder') { placeholders++; outcome = 'PLACEHOLDER SAVED'; }
      else outcome = 'SKIPPED';
    } catch (error) {
      errors++;
      outcome = 'ERROR';
      failures.push(`${station.slug || station.stationuuid}: ${error.message}`);
      detail(error.message);
    } finally {
      clearInterval(heartbeat);
    }
    const completed = position + 1;
    console.log(`${activeProgress.prefix} ${outcome} | ${Math.round(completed / pending.length * 100)}% complete | Remaining: ${pending.length - completed} | Icons: ${ok} | Placeholders: ${placeholders} | Errors: ${errors} | Elapsed: ${elapsed(started)}\n`);
    activeProgress = undefined;
  }

  console.log(`${errors ? 'Finished with errors' : 'Finished'} in ${elapsed(started)}.`);
  console.log(`Processed: ${pending.length}/${pending.length} | Icons saved: ${ok} | Placeholders generated: ${placeholders} | Existing skipped: ${skipped} | Errors: ${errors}`);
  if (failures.length) {
    console.log(`Failed stations:\n${failures.map(failure => `  - ${failure}`).join('\n')}`);
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error("Unexpected error while fetching station icons", error);
  process.exit(1);
});
