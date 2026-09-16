import { site, stationsPath, countryCode } from "../countries/site.mjs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { downloadFavicon } from "./lib/favicon-download.mjs";

const OUTPUT_DIR = path.join(process.cwd(), "public", "station-icons", ...(countryCode === "gr" ? [] : [countryCode]));
const STATIONS_PATH = stationsPath;
const fetchWithRetry = url => downloadFavicon(url, {
  userAgent: `${site.siteName} favicon cache (${site.siteUrl})`,
});

const normalizeImage = async (buffer) => {
  // Decoding with sharp verifies the file contents instead of trusting the URL
  // extension or Content-Type header. HTML and other non-images fail here.
  return sharp(buffer, { animated: false, limitInputPixels: 40_000_000 })
    .rotate()
    .resize(256, 256, {
      fit: "contain",
      position: "centre",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .webp({ quality: 90 })
    .toBuffer();
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

    if (!faviconUrl) {
      station.favicon = null;
      continue;
    }

    if (faviconUrl.startsWith("/")) {
      const localPath = path.join(process.cwd(), "public", faviconUrl.replace(/^\/+/, ""));
      if (!existsSync(localPath)) {
        console.warn(`Local favicon is missing for ${station.name}: ${faviconUrl}`);
      }
      // Local paths are already cached and must not be erased by this script.
      continue;
    }

    if (!/^https?:/i.test(faviconUrl)) {
      console.warn(`Unsupported favicon URL for ${station.name}: ${faviconUrl}`);
      station.favicon = null;
      failureCount++;
      continue;
    }

    const baseName = sanitizeFilename(station.slug || station.stationuuid, station.stationuuid || String(index));

    try {
      const downloaded = await fetchWithRetry(faviconUrl);
      const buffer = await normalizeImage(downloaded);

      const filename = `${baseName}.webp`;
      const relativePath = `/station-icons/${countryCode === "gr" ? "" : countryCode + "/"}${filename}`;
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
