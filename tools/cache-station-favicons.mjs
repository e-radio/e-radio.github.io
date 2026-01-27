import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const OUTPUT_DIR = path.join(process.cwd(), "public", "station-icons");
const STATIONS_PATH = path.join(process.cwd(), "src", "data", "stations-gr.json");
const MAX_RETRIES = 2;

const contentTypeToExtension = (contentType, url) => {
  if (contentType) {
    if (contentType.includes("svg")) return "svg";
    if (contentType.includes("png")) return "png";
    if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
    if (contentType.includes("gif")) return "gif";
    if (contentType.includes("bmp")) return "bmp";
    if (contentType.includes("webp")) return "webp";
    if (contentType.includes("x-icon") || contentType.includes("ico")) return "ico";
    if (contentType.includes("vnd.microsoft.icon")) return "ico";
  }

  try {
    const parsedUrl = new URL(url);
    const ext = path.extname(parsedUrl.pathname).toLowerCase().replace(".", "");
    if (ext) return ext;
  } catch (error) {
    // ignore
  }

  return "png";
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithRetry = async (url, retries = MAX_RETRIES) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "e-radio.github.io favicon cache" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      const backoff = 500 * (attempt + 1);
      console.warn(`Retrying ${url} after ${backoff}ms due to: ${error.message}`);
      await delay(backoff);
    }
  }
  throw new Error("Unreachable");
};

const ensureOutputDir = async () => {
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }
};

const sanitizeFilename = (base, fallback) => {
  if (!base) return fallback;
  return base.toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || fallback;
};

const cacheFavicons = async () => {
  await ensureOutputDir();

  const raw = await readFile(STATIONS_PATH, "utf8");
  const stations = JSON.parse(raw);

  let successCount = 0;
  let failureCount = 0;

  for (let index = 0; index < stations.length; index++) {
    const station = stations[index];
    const faviconUrl = (station?.favicon || "").trim();

    if (!faviconUrl || !/^https?:/i.test(faviconUrl)) {
      station.favicon = null;
      continue;
    }

    const baseName = sanitizeFilename(station.slug || station.stationuuid, station.stationuuid || String(index));

    try {
      const response = await fetchWithRetry(faviconUrl);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const extension = contentTypeToExtension(response.headers.get("content-type"), faviconUrl);
      const filename = `${baseName}.${extension}`;
      const relativePath = `/station-icons/${filename}`;
      const outputPath = path.join(OUTPUT_DIR, filename);

      await writeFile(outputPath, buffer);
      station.favicon = relativePath;
      successCount++;
      console.log(`Cached [${index + 1}/${stations.length}] ${station.name}`);
    } catch (error) {
      failureCount++;
      console.warn(`Failed to cache favicon for ${station.name}: ${error.message}`);
      station.favicon = null;
    }
  }

  await writeFile(STATIONS_PATH, JSON.stringify(stations, null, 2) + "\n", "utf8");

  console.log("\nDone caching favicons.");
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failureCount}`);
};

cacheFavicons().catch((error) => {
  console.error("Unexpected error while caching favicons:", error);
  process.exit(1);
});