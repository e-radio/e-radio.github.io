import { readFile, rename, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DATA_PATH = path.join("src", "data", "stations-gr.json");
const UPDATE_REVIEW_PATH = path.join("src", "data", "station-update-review.json");
const NEW_STATIONS_REVIEW_PATH = path.join("src", "data", "new-stations-review.json");
const API_BATCH_SIZE = 1000;

const OPERATIONAL_FIELDS = [
  "votes",
  "clickcount",
  "lastcheckok",
  "bitrate",
  "codec",
  "hls",
  "ssl_error"
];

const CURATED_FIELDS = [
  "name",
  "state",
  "city",
  "homepage",
  "favicon",
  "genres",
  "language",
  "stream_url",
  "geo_lat",
  "geo_long"
];

/**
 * Radio Browser API notes:
 * - Do NOT hardcode one server. Fetch server list from api.radio-browser.info.
 * - Then call /json/stations/bycountrycode/GR on a chosen server.
 */
async function getJson(url) {
  try {
    console.log(`Fetching: ${url}`);
    const res = await fetch(url, {
      headers: { "User-Agent": "e-radio.github.io (Astro build)" },
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error.message);
    throw error;
  }
}

async function getStationsByCountryCode(baseUrl, countryCode) {
  const stations = [];
  const seenUuids = new Set();

  for (let offset = 0; ; offset += API_BATCH_SIZE) {
    const url = new URL(
      `/json/stations/bycountrycodeexact/${countryCode}`,
      baseUrl
    );
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("limit", String(API_BATCH_SIZE));
    url.searchParams.set("order", "name");

    const batch = await getJson(url.toString());
    if (!Array.isArray(batch)) {
      throw new Error("Stations response is not an array.");
    }

    let newRecords = 0;
    for (const station of batch) {
      const key = station.stationuuid;
      if (!key || !seenUuids.has(key)) {
        stations.push(station);
        if (key) seenUuids.add(key);
        newRecords += 1;
      }
    }

    if (batch.length < API_BATCH_SIZE) return stations;
    if (newRecords === 0) {
      throw new Error("The API repeated a full page; refusing to loop forever.");
    }
  }
}

function isMissing(value) {
  return value == null || value === "" || (Array.isArray(value) && value.length === 0);
}

function valuesEqual(left, right) {
  if (Array.isArray(left) || Array.isArray(right)) {
    return JSON.stringify(left ?? []) === JSON.stringify(right ?? []);
  }
  return left === right;
}

function normalizeStreamUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    if ((url.protocol === "http:" && url.port === "80") ||
        (url.protocol === "https:" && url.port === "443")) {
      url.port = "";
    }
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
    url.searchParams.sort();
    return url.toString();
  } catch {
    return String(value).trim();
  }
}

async function readLocalStations(filePath) {
  const parsed = JSON.parse(await readFile(filePath, "utf8"));
  if (!Array.isArray(parsed)) throw new Error(`${filePath} must contain a JSON array.`);
  return parsed;
}

