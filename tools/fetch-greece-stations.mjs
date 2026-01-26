import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

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
      timeout: 10000
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error.message);
    throw error;
  }
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
  const base = slugify([name, state].filter(Boolean).join(" "));
  const fallback = stationuuid ? stationuuid.slice(0, 8) : "unknown";
  return base ? base : `station-${fallback}`;
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
  const rawStations = await getJson(`${baseUrl}/json/stations/bycountry/greece?limit=1836`);

  if (!Array.isArray(rawStations)) {
    throw new Error("Stations response is not an array.");
  }

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
    const stream_url = s.url || s.url_resolved;

    return {
      slug: makeSlug({ name, state: cityOrState, stationuuid }),
      stationuuid,
      name,
      state: cityOrState || null,
      country: "Greece",
      countrycode: "GR",
      stream_url: s.url || s.url_resolved,
      homepage: s.homepage || null,
      favicon: s.favicon || null,
      genres: tags,
      language: languages[0] || null,
      bitrate: s.bitrate || null,
      codec: s.codec || null,
      clickcount: s.clickcount || null,
      lastcheckok: s.lastcheckok || null,
      votes: s.votes || null,
      hls: s.hls || 0,
      ssl_error: s.ssl_error || 0,
      geo_lat: s.geo_lat || null,
      geo_long: s.geo_long || null
    };
  });

  // 4) Ensure slug uniqueness
  const seen = new Map();
  for (const st of mapped) {
    const current = seen.get(st.slug) ?? 0;
    seen.set(st.slug, current + 1);
    if (current > 0) {
      const suffix = st.stationuuid ? st.stationuuid.slice(0, 8) : String(current + 1);
      st.slug = `${st.slug}-${suffix}`;
    }
  }

  // 5) Filter out invalid entries
  const cleaned = mapped.filter((s) => s.name && s.stationuuid && s.stream_url);

  // 6) Write to file
  console.log("Step 4: Writing to file...");
  const outDir = path.join(process.cwd(), "src", "data");
  const outFile = path.join(outDir, "stations-gr.json");

  if (!existsSync(outDir)) {
    await mkdir(outDir, { recursive: true });
  }

  await writeFile(outFile, JSON.stringify(cleaned, null, 2) + "\n", "utf8");

  console.log(`\n✓ Success!`);
  console.log(`  Server: ${baseUrl}`);
  console.log(`  Fetched: ${rawStations.length} stations`);
  console.log(`  Cleaned: ${cleaned.length} valid stations`);
  console.log(`  Written to: ${outFile}`);
}

main().catch((err) => {
  console.error("\n✗ Error:", err.message);
  console.error(err.stack);
  process.exit(1);
});