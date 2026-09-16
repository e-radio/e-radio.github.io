# Country Radio Template

A shared Astro radio directory with Greece as the default and a Croatia configuration included. Greece supports English/Greek pages; Croatia supports English/Croatian pages; Sweden supports English/Swedish pages.

```sh
npm ci
npm run dev                         # Greece
COUNTRY=hr npm run dev              # Croatia
COUNTRY=hr npm run build
```

See [the country setup guide](countries/README.md) for country creation, station imports, metadata discovery, icons, and GitHub Pages deployment.

## Add a new country, step by step

This example adds **Slovenia** with country code `si` and a site named **Radio Slovenija**. Replace `si`, `Slovenia`, `Slovenian`, and `radio-slovenija` with your country's code, English name, English adjective, and GitHub account/organization. The example GitHub account must be one you own or can publish to.

Each country has its own station data and configuration. The pages, player, and metadata scrapers are shared. Run commands from this repository's root. These examples use macOS/Linux shell syntax.

### 1. Install the project dependencies

Use Node.js 20 or later and npm. Python 3 is needed for geography/audio tools; FFmpeg's `ffprobe` must be on your PATH for bitrate and codec detection.

```sh
npm ci
git status --short
```

Review any existing local changes before starting so you can distinguish them from the new country files.

### 2. Generate the country files

Choose the two-letter Radio Browser country code. Use a GitHub Pages user/organization URL (`https://OWNER.github.io`) or a custom domain. Repository subpaths such as `https://OWNER.github.io/radio/` are not supported.

```sh
node tools/create-country.mjs \
  --code si \
  --name Slovenia \
  --adjective Slovenian \
  --site-name "Radio Slovenija" \
  --url https://radio-slovenija.github.io
```

The script creates:

- `countries/si.json` — country and site configuration.
- `countries/si.redirects.json` — initially empty redirects.
- `src/data/stations-si.json` — initially empty station catalog.

It refuses to overwrite existing files. For a country that already exists, edit those files instead of running the scaffold again. Do not copy another country's station data or redirects.

### 3. Configure the brand and geography

Edit `countries/si.json`. Keep the generated dataset and redirects paths. Add or update these settings:

| Setting | What to enter |
| --- | --- |
| `siteName`, `siteShortName` | Full site name and shorter title/app name. |
| `siteUrl` | Final site origin, without a repository subpath. |
| `language`, `locales` | Start with `"en"` and `["en"]`; see step 8 for translation. |
| `introText` | An English introduction, for example: `Discover Slovenian radio stations and listen live online.` |
| `regions` | Region names used by your catalog; leave `[]` until reviewed. |
| `cityAliases` | Spelling aliases mapped to your preferred city names; initially `{}`. |
| `googleVerification` | Only the `content` value of your site's Google verification tag, or an empty string. |
| `twitterHandle` | Your site's handle, or an empty string. |
| `socialLocale` | `en_US` for the English pages. |
| `geographyAttribution` | Set to `true` when using OpenStreetMap geography results. |

Put country branding under a separate public directory, for example `public/branding/si/`. Configure `logo`, `favicon`, `favicon32`, `icon192`, `icon512`, `appleTouchIcon`, and `socialImage` with public URLs such as `/branding/si/icon-192x192.png`. Match the declared image formats and dimensions. This avoids replacing another country's assets. Review the shared Radddio promotion links and DMCA content before publishing.