async function writeJsonAtomic(filePath, value) {
  const tempPath = `${filePath}.${process.pid}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tempPath, filePath);
}

function slugify(input) {
  return String(input ?? "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function makeSlug({ name, state, stationuuid }) {
  const trimmedName = (name || "").trim();
  const trimmedState = (state || "").trim();
  const normalizedName = trimmedName.toLowerCase();
  const parts = [trimmedName];

  if (trimmedState && !normalizedName.includes(trimmedState.toLowerCase())) {
    parts.push(trimmedState);
  }

  const base = slugify(parts.filter(Boolean).join(" "));
  const fallback = stationuuid ? stationuuid.slice(0, 8) : "unknown";
  return base ? base : `station-${fallback}`;
}

function mergeStations(localStations, apiStations) {
  const localByUuid = new Map();
  const localByUrl = new Map();
  const matchedLocalIndexes = new Set();
  const conflicts = [];
  const automaticUpdates = [];
  const newStations = [];

  localStations.forEach((station, index) => {
    if (station.stationuuid) localByUuid.set(station.stationuuid, index);
    const normalizedUrl = normalizeStreamUrl(station.stream_url);
    if (normalizedUrl) {
      const indexes = localByUrl.get(normalizedUrl) ?? [];
      indexes.push(index);
      localByUrl.set(normalizedUrl, indexes);
    }
  });

  const merged = localStations.map((station) => ({ ...station }));

  for (const apiStation of apiStations) {
    let localIndex = apiStation.stationuuid
      ? localByUuid.get(apiStation.stationuuid)
      : undefined;
    let matchedBy = "stationuuid";

    if (localIndex == null) {
      const normalizedUrl = normalizeStreamUrl(apiStation.stream_url);
      const urlMatches = normalizedUrl ? localByUrl.get(normalizedUrl) ?? [] : [];
      if (urlMatches.length === 1 && !matchedLocalIndexes.has(urlMatches[0])) {
        [localIndex] = urlMatches;
        matchedBy = "stream_url";
      }
    }

    if (localIndex == null) {
      newStations.push(apiStation);
      continue;
    }

    matchedLocalIndexes.add(localIndex);
    const local = merged[localIndex];
    const changedAutomatically = {};
    const needsReview = {};

    if (!local.stationuuid && apiStation.stationuuid) {
      changedAutomatically.stationuuid = {
        local: local.stationuuid ?? null,
        api: apiStation.stationuuid
      };
      local.stationuuid = apiStation.stationuuid;
    }

    for (const field of OPERATIONAL_FIELDS) {
      const apiValue = apiStation[field];
      if (!isMissing(apiValue) && !valuesEqual(local[field], apiValue)) {
        changedAutomatically[field] = { local: local[field] ?? null, api: apiValue };
        local[field] = apiValue;
      }
    }

    for (const field of CURATED_FIELDS) {
      const localValue = local[field];
      const apiValue = apiStation[field];
      if (isMissing(apiValue) || valuesEqual(localValue, apiValue)) continue;

      if (isMissing(localValue)) {
        changedAutomatically[field] = { local: localValue ?? null, api: apiValue };
        local[field] = apiValue;
      } else {
        needsReview[field] = { local: localValue, api: apiValue };
      }
    }

    if (Object.keys(changedAutomatically).length > 0) {
      automaticUpdates.push({
        stationuuid: local.stationuuid ?? apiStation.stationuuid,
        name: local.name || apiStation.name,
        matchedBy,
        fields: changedAutomatically
      });
    }

    if (Object.keys(needsReview).length > 0) {
      conflicts.push({
        stationuuid: local.stationuuid ?? apiStation.stationuuid,
        name: local.name || apiStation.name,
        matchedBy,
        fields: needsReview
      });
    }
  }

  const missingFromApi = localStations
    .filter((_, index) => !matchedLocalIndexes.has(index))
    .map((station) => ({
      stationuuid: station.stationuuid ?? null,
      name: station.name ?? null,
      stream_url: station.stream_url ?? null
    }));

  return { merged, conflicts, automaticUpdates, newStations, missingFromApi };
}

async function main() {
  console.log("Starting Greek radio stations fetch...\n");

  // 1) Fetch a list of servers
  console.log("Step 1: Fetching server list...");
  let servers;
  try {
    servers = await getJson("https://api.radio-browser.info/json/servers");
  } catch (error) {
    console.error("Failed to fetch server list. Trying direct endpoint...");
    // Fallback: use a direct server
    servers = [{ name: "de1.api.radio-browser.info" }];
  }

  if (!Array.isArray(servers) || servers.length === 0) {
    throw new Error("No Radio Browser servers available.");
  }

  console.log(`Found ${servers.length} servers. Selecting one...`);
  const chosen = servers[Math.floor(Math.random() * servers.length)];
  const host = chosen?.name;
  if (!host) throw new Error("Server entry missing name.");

  const baseUrl = `https://${host}`;
  console.log(`Using server: ${baseUrl}\n`);

  // 2) Fetch stations for Greece
  console.log("Step 2: Fetching Greek stations...");
  const rawStations = await getStationsByCountryCode(baseUrl, "GR");

  console.log(`Fetched ${rawStations.length} stations.\n`);

  // 3) Map to schema
  console.log("Step 3: Processing stations...");
  const mapped = rawStations.map((s) => {
    const name = (s.name || "").trim();
    const cityOrState = (s.state || "").trim();
    const tags = (s.tags || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 12);

    const languages = (s.language || "")
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);

    const stationuuid = s.stationuuid;
    const stream_url = s.url_resolved || s.url;

    return {
      slug: makeSlug({ name, state: cityOrState, stationuuid }),
      stationuuid,
      name,
      state: cityOrState || null,
      country: "Greece",
      countrycode: "GR",
      stream_url,
      homepage: s.homepage || null,
      favicon: s.favicon || null,
      genres: tags,
      language: languages[0] || null,
      bitrate: s.bitrate ?? null,
      codec: s.codec || null,
      clickcount: s.clickcount ?? null,
      lastcheckok: s.lastcheckok ?? null,
      votes: s.votes ?? null,
      hls: s.hls ?? 0,
      ssl_error: s.ssl_error ?? 0,
      geo_lat: s.geo_lat ?? null,
      geo_long: s.geo_long ?? null
    };
  });

  // 4) Filter invalid API entries before comparison.
  const cleaned = mapped.filter((s) => s.name && s.stationuuid && s.stream_url);

  // 5) Preserve curated values and separate uncertain changes for review.
  console.log("Step 4: Comparing with local stations...");
  const outDir = path.join(process.cwd(), "src", "data");
  const outFile = path.join(process.cwd(), DATA_PATH);
  const updateReviewFile = path.join(process.cwd(), UPDATE_REVIEW_PATH);
  const newStationsReviewFile = path.join(process.cwd(), NEW_STATIONS_REVIEW_PATH);

  if (!existsSync(outDir)) {
    await mkdir(outDir, { recursive: true });
  }

  const localStations = await readLocalStations(outFile);
  const result = mergeStations(localStations, cleaned);
  const generatedAt = new Date().toISOString();

  await writeJsonAtomic(updateReviewFile, {
    generatedAt,
    server: baseUrl,
    conflicts: result.conflicts,
    automaticUpdates: result.automaticUpdates,
    missingFromApi: result.missingFromApi
  });
  await writeJsonAtomic(newStationsReviewFile, {
    generatedAt,
    server: baseUrl,
    stations: result.newStations
  });
  // Replace the primary dataset only after both review files were written.
  await writeJsonAtomic(outFile, result.merged);

  console.log(`\n✓ Success!`);
  console.log(`  Server: ${baseUrl}`);
  console.log(`  Fetched: ${rawStations.length} stations`);
  console.log(`  Valid API records: ${cleaned.length}`);
  console.log(`  Existing local records: ${localStations.length}`);
  console.log(`  Automatic updates: ${result.automaticUpdates.length}`);
  console.log(`  Conflicts for review: ${result.conflicts.length}`);
  console.log(`  New stations for review: ${result.newStations.length}`);
  console.log(`  Local stations missing from API: ${result.missingFromApi.length}`);
  console.log(`  Safely merged: ${outFile}`);
  console.log(`  Review changes: ${updateReviewFile}`);
  console.log(`  Review new stations: ${newStationsReviewFile}`);
}

const isDirectRun = process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  main().catch((err) => {
    console.error("\n✗ Error:", err.message);
    console.error(err.stack);
    process.exit(1);
  });
}

export { mergeStations };
