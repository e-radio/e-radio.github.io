# e-Radio Greece
Check the website: https://e-radio.github.io/

A modern web application for streaming Greek radio stations, built with [Astro](https://astro.build).

## Features

- 📻 Browse all Greek radio stations
- 🎵 Stream audio directly from the browser
- 📱 Fully responsive design
- 🌍 Search and filter by location (state)
- ♿ Accessible UI
- 📊 Sitemap for SEO

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Fetch Greek radio stations data:
   ```bash
   node tools/fetch-greece-stations.mjs
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open http://localhost:3000 in your browser

## Project Structure

```
├── src/
│   ├── layouts/
│   │   └── Layout.astro       # Main page layout
│   ├── pages/
│   │   ├── index.astro        # Home page
│   │   ├── [slug].astro       # Station detail pages
│   │   └── sitemap.xml.ts     # Dynamic sitemap
│   ├── data/
│   │   └── stations-gr.json   # Radio station data (generated)
│   └── lib/
│       └── slug.ts            # Slug generation utilities
├── tools/
│   ├── fetch-greece-stations.mjs       # Script to fetch station data
│   └── fetch-missing-station-icons.mjs # Fetches/caches station icons
├── public/
│   └── favicon.svg
└── astro.config.mjs           # Astro configuration
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run fix favicons` - Fetch and cache missing station icons as 256×256 WebP files
- `npm run find metadata` - Discover and save verified station now-playing metadata endpoints

## Data Source

Radio station data is fetched from the [Radio Browser API](https://www.radio-browser.info/), which provides information about thousands of radio stations worldwide.

## Icon Maintenance

Run `npm run fix favicons` from the project root after adding stations without a `favicon`. For each missing icon, `fetch-missing-station-icons.mjs` checks the station's existing remote favicon and homepage metadata (`<link>` icons and `og:image`), then falls back to `/favicon.ico`. It converts the first usable image to a 256×256 WebP file in `public/station-icons`; if none can be downloaded, it creates a colored WebP placeholder using the station's initials. The script updates `src/data/stations-gr.json` with each new local icon path and skips stations whose `favicon` is already set.

## Removing Duplicate Stations

Run `python3 tools/remove-duplicate-stations.py` from the project root. The script groups stations by exact `stream_url`, keeps the entry with the best clean slug (then the shortest slug), and removes the others from `src/data/stations-gr.json`. It also deletes station icons that were used only by removed entries. Because the script edits data and icons directly, review the Git diff afterward.

## Fixing City and Region Fields

Run `python3 tools/fix-state-city-only.py` from the project root. The script finds stations whose `state` contains a city while `city` is empty, moves that value to `city`, and uses `tools/city-region-map.json` to set the correct Greek region in `state`. It also converts known Greek names and spelling variants to canonical English city names using `tools/city-name-map.json`. Unknown, non-English, or potentially misspelled cities are recorded for review, and `--max N` can limit how many stations are updated in one run.

## Filling Missing States from Homepages

Run `python3 tools/fill-state-from-homepage.py` from the project root. For stations whose `state` is empty, the script downloads the station homepage and looks for location information in its JSON-LD structured data. When it finds a locality, region, served area, or named location, it saves that value to `state` in `src/data/stations-gr.json`. Stations with missing homepages, fetch errors, or no usable location are recorded in `tools/state-fill-progress.json` so they can be skipped on later runs. Use `--max N` to limit successful updates and `--sleep N` to pause between them.

## Finding Station Metadata Endpoints

Run `npm run "find metadata"` to check stations without saved metadata. The script tests public AzuraCast, Shoutcast, Icecast, CentovaCast, and Radio.co APIs, accepts only endpoints that return usable current-track data, and stores `nowplaying_url`, `history_url` (when available), and `metadata_server` in `src/data/stations-gr.json`. The npm command saves results automatically; run `node tools/find-station-metadata-endpoints.mjs` for a dry run. Every scan writes verification results and unmatched slugs to `reports/metadata-endpoints.json`. Use `--slug SLUG`, `--max N`, `--concurrency N`, or `--timeout MS` to limit and control a scan; `--refresh` rechecks existing entries. Station pages prefer these verified fields and retain automatic endpoint detection as a fallback.

## Building for Production

```bash
npm run build
npm run preview
```

The built site will be in `dist/` directory.

## License

MIT - Feel free to use this project for your own purposes.
│   ├── assets
│   │   └── astro.svg
│   ├── components
│   │   └── Welcome.astro
│   ├── layouts
│   │   └── Layout.astro
│   └── pages
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

### Metadata fetching: direct or Jina.ai

Edit `src/data/metadata-config.json`:

```json
{
  "mode": "auto",
  "pollIntervalMs": 15000,
  "requestTimeoutMs": 10000
}
```

- `auto` (default) preserves the existing routing: saved Shoutcast/Icecast endpoints use Jina.ai; AzuraCast, Radio.co, and secure CentovaCast endpoints use direct requests. Existing `metadata_direct: true` overrides remain supported for saved HTTPS endpoints.
- `direct` disables Jina.ai and fetches the original metadata and history URLs from the browser. Endpoints must support HTTPS and allow your website through CORS. Opening a URL in a browser tab does not prove CORS support. HTTP URLs are not automatically upgraded.
- `jina` routes both metadata and history through `https://r.jina.ai/`. This retains the proxy option, but Jina may reject a server response or impose limits. It does not guarantee availability.

To override the global setting for one station, add `"metadata_mode": "direct"`, `"metadata_mode": "jina"`, or `"metadata_mode": "auto"` to its record in `src/data/stations-gr.json`. For example, a CORS-enabled AzuraCast station can use `"metadata_mode": "direct"` with `"nowplaying_url": "https://azuracast.streams.ovh/api/nowplaying/radiokyklos"`. Explicit modes take precedence over the legacy `metadata_direct` flag. There is no automatic failover between modes.

Restart development or rebuild and deploy GitHub Pages after configuration changes: these settings are embedded at build time. Run `npm run build` to rebuild. Metadata discovery still checks the original server URLs; saved results are not a browser/CORS health check.

Polling waits 15 seconds after each completed update by default (minimum configurable interval: 5 seconds), prevents overlapping updates, pauses scheduling in hidden tabs, and refreshes when the tab becomes visible. An in-flight request may finish after hiding the tab. Requests time out after 10 seconds by default and reject unsuccessful HTTP responses. Temporary failures retain the last successful song/history and history requests retry on later polls. Missing track fields use the existing fallbacks; unavailable artwork and listener counts are hidden. Artwork remains confined to track cards and never replaces the station icon.

### Unique station URLs

Every station must have a unique slug. The importer preserves existing slugs and adds a station-ID suffix when a new slug collides. Astro checks uniqueness before development or builds, preventing duplicate station pages from being generated.

Run `node tools/fix-station-slugs.mjs` to repair existing collisions. The first occurrence retains its URL; later occurrences receive a unique suffix, with all other station fields preserved. Changes are recorded in `reports/station-slug-changes.json`. Existing favicon paths remain unchanged. Category links and the sitemap use the updated slugs on the next build. A previously shared URL cannot redirect to every station that used it; use the new URLs for renamed records.

### CentovaCast song history

Discovery checks `/external/rpc.php?m=recenttracks.get&username=ACCOUNT&limit=10` alongside CentovaCast now-playing RPC endpoints. It saves `history_url` only when `data[0]` contains usable track titles and timestamps. Recheck existing stations with `npm run "find metadata" -- --refresh --slug STATION-SLUG` to discover missing history.

The player reads artist, title, artwork, and Unix timestamps from this nested response. History is kept separate from the current song, since the newest history entry may already have finished. Empty or disabled histories are not treated as verified endpoints. Secure CentovaCast endpoints use direct requests in `auto` mode; explicit metadata mode overrides still apply.

### Verify HTTPS stream upgrades

Run `python3 tools/upgrade-streams-https.py` to audit HTTP stream URLs without changing station data. The script requires `ffprobe` on PATH. It tests the same URL with HTTPS, validates TLS certificates, rejects redirects to HTTP, and checks a bounded response sample for an audio stream. Run `python3 tools/upgrade-streams-https.py --write` to replace verified URLs in `src/data/stations-gr.json`. Results and failure reasons are saved to `reports/https-stream-audit.json`; failures and unrecognized responses remain unchanged. Playlist responses need manual review. A successful probe verifies server access and recognizable audio at audit time, not browser codec or CORS compatibility.

### Remove redundant stream query parameters

Run `python3 tools/clean-stream-query.py` to compare streams before and after removing `type=http` and `nocache` parameters. Add `--write` to apply verified replacements. Requires `curl` and `ffprobe`. Both URLs must return recognizable audio with matching codec details and station name headers (when available). Other parameters and embedded proxy URLs are preserved. Results are saved to `reports/stream-query-audit.json`. These short probes do not guarantee uninterrupted playback or identical programming when servers omit station identification.

### Fill missing bitrate and codec

Run `python3 tools/fill-stream-audio-info.py` to probe stations with zero/missing bitrate or empty/unknown codec using `ffprobe`. Add `--write` to fill identified values while preserving existing populated fields. Audio-stream bitrates are converted from bits per second to rounded kbps; variable-rate values may be estimates. Unavailable values remain unchanged. Results are saved to `reports/stream-audio-info.json`.

### Check stream decoding

Run `python3 tools/check-stream-decoding.py` (requires FFmpeg) to decode three seconds of audio from each unique stored stream URL. Use `--max 20` for a small sample or `--workers 10` to reduce concurrency. Each probe has a 15-second limit. The script writes progress and final results to `reports/stream-decoding-audit.json` without modifying station data. It distinguishes successful decoding, decoding with errors, failures, and timeouts. A successful result does not verify browser compatibility, CORS, TLS certificates, audible content, or sustained uptime. Station pages currently force HTTP URLs to HTTPS, so their actual playback URL may differ from the stored URL tested here.

### Verify saved metadata endpoints

Run `node tools/verify-metadata-endpoints.mjs` to recheck the exact saved now-playing and history URLs without modifying station data. The report at `reports/metadata-verification.json` distinguishes usable tracks, responses without matching track data, and request failures. Icecast responses are checked against the station mount. Verification confirms response data at scan time, not browser access or track freshness.

### Multiple stream qualities on one station page

Keep one station record and retain `stream_url`, `bitrate`, and `codec` as the default for listings and existing tools. Add a `streams` array with `id`, `label`, `url`, `bitrate`, and `codec` for each distinct quality. The station player uses these options to switch sources, preserving volume and resuming only when playback was active or requested. Quality details and direct stream links follow the selected source. Streams currently share the station's metadata endpoints and must carry the same broadcast.

AK Radio is merged under `ak-radio`; `ak-radio-heraclion` redirects to it through `astro.config.mjs`. The removed UUID is retained in `alternate_stationuuids`, and the old slug in `aliases` for reference. Both original records had the same 256 kbps MP3 URL, so the selector displays one disabled option until another verified quality URL is added. The server currently advertises only this one mount. Static hosting uses Astro's generated HTML redirect page.

### Keep merged stations merged during Radio Browser imports

`fetch-greece-stations.mjs` recognizes both `stationuuid` and every UUID in `alternate_stationuuids`. Original records for a merged station are recorded in `recognizedMergedStations` in the new-station import report; they do not create another page or overwrite the consolidated station's curated fields. This applies to its primary UUID too, so a remote quality-specific bitrate or codec cannot change the chosen default. Existing stream choices and metadata endpoints remain intact.

Duplicate URL detection also checks `streams[].url` and `streams[].alternate_urls`, including when Radio Browser assigns a new UUID. Keep `alternate_stationuuids` when merging stations, and keep old slug redirects in `astro.config.mjs`. Completely new UUIDs with previously unseen URLs still import normally; they cannot reliably be identified as the same broadcast from a name alone. Conflicting UUID ownership across local stations stops the import before any files are written.

### Extract CentovaCast HTTPS proxy URLs

Run `python3 tools/extract-centovacast-tls.py` to read `proxytuneinurltls` from saved CentovaCast now-playing endpoints. Add `--write` to store available HTTPS URLs in station records. Existing HTTPS defaults stay unchanged; an HTTP default is upgraded only if FFprobe identifies audio through the returned HTTPS URL with certificate verification enabled. Matching stream options are updated together and retain their previous URL as an alias. See `reports/centovacast-tls.json` for missing fields and probe failures. An extracted URL alone is not proof of playback compatibility.

### Radiojar now-playing endpoints

Radiojar streams use `https://www.radiojar.com/api/stations/STREAM_ID/now_playing/`. The main metadata discovery script now checks this endpoint for Radiojar streams. Run `node tools/find-radiojar-metadata.mjs` to check Radiojar URLs in station defaults and saved stream alternatives, save verified endpoints only where metadata is missing, and write `reports/radiojar-metadata.json`. Existing metadata configurations are preserved. The player displays Radiojar artist/title and `thumb` artwork. Empty or failed responses are not added; no history endpoint is assumed.