See [all branding settings](countries/README.md#configure-each-sites-brand) for an example.

### 4. Import stations and review the catalog

```sh
COUNTRY=si npm run stations:import
```

Despite its historical filename, `tools/fetch-greece-stations.mjs` imports the selected country. This command writes the station dataset automatically. Review:

- `src/data/stations-si.json`
- `src/data/new-stations-import-report-si.json`
- `src/data/station-update-review-si.json`

Check station names, websites, country membership, duplicate broadcasts, and stream URLs. Keep published station slugs stable. Preserve original HTTP/HTTPS stream URLs unless you have verified a replacement.

To prevent intentionally removed stations from returning, create `countries/si.excluded-stations.json`:

```json
[
  {
    "stationuuid": "REPLACE-WITH-THE-STATION-UUID",
    "reason": "Removed intentionally"
  }
]
```

Run the import again to apply exclusions. Include all alternate UUIDs when deleting a merged station. For merges, retain removed UUIDs in `alternate_stationuuids` on the surviving record and add old page paths to `countries/si.redirects.json`. Never redirect a page to itself or to a deleted station.

### 5. Save station images locally

First cache available remote favicons, then find missing icons from station websites:

```sh
COUNTRY=si npm run stations:icons
COUNTRY=si node tools/fetch-missing-station-icons.mjs
```

Both commands save changes automatically. New local images go into `public/station-icons/si/`; station `favicon` fields point to `/station-icons/si/...webp`. The missing-icon tool can create initials placeholders when it cannot find artwork. Review the images and commit them together with the updated dataset.

The missing-icon tool checks favicon links, social images, JSON-LD logos, header logo images, and web app manifest icons. It compares actual image dimensions and saves the selected logo as a 256×256 WebP with transparent padding, preserving the full artwork. Existing favicon values are still skipped.

#### Generate placeholder icons when artwork is unavailable

The missing-icon command also generates placeholders automatically:

```sh
COUNTRY=si node tools/fetch-missing-station-icons.mjs
```

For an empty `favicon`, it first searches the station website. If no usable logo is found, it saves a 256×256 initials image at `public/station-icons/si/STATION-SLUG-placeholder.webp` and updates the station's `favicon` automatically. There is no separate placeholder-only or dry-run flag.

Existing favicon values are skipped, including old placeholders. To retry one, clear only that station's `favicon` and rerun; to use a known logo, save it locally and update the path directly. See the [placeholder generation and replacement steps](countries/README.md#6a-generate-placeholders-for-stations-without-a-usable-logo).

### 6. Fill missing locations and audio information

These enrichment steps are optional. For stations with coordinates, preview geography results first:

```sh
COUNTRY=si python3 tools/fill-station-locations.py --lang en
```

Review `reports/geography-si.json`, then apply:

```sh
COUNTRY=si python3 tools/fill-station-locations.py --lang en --write
```

Existing populated fields are preserved unless you explicitly pass `--overwrite`. Set `geographyAttribution` to `true` after using OpenStreetMap results. Read the [geography service usage instructions](countries/README.md#fill-city-and-region-from-coordinates) before running the tool; run one process and retain its cache.

For missing bitrate and codec, preview and then apply:

```sh
COUNTRY=si python3 tools/fill-stream-audio-info.py
COUNTRY=si python3 tools/fill-stream-audio-info.py --write
```

Review `reports/stream-audio-info-si.json`. Unidentifiable values remain unchanged.

For website-only city/state lookup, use the same tool:

```sh
COUNTRY=si python3 tools/fill-station-locations.py --no-coordinates --max 10 --sleep 1
```

This command previews city/state changes. Review the report, then add `--write` to save. Do not run older Greece-specific repair scripts on the new country.

Clean imported genre tags before building:

```sh
COUNTRY=si python3 tools/clean-station-genres.py
# Review reports/genre-cleanup-si-preview.json, then apply:
COUNTRY=si python3 tools/clean-station-genres.py --write
```

See [genre cleanup rules and country overrides](countries/README.md#7a-clean-station-genres).

### 7. Discover now-playing metadata

Start with a report-only sample:

```sh
COUNTRY=si node tools/find-station-metadata-endpoints.mjs --max 10
```

Then discover and save endpoints for the catalog:

```sh
COUNTRY=si npm run stations:metadata
```

The npm command includes `--write`. Review the reported results and the saved `metadata_server`, `nowplaying_url`, and optional `history_url` fields. You can also test a stream manually using `/tools/endpoint-finder/` on the website and copy the verified configuration into its station record.

Check playback and metadata in the browser: a successful command-line request does not prove browser access. Stations without usable metadata can still play audio; Live Tracks uses the shared provider capability check.

### 8. Add a local-language translation, if wanted

Country codes and language codes can differ: Slovenia is `si`, but Slovenian is `sl`; Greece uses `gr` and `el`.

For an English-only launch, keep `"language": "en"` and `"locales": ["en"]`. Setting `language` alone does not translate the site.

To add Slovenian:

1. Create `src/i18n/sl.json`. Use the existing dictionaries as a checklist, but keep the English keys appropriate to the new country: for example, `Slovenian Radio Stations by City | {0}`. Translate interface text, playback messages, complete SEO sentences, legal copy, the configured intro, and geography labels. Preserve `{0}`, `{1}`, and other required placeholders.
2. In `src/i18n/translate.ts`, import the dictionary, add `sl` to `Locale`, and register it in `dictionaries`. Browser controls use the same translator.
3. In `src/i18n/index.ts`, add `sl` to the supported locale filter and add `sl: 'Slovenščina'` to `languageNames`.
4. In `src/components/SEO.astro`, add the social locale `sl_SI` for Slovenian pages.
5. Add `sl` to the accepted language codes in `tools/check-localized-site.py`. Extend `tests/i18n.test.mjs` to load the new dictionary and test its translations and language paths.
6. Once the translation is ready, set `"locales": ["en", "sl"]` in `countries/si.json`, keeping `"language": "en"` for the default interface.

The integration then generates `/sl/` versions of the existing pages, localized redirects and manifest, a language switcher, reciprocal `hreflang` links, self-referencing canonicals, and sitemap entries. English stays at `/`. Do not translate station slugs, stream URLs, station brand names, or song titles. Do not enable a locale before its content is translated.

### 9. Preview and validate

```sh
COUNTRY=si npm run dev
```

Open `http://localhost:4321/` (or the address printed by Astro). If enabled, check `/sl/` too. Stop the server with Ctrl+C before proceeding. Restart after changing the country configuration.

```sh
npm test
COUNTRY=si npm run check
COUNTRY=si npm run build
COUNTRY=si npm run preview
```

Check the homepage, station playback, stream choices, favorites, Live Tracks, icons, footer, city/region links, and mobile layout. For a multilingual build, also run:

```sh
python3 tools/check-localized-site.py dist
```

The audit checks language links, canonical URLs, sitemap targets, redirects, JSON-LD syntax, and manifests. The current audit expects multilingual alternate links; do not use it to validate an English-only build. Verify that English and translated pages link to each other and that `/sitemap.xml` and `/robots.txt` use the final site domain.

### 10. Deploy to a separate GitHub Pages repository

Create an **empty** repository named `radio-slovenija.github.io` under the `radio-slovenija` account/organization. Do not initialize it with a README if using the push commands below.

Before the first push, configure the destination repository:

- **Settings → Secrets and variables → Actions → Variables:** add `COUNTRY` = `si` and `SITE_URL` = `https://radio-slovenija.github.io` as repository variables.
- **Settings → Pages → Build and deployment:** choose **GitHub Actions**.

The existing `.github/workflows/pages.yml` deploys pushes to `main`. Without the `COUNTRY` variable it builds Greece.

```sh
git remote -v
git remote add slovenia git@github.com:radio-slovenija/radio-slovenija.github.io.git
git status --short
git add README.md countries src public tools tests astro.config.mjs
git diff --cached --stat
git diff --cached
git commit -m "Add Slovenia radio site"
git push slovenia HEAD:main
```

Review the staged diff before committing; these paths can include unrelated local changes. Keep `origin` for the existing site. If `slovenia` already exists, check its URL and skip `git remote add`. This recipe assumes an empty destination repository and SSH access; do not force-push over an existing history.

Follow **Deploy to GitHub Pages** in the destination's **Actions** tab. Once it succeeds, check the published site, translated pages, icons, playback, sitemap, and verification tag. The workflow builds and deploys; it does not run the local test suite for you.

For future updates, review and commit your changes, then run `git push slovenia HEAD:main`. Each remote receives the shared source; its repository variables select the country. Pushing one remote does not publish updates to the others. See [deployment alternatives and Croatia's concrete settings](countries/README.md#github-pages-publish-a-new-country).

## Existing Greece site

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

- Node.js 20+
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

5. Open http://localhost:4321 in your browser

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
- `node tools/fetch-missing-station-icons.mjs` - Fetch and cache missing station icons as 256×256 WebP files
- `npm run find metadata` - Discover and save verified station now-playing metadata endpoints

## Data Source

Radio station data is fetched from the [Radio Browser API](https://www.radio-browser.info/), which provides information about thousands of radio stations worldwide.

## Icon Maintenance

Run `cache-station-favicons.mjs` first (`npm run stations:icons`): it validates existing remote favicon URLs, downloads and converts usable images to local 256×256 WebP files, and sets failed or invalid remote favicons to `null`. Then run `fetch-missing-station-icons.mjs`, which searches station websites for replacement logos and creates initials placeholders when none are found. This order matters because the missing-icon tool skips any station whose `favicon` is already set—even if that remote URL is broken. Both commands save automatically; existing local favicon paths are preserved by the cache tool.

Run `node tools/fetch-missing-station-icons.mjs` from the project root after adding stations without a `favicon`. For each missing icon, `fetch-missing-station-icons.mjs` checks homepage metadata (`<link>` icons and `og:image`), then falls back to `/favicon.ico`. It ranks usable candidates by source and actual dimensions, then fits the selected image with transparent padding into a 256×256 WebP file in `public/station-icons`; if none can be downloaded, it creates a colored WebP placeholder using the station's initials. The script updates `src/data/stations-gr.json` with each new local icon path and skips stations whose `favicon` is already set.

## Removing Duplicate Stations

Run `python3 tools/remove-duplicate-stations.py` from the project root. The script groups stations by exact `stream_url`, keeps the entry with the best clean slug (then the shortest slug), and removes the others from `src/data/stations-gr.json`. It also deletes station icons that were used only by removed entries. Because the script edits data and icons directly, review the Git diff afterward.

## Fixing City and Region Fields

Run `python3 tools/fix-state-city-only.py` from the project root. The script finds stations whose `state` contains a city while `city` is empty, moves that value to `city`, and uses `tools/city-region-map.json` to set the correct Greek region in `state`. It also converts known Greek names and spelling variants to canonical English city names using `tools/city-name-map.json`. Unknown, non-English, or potentially misspelled cities are recorded for review, and `--max N` can limit how many stations are updated in one run.

## Filling Missing States from Homepages

Use `COUNTRY=nl python3 tools/fill-station-locations.py` to preview city/state discovery from coordinates and homepage/contact addresses. Review `reports/geography-nl.json`, then repeat with `--write`. Existing values are preserved by default. Use `--no-coordinates` for websites only, `--no-websites` for coordinates only, `--max 10` to check ten stations, and `--sleep 1` to pause between stations. See [the country guide](countries/README.md#fill-locations-from-coordinates-and-station-websites).

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

Radiojar streams use `https://www.radiojar.com/api/stations/STREAM_ID/now_playing/`. The main metadata discovery script now checks this endpoint for Radiojar streams. Run `node tools/find-radiojar-metadata.mjs` to check Radiojar URLs in station defaults and saved stream alternatives, save verified endpoints only where metadata is missing, and write `reports/radiojar-metadata.json`. Existing metadata configurations are preserved. The player displays Radiojar artist/title and `thumb` artwork. Empty or failed responses are not added.

### Radiojar song history

Radiojar history uses `https://www.radiojar.com/api/stations/STREAM_ID/tracks/`. Station pages display up to 15 completed tracks, newest first, with artist, title, available artwork, and playback time. History remains separate from the current song.

Run `node tools/find-radiojar-history.mjs` to check configured Radiojar stations and save missing `history_url` fields only when usable history is returned. Results are written to `reports/radiojar-history.json`; existing history URLs are preserved. Main metadata discovery also checks history, and the endpoint verification tool understands Radiojar history responses. An empty response does not qualify as verified history.
