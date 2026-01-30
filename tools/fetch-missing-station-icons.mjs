import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import sharp from "sharp";

const OUTPUT_DIR = path.join(process.cwd(), "public", "station-icons");
const STATIONS_PATH = path.join(process.cwd(), "src", "data", "stations-gr.json");
const FETCH_TIMEOUT_MS = 15000;
const USER_AGENT = "e-radio.github.io favicon fetcher";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithTimeout = async (url, options = {}, attempts = 2) => {
  for (let attempt = 0; attempt <= attempts; attempt++) {
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
      console.warn(`Retry ${attempt + 1} for ${url}: ${error.message}. Waiting ${wait}ms.`);
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

const absoluteUrl = (href, baseUrl) => {
  if (!href) return null;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
};

const parseHtmlIcons = (html, baseUrl) => {
  const candidates = [];
  if (!html) return candidates;

  const linkRegex = /<link\s+[^>]*>/gi;
  const relRegex = /rel\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i;
  const hrefRegex = /href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i;
  const sizesRegex = /sizes\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i;

  const weightForRel = (relValue) => {
    const value = relValue.toLowerCase();
    if (value.includes("apple-touch-icon")) return 5;
    if (value.includes("mask-icon")) return 2;
    if (value.includes("icon")) return 4;
    return 1;
  };

  const parseSizeScore = (sizesValue) => {
    if (!sizesValue) return 0;
    const sizes = sizesValue.split(/\s+/);
    let max = 0;
    for (const size of sizes) {
      const match = size.match(/^(\d+)x(\d+)$/i);
      if (match) {
        const area = Number(match[1]) * Number(match[2]);
        if (area > max) {
          max = area;
        }
      }
    }
    return max ? Math.sqrt(max) / 128 : 0;
  };

  for (const linkTag of html.matchAll(linkRegex)) {
    const tag = linkTag[0];
    const relMatch = tag.match(relRegex);
    const hrefMatch = tag.match(hrefRegex);
    if (!relMatch || !hrefMatch) continue;

    const rel = (relMatch[2] || relMatch[3] || relMatch[4] || "").toLowerCase();
    const href = absoluteUrl(hrefMatch[2] || hrefMatch[3] || hrefMatch[4], baseUrl);
    if (!href) continue;

    if (/icon/i.test(rel)) {
      const sizesMatch = tag.match(sizesRegex);
      const sizes = sizesMatch ? sizesMatch[2] || sizesMatch[3] || sizesMatch[4] : null;
      const score = weightForRel(rel) + parseSizeScore(sizes);
      candidates.push({ url: href, score });
    }
  }

  const metaRegex = /<meta\s+[^>]*>/gi;
  const propertyRegex = /property\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i;
  const contentRegex = /content\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i;

  for (const metaTag of html.matchAll(metaRegex)) {
    const tag = metaTag[0];
    const propertyMatch = tag.match(propertyRegex);
    if (!propertyMatch) continue;
    const property = (propertyMatch[2] || propertyMatch[3] || propertyMatch[4] || "").toLowerCase();
    if (property !== "og:image" && property !== "og:image:url") continue;
    const contentMatch = tag.match(contentRegex);
    const href = absoluteUrl(contentMatch?.[2] || contentMatch?.[3] || contentMatch?.[4], baseUrl);
    if (href) {
      candidates.push({ url: href, score: 3 });
    }
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .map((candidate) => candidate.url);
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
    console.warn(`Failed to download ${url}: ${error.message}`);
    return null;
  }
};

const normalizeImage = async (buffer) => {
  try {
    return await sharp(buffer, { limitInputPixels: false })
      .resize(256, 256, {
        fit: "cover",
        position: "centre",
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .webp({ quality: 90 })
      .toBuffer();
  } catch (error) {
    console.warn(`Failed to process image buffer: ${error.message}`);
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
    console.log(`✕ ${station.name}: no homepage URL, skipping fetch.`);
    return [];
  }
  if (!/^https?:\/\//i.test(homepage)) {
    console.log(`✕ ${station.name}: homepage is not a valid http(s) URL (${homepage}), skipping.`);
    return [];
  }
  const lowerHomepage = homepage.toLowerCase();
  if (/\.(mp3|aac|aacp|m3u8|pls|asx|ram|ogg|opus)(\?|$)/.test(lowerHomepage) || /\/stream(\b|\.|\/|\?|$)/.test(lowerHomepage)) {
    console.log(`✕ ${station.name}: homepage looks like a stream endpoint (${homepage}), skipping.`);
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
      console.log(`✕ ${station.name}: homepage responded with ${contentType || "unknown type"}, skipping.`);
      return [];
    }
    const html = await response.text();
    const candidates = parseHtmlIcons(html, homepage);
    if (candidates.length) {
      return candidates;
    }
  } catch (error) {
    console.warn(`✕ ${station.name}: failed to inspect homepage ${homepage} (${error.message})`);
  }

  try {
    const origin = new URL(homepage).origin;
    return [`${origin}/favicon.ico`];
  } catch {
    console.log(`✕ ${station.name}: homepage URL invalid (${homepage}), skipping.`);
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
    candidates.push(existing);
  }
  const discovered = await chooseIconUrl(station);
  for (const candidate of discovered) {
    if (!candidates.includes(candidate)) {
      candidates.push(candidate);
    }
  }

  for (const candidate of candidates) {
    const rawBuffer = await fetchIconBuffer(candidate);
    if (!rawBuffer) continue;
    const normalized = await normalizeImage(rawBuffer);
    if (!normalized) {
      continue;
    }
    const filenameBase = sanitizeFilename(station.slug || station.stationuuid || String(index), `station-${index}`);
    const filename = `${filenameBase}.webp`;
    const outputPath = path.join(OUTPUT_DIR, filename);
    await writeFile(outputPath, normalized);
    station.favicon = `/station-icons/${filename}`;
    await persistStations(stations);
    console.log(`✓ Saved icon for ${station.name} (${candidate})`);
    return { status: "ok" };
  }

  const placeholderBuffer = await generatePlaceholder(station);
  const filenameBase = sanitizeFilename(station.slug || station.stationuuid || String(index), `station-${index}`);
  const filename = `${filenameBase}-placeholder.webp`;
  const outputPath = path.join(OUTPUT_DIR, filename);
  await writeFile(outputPath, placeholderBuffer);
  station.favicon = `/station-icons/${filename}`;
  await persistStations(stations);
  console.log(`⚠️ Generated placeholder for ${station.name}`);
  return { status: "placeholder" };
};

let persistPromise = Promise.resolve();
const persistStations = async (stations) => {
  persistPromise = persistPromise
    .then(() => writeFile(STATIONS_PATH, JSON.stringify(stations, null, 2) + "\n", "utf8"))
    .catch((error) => {
      console.error("Failed to persist stations", error);
    });
  return persistPromise;
};

const run = async () => {
  await ensureOutputDir();
  const raw = await readFile(STATIONS_PATH, "utf8");
  const stations = JSON.parse(raw);
  let ok = 0;
  let placeholders = 0;
  let skipped = 0;

  for (let i = 0; i < stations.length; i++) {
    const station = stations[i];
    try {
      if (station.favicon) {
        console.log(`• Skipped ${station.name}: favicon already set (${station.favicon})`);
        skipped++;
        continue;
      }
      console.log(`→ ${station.name} has no favicon, attempting fetch.`);
      const result = await processStation(station, i, stations);
      if (result.status === "ok") ok++;
      if (result.status === "placeholder") placeholders++;
      if (result.status === "skipped") skipped++;
    } catch (error) {
      console.error(`Failed to handle ${station.name}: ${error.message}`);
    }
  }

  await persistPromise;
  console.log("\nFinished.");
  console.log(`Icons saved: ${ok}`);
  console.log(`Placeholders generated: ${placeholders}`);
  console.log(`Skipped (existing): ${skipped}`);
};

run().catch((error) => {
  console.error("Unexpected error while fetching station icons", error);
  process.exit(1);
});
