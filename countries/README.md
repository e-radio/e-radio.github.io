# Country radio template

One Astro codebase builds one country at a time. Greece is the default; its station URLs and redirects are preserved. Croatia includes an initial Radio Browser import. Imported stream availability, geography, and artwork still need editorial review.

## Run or build

Run commands from the repository root (Node 20 or later):

```sh
npm ci
npm run dev
COUNTRY=hr npm run dev
COUNTRY=hr SITE_URL=https://your-radio-site.example npm run build
npm run preview
```

Restart the development server after changing country or editing a country configuration. `COUNTRY` selects `countries/<code>.json`; `SITE_URL` optionally overrides its canonical origin. English is the default interface. Greece also provides Greek pages at `/el/`, and Croatia provides Croatian pages at `/hr/`. `locales` enables supported translations; `language` alone does not translate text.

## Create another country

Follow the [step-by-step new-country guide in the main README](../README.md#add-a-new-country-step-by-step) for configuration, imports, images, geography, metadata, translations, validation, and deployment. The commands below are a short reference.

```sh
node tools/create-country.mjs --code si --name Slovenia --adjective Slovenian --site-name "Radio Slovenija" --url https://your-site.example
COUNTRY=si npm run stations:import
COUNTRY=si npm run stations:metadata
COUNTRY=si npm run stations:icons
COUNTRY=si npm run build
```

The scaffold refuses to overwrite an existing country. It creates a configuration, an empty station dataset, and an empty redirects file. Import reads the configured Radio Browser country code. Metadata discovery and icon caching use the same selected dataset. Use your final site origin when scaffolding; replace any example domain before publishing.

## Country-specific files

- `<code>.json`: country name/adjective, site name, canonical origin, interface language, dataset path, geography aliases, verification tags, and redirects path.
- `<code>.redirects.json`: old station URLs mapped to retained pages. Never copy Greece's redirects into another country.
- `src/data/stations-<code>.json`: independent station records, merged UUIDs, metadata endpoints, and stream alternatives.
- `public/station-icons/<code>/`: icons downloaded for additional countries. Existing Greek icon paths remain unchanged.

All pages, SEO text, structured data, sitemap, robots.txt and web manifest read the selected configuration. `countryText()` supplies the country vocabulary for the current English interface. Translate interface copy separately when introducing another display language. Greece-specific city aliases and region names are isolated in `gr.json`; populate these for another country as needed.

The player, metadata provider parsers, adaptive polling, and image updates remain shared. Radddio links and shared artwork remain the existing project's branding; review those and the contact/legal page before publishing a derivative site.

## GitHub Pages: publish a new country

Use a separate repository for each country site. This template requires a root-domain deployment: a GitHub Pages user/organization site or a custom domain. Repository subpaths such as `/croatia/` are rejected because navigation and asset paths are root-relative.

### 1. Create the destination repository

Create an empty repository named `<owner>.github.io` under the corresponding GitHub user or organization. For the push workflow below, leave it empty: do not initialize a README, license, or .gitignore. Prepare the country's configuration and dataset using the commands above.

### 2. Configure the country before the first push

In the destination repository, open **Settings → Secrets and variables → Actions → Variables** and add these repository variables (not secrets):

| Name | Value |
| --- | --- |
| `COUNTRY` | The lowercase country code matching `countries/<code>.json`, such as `hr` |
| `SITE_URL` | The final origin, such as `https://<owner>.github.io` |

Without `COUNTRY`, the workflow builds Greece. `SITE_URL` overrides the URL in the country configuration for deployment. Also update the configuration's `siteUrl` when you want local builds to use the final domain automatically.

Under **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source. The existing `.github/workflows/pages.yml` builds and deploys pushes to `main`.

### 3. Check and push from the shared project

Replace `<code>`, `<owner>`, and `<remote-name>` below. Choose a distinct remote name for each country, such as `croatia` or `slovenia`. Run these commands from the project root:

```sh
COUNTRY=<code> SITE_URL=https://<owner>.github.io npm run build
npm test

git remote -v
git remote add <remote-name> git@github.com:<owner>/<owner>.github.io.git

git status --short
git add .
git diff --cached --stat
git commit -m "Add country radio site"
git push <remote-name> main
```

Review the staged changes before committing: `git add .` includes all pending project changes. Adding a named remote preserves `origin` for the existing site. If the remote already exists, verify its URL with `git remote -v` and skip `git remote add`. Do not force-push over an existing destination history; this initial-push recipe assumes an empty destination repository. SSH access to the destination account is required.

For Croatia, the concrete values are:

| Setting | Value |
| --- | --- |
| Repository | `radio-hrvatska/radio-hrvatska.github.io` |
| `COUNTRY` | `hr` |
| `SITE_URL` | `https://radio-hrvatska.github.io` |
| Remote name | `croatia` |

```sh
git remote add croatia git@github.com:radio-hrvatska/radio-hrvatska.github.io.git
git add .
git diff --cached --stat
git commit -m "Add country template and Croatia radio directory"
git push croatia main
```

### 4. Verify deployment and publish future updates

Open the destination repository's **Actions** tab and follow **Deploy to GitHub Pages**. After the build and deploy jobs succeed, open `https://<owner>.github.io/`. Verify the country name, station listings, and removed-station exclusions. The workflow's deployment environment also links to the published site.

For later updates, commit the changes and push to the intended country's named remote:

```sh
git add .
git diff --cached --stat
git commit -m "Update radio stations"
git push <remote-name> main
```

Each remote receives the shared source code; its repository variables select which country is deployed. A push to one remote does not update the others.

Alternatively, enable **Template repository** in GitHub settings and choose **Use this template** for a new country. That creates a populated repository: clone it and work in that clone instead of applying the empty-repository push recipe. Configure the same country variables and Pages source before deploying.

References: [GitHub repository variables](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-variables) and [GitHub Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Station cleanup checklist (after importing a country)

Run these commands from the repository root. The examples use **Sweden (`se`)**; replace `se` with your country code, such as `hr` or `gr`. Swedish's language code is `sv`, but the country selector remains `se`.

Run one maintenance command at a time and review the dataset changes between steps. The commands below use the selected country's configuration; older one-off repair scripts may be Greece-specific.

### 1. Review the imported stations and exclusions

```sh
git status --short
COUNTRY=se npm run stations:import
```

The importer saves automatically. Review `src/data/stations-se.json`, `src/data/new-stations-import-report-se.json`, and `src/data/station-update-review-se.json` for duplicates, wrong-country stations, outdated names, and changed stream URLs.

For intentional deletions, add the station UUIDs to `countries/se.excluded-stations.json`, then rerun the import. Include alternate UUIDs for merged stations. See [exclusions](#exclude-deleted-stations-from-future-imports). When merging, preserve distinct streams, put removed UUIDs in `alternate_stationuuids`, and map old page paths to the retained page in `countries/se.redirects.json`.

### 2. Fill missing city AND state from coordinates

Use **`fill-station-geography.py`** for this task. It reads `geo_lat` and `geo_long`, checks that the coordinates belong to the selected country, and fills `city` and `state` separately.

First preview the proposed changes without editing the station dataset:

```sh
COUNTRY=se python3 tools/fill-station-geography.py --lang en
```

Review `reports/geography-se.json`, especially records marked `review`. Then apply:

```sh
COUNTRY=se python3 tools/fill-station-geography.py --lang en --write
```

The equivalent explicit country option is:

```sh
python3 tools/fill-station-geography.py --country se --lang en --write
```

Without `--overwrite`, existing populated city/state values are kept. Stations without both coordinates are skipped; invalid, foreign, or ambiguous coordinates are reported for review. This tool does not find missing coordinates.

`--lang en` requests English place names; names without an English version can remain in the local language. It does not translate the website. Use `--lang sv` only when you intend to store Swedish display values instead. Keep the stored grouping values consistent with the site's default language and use translation dictionaries for localized labels.

Set `"geographyAttribution": true` in `countries/se.json` when using these OpenStreetMap results. The preview also writes a response cache at `tools/cache/geography-se-en.json`; keep it so the apply command reuses responses. Read the [geocoder usage instructions](#fill-city-and-region-from-coordinates) before running a lookup.

### 3. Correct already populated locations, only if needed

To recheck existing city/state values as well as missing ones:

```sh
COUNTRY=se python3 tools/fill-station-geography.py --lang en --overwrite
```

Review the new `reports/geography-se.json`. If the replacements are appropriate, apply the same options with `--write`:

```sh
COUNTRY=se python3 tools/fill-station-geography.py --lang en --overwrite --write
```

`--overwrite` permits replacing both existing location fields. Incorrect coordinates can still produce an incorrect location within the country, so check the results against the station's website. Station slugs and stream URLs are preserved. If changing location values changes a city or region page URL, add a redirect for the old published page.

### 4. Try station homepages for remaining missing states

```sh
COUNTRY=se python3 tools/fill-state-from-homepage.py --max 10 --sleep 1
```

This command **saves automatically**; there is no `--write` flag. It reads homepage structured data and fills only missing `state`, not city. Review the inferred values manually. `--max 10` limits successful updates, not the number of requests. Use `--max 0` for no limit.

Skipped IDs are stored in `tools/state-fill-progress-se.json`. See [homepage lookup details](#fill-missing-state-from-station-homepages) for retrying skipped entries. Do not substitute a historical Greece-only geography script for the country-aware tool above.

### 5. Fill missing bitrate and codec

Requires FFmpeg's `ffprobe` on your PATH. Preview first:

```sh
COUNTRY=se python3 tools/fill-stream-audio-info.py
```

Review `reports/stream-audio-info-se.json`, then apply:

```sh
COUNTRY=se python3 tools/fill-stream-audio-info.py --write
```

This fills missing bitrate/codec values and preserves populated fields. Failed probes leave the values unchanged. Check playback manually; a successful audio probe does not guarantee browser playback.

### 6. Cache station icons and find missing artwork

```sh
COUNTRY=se npm run stations:icons
COUNTRY=se node tools/fetch-missing-station-icons.mjs
```

Both commands save automatically. The first caches available remote favicons; the second searches station websites for records with an empty favicon and can create initials placeholders. It skips records whose favicon is already set, so an incorrect existing icon needs separate review.

Swedish station images are stored in `public/station-icons/se/`, with matching local paths in `src/data/stations-se.json`. Review and commit the images with the dataset.

The missing-icon tool starts with the country, dataset, total stations, existing icons skipped, and number needing work. Progress counts only stations without a favicon:

```text
[3/20] Example Radio (example-radio)
  [3/20] Request 1/2 (timeout 15s): https://example.com/
[3/20] ICON SAVED | 15% complete | Remaining: 17 | Icons: 2 | Placeholders: 1 | Errors: 0 | Elapsed: 0m 24s
```

It shows request attempts and retries, reports activity every 10 seconds during a slow station, and finishes with totals and a list of failed stations. Existing icons are summarized instead of printing a skip line for every station. A run with station errors exits with a nonzero status; successful saves remain on disk.

Artwork discovery also checks JSON-LD `logo` fields, logo images inside HTML `<header>` elements, `twitter:image`, and icons in linked web app manifests. Relative image URLs use the page or manifest URL. Invalid manifest/JSON-LD data does not prevent trying other sources.

The tool downloads candidates to inspect their actual dimensions, favors adequately sized square images over tiny icons and wide banners, and combines this with the logo source priority. The progress output shows the source and dimensions of each usable image. This can make a station take longer because it compares candidates instead of accepting the first download. Selected logos are fitted inside a 256×256 WebP with transparent padding so rectangular artwork is not cropped. JavaScript-only logos still require manual review.

### 6a. Generate placeholders for stations without a usable logo

Placeholder generation is part of the missing-icon command; there is no separate placeholder command or placeholder-only flag:

```sh
COUNTRY=se node tools/fetch-missing-station-icons.mjs
```

For each station whose `favicon` is empty or absent, the script tries to download artwork from its homepage. If no usable image is found, it creates a **256×256 WebP** with a colored gradient and the initials of the first two words of the station name.

For Sweden, a generated placeholder is saved as:

```text
public/station-icons/se/STATION-SLUG-placeholder.webp
```

The script automatically updates that station's JSON record:

```json
"favicon": "/station-icons/se/STATION-SLUG-placeholder.webp"
```

Replace `se` with your country code. Greece retains its existing unprefixed `public/station-icons/` directory. The command writes images and station data immediately; it has no dry-run flag. Check the terminal's `Placeholders generated` count and review the generated files before committing.

**Existing favicon values are skipped**, including placeholders and broken image paths. To retry artwork discovery for a particular station, set only that station's `favicon` to `""` in the selected dataset, verify its homepage, and rerun the command. It processes every record with an empty favicon. It will create another placeholder if artwork is still unavailable.

If you already have the correct logo, place it in `public/station-icons/se/` and set the station's `favicon` to its `/station-icons/se/...` URL directly. Remove an old placeholder file only after confirming no station still references it. Commit the image and dataset changes together, then rebuild and deploy.

### 7. Find or recheck now-playing endpoints

Preview a small sample without saving station fields:

```sh
COUNTRY=se node tools/find-station-metadata-endpoints.mjs --max 10
```

Review `reports/metadata-endpoints-se.json`. To find and save missing metadata across the catalog:

```sh
COUNTRY=se npm run stations:metadata
```

To recheck one station's existing metadata, replace `STATION-SLUG`:

```sh
COUNTRY=se node tools/find-station-metadata-endpoints.mjs --refresh --slug STATION-SLUG
COUNTRY=se node tools/find-station-metadata-endpoints.mjs --refresh --slug STATION-SLUG --write
```

The npm alias saves automatically; the direct command saves only with `--write`. Check the browser's station page and Live Tracks after saving. For individual streams, the website's `/tools/endpoint-finder/` also provides a manual check.

### 8. Review and validate the finished cleanup

```sh
git diff -- src/data/stations-se.json countries/se.json countries/se.redirects.json countries/se.excluded-stations.json
git status --short
npm test
COUNTRY=se npm run check
COUNTRY=se npm run build
COUNTRY=se npm run preview
```

`git diff` does not show the contents of new untracked files; inspect those separately. Verify the station names, locations, icons, playback, metadata, and old-page redirects in the preview. Do not run a Greece-specific bulk duplicate-removal script on the new country's data.

For a country with translations enabled, also run:

```sh
python3 tools/check-localized-site.py dist
```

That audit currently expects multilingual alternate links. Use the manual checks above for an English-only build. Cleanup changes reach the live site only after committing, pushing to the intended country repository, and completing its deployment.

## Maintenance and checks

```sh
npm test
npm run check
COUNTRY=hr npm run check
npm run build
COUNTRY=hr npm run build
```

Supported country-aware tools are `stations:import`, `stations:metadata`, `stations:icons`, `stations:geography`, `tools/fetch-missing-station-icons.mjs`, and `tools/fix-station-slugs.mjs`, `tools/fill-stream-audio-info.py`, and `tools/fill-state-from-homepage.py`. Historical Python repair scripts and other one-off tools in `tools/` are Greece-specific; do not run them for another country. Import review reports and metadata discovery reports have country suffixes. Failed or absent metadata does not prevent audio playback.

## Exclude deleted stations from future imports

Add `{ "stationuuid": "UUID", "reason": "Removed intentionally" }` entries to `countries/<code>.excluded-stations.json`. The importer skips those IDs before matching stream URLs, includes skipped records in its report, and removes matching primary IDs from the local dataset. Include all alternate UUIDs when deleting a merged station. Exclusions apply only to the selected country; an absent file means no exclusions. Remove an exclusion to allow that UUID to be imported again.

## Configure each site's brand

Edit `countries/<code>.json`. Site branding does not have to contain “E-Radio” or the country name:

```json
{
  "siteName": "Radio Hrvatska",
  "siteShortName": "Radio Hrvatska",
  "introText": "Otkrijte hrvatske radijske postaje i slušajte radio uživo iz cijele Hrvatske putem interneta.",
  "socialImage": "/icons/icon-512x512.png",
  "logo": "/icons/icon-32x32.png",
  "favicon": "/favicon.svg",
  "favicon32": "/icons/icon-32x32.png",
  "icon192": "/icons/icon-192x192.png",
  "icon512": "/icons/icon-512x512.png",
  "appleTouchIcon": "/icons/apple-touch-icon.png",
  "socialLocale": "en_US",
  "twitterHandle": ""
}
```

`siteName` controls the header, footer, author, structured data, legal copy, and full app name. `siteShortName` controls page-title suffixes and the installed app's short name; it defaults to `siteName` if omitted. `introText` appears on the homepage and in the app manifest description. `socialImage` controls sharing images and may be a public-root path or HTTPS URL. The remaining image paths let each country use its own visual identity; keep the declared favicon/manifest formats and dimensions when replacing assets. Empty `twitterHandle` and `googleVerification` values omit those tags.

When creating a country, optionally pass `--site-name "Your Radio Brand"` to `tools/create-country.mjs`; otherwise the default name is `Radio <country>`. Restart the development server after editing country configuration. Existing station names, the Greece repository remote, and third-party Radddio branding are separate from the site's own brand.

## Fill city and region from coordinates

The country-aware geography tool checks only stations with both `geo_lat` and `geo_long`. It verifies the returned country, derives locality and county/region separately, and records foreign or ambiguous coordinates for review. Station slugs and stream URLs are preserved. Croatia uses county names in `state`, including `Grad Zagreb` for the City of Zagreb.

```sh
# Preview changes in reports/geography-hr.json (Croatian place names)
COUNTRY=hr python3 tools/fill-station-geography.py --lang hr --overwrite

# Apply; cached coordinate responses are reused
COUNTRY=hr python3 tools/fill-station-geography.py --lang hr --overwrite --write
```

Without `--overwrite`, only missing city/state values are filled. The report includes before/after values and exceptions. Coordinate responses are cached in `tools/cache/geography-<country>-<language>.json`. Keep the cache for subsequent runs. Set `--endpoint` or `GEOCODER_URL` to use a different compatible geocoder.

The default service is Nominatim: read its [usage policy](https://operations.osmfoundation.org/policies/nominatim/) before using it. This tool is for small, one-time manual cleanups, using one process on one machine, an identifying user agent, cached results, and no more than one request per second. Do not run several copies or schedule repeated bulk jobs against the public service. For recurring work use another provider or your own service. Coordinates are sent to the selected service; results are OpenStreetMap data under ODbL. Configure `geographyAttribution` to `true` on countries using these results so the footer credits [OpenStreetMap contributors](https://www.openstreetmap.org/copyright).

Test the geography rules with `python3 -m unittest discover -s tests -p 'test_station_geography.py'`.

## Fill missing stream bitrate and codec

Requires `ffprobe` (provided by FFmpeg). Run from the project root:

```sh
COUNTRY=hr python3 tools/fill-stream-audio-info.py --write
```

Use `COUNTRY=gr` for Greece, or pass `--country hr`. Omit `--write` for a report-only scan. The script probes only stations missing bitrate or codec, preserves existing values, and leaves unidentifiable values unchanged. Croatia's results are saved in `reports/stream-audio-info-hr.json`. It aborts the data write if the dataset changes during probing.

## Fill missing state from station homepages

```sh
COUNTRY=hr python3 tools/fill-state-from-homepage.py --max 10 --sleep 1
# Equivalent explicit selection:
python3 tools/fill-state-from-homepage.py --country hr --max 10 --sleep 1
```

The tool reads the selected country's `stationsFile`, fetches homepage JSON-LD, and retains its existing location-extraction behavior. It fills only missing `state` values and saves automatically (no `--write` flag). It does not fill city or use coordinates. Existing state values remain unchanged. `--max` limits successful updates, not requests; use `0` for no limit.

Skipped station IDs are kept separately in `tools/state-fill-progress-hr.json` for Croatia. Greece retains its existing `tools/state-fill-progress.json`. Use `--progress-file` to override the location, or remove a skipped ID from the selected country's progress file to retry it. `--country` overrides `COUNTRY`; when neither is set, Greece is used.

### English Croatian location names

Croatia's `city` and `state` fields contain the display names for the English site.
`locationNames.hr` preserves the original values and `locationNames.en` stores the English values.
City proper names retain their diacritics (for example, Šibenik and Đakovo).
The county translations and known spelling aliases are in `hr.location-names.json`;
`fill-station-geography.py --country hr --lang en` applies these county translations.
Ambiguous legacy region labels remain unchanged until their geography is verified.
Region URL changes have redirects in `hr.redirects.json`; station slugs remain unchanged.
On GitHub Pages these are static HTML redirects, not server-side HTTP 301 responses.

### Croatian and English pages

With `"locales": ["en", "hr"]` in `countries/hr.json`, the Croatia build generates both languages in one deployment:

- English: `/`, `/stations/extra-fm/`, `/city/zagreb/`
- Croatian: `/hr/`, `/hr/stations/extra-fm/`, `/hr/city/zagreb/`

Run `COUNTRY=hr npm run dev` for both languages locally, or `COUNTRY=hr npm run build` for GitHub Pages. The existing deployment workflow only needs its `COUNTRY` repository variable set to `hr`.

`src/i18n/hr.json` holds Croatian interface text, complete SEO messages, and geographic display labels. `src/i18n/index.ts` determines the language from the URL and localizes internal page links. `src/i18n/translate.ts` is shared by static templates and browser player messages. Use `t("Message with {0}", [value])` for new text; add the same message key to the dictionary. Full-message patterns also translate descriptions assembled by the shared city/region SEO helpers. Keep placeholders intact, and test city names separately from county labels. Do not translate station names, song titles, stream URLs, or metadata endpoints.

`tools/integrations/localized-routes.mjs` registers Croatian versions of the existing Astro templates, reusing their station data and pagination. Station, city, region and genre slugs stay the same across languages. Display labels must not be used to regenerate localized slugs. Original `locationNames.hr` data is retained for future editing; the translation dictionary controls displayed labels without changing grouping or routes.

Each page has its own canonical URL, `lang`, and reciprocal `en`, `hr`, and `x-default` links. The language switcher links to the equivalent page. The sitemap contains both languages and excludes redirects and the design demo. Existing country redirects also get Croatian equivalents. GitHub Pages uses generated HTML redirects, not server-side HTTP 301 responses. Both languages include the country's configured Google verification tag; the root URL-prefix Search Console property covers `/hr/` too.

Validation after a Croatia build:

```sh
npm test
COUNTRY=hr npm run check
COUNTRY=hr npm run build
python3 tools/check-localized-site.py dist
```

The audit checks rendered pages, language links, canonical URLs, internal links, redirects, structured-data syntax, sitemap targets, and manifests. When adding a language, translate complete page content and metadata before exposing its routes and `hreflang` links. Country catalogs are separate sites, not automatically translations of each other. Google guidance: [localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions) and [multilingual sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites).

### Metadata provider scrapers

Station pages and Live Tracks share `src/lib/metadata/index.mjs`. The registry selects a scraper using the station's `metadata_server`:

- `providers/azuracast.mjs`
- `providers/centovacast.mjs`
- `providers/icecast.mjs`
- `providers/shoutcast.mjs`
- `providers/radiojar.mjs`
- `providers/radio-co.mjs` (`radio.co` in station data)
- `providers/unknown.mjs` (legacy fallback for unrecognized providers)

Each provider exports `parse(payload, context)` and `history(payload)`. Optional `textHistory(text)` handles provider-specific text responses. The shared interface returns the current song, artwork, listeners, history, and next track in a common format. `context` contains the stream URL and metadata endpoint; Icecast uses the endpoint's mount parameter to select the correct station. Shared helpers decode JSON/Jina responses and normalize artwork and history fields.

Scrapers contain no DOM manipulation or timers. Page controllers handle requests, timeouts, polling, playback, and display; `metadata-polling.mjs` still controls refresh timing using the original provider response. To add a provider, create its module, register it in `index.mjs`, and add representative payload tests in `tests/metadata-scrapers.test.mjs`. Live Tracks eligibility is unchanged by this refactor.

### Greek and English pages (e-radio.github.io)

`countries/gr.json` enables `"locales": ["en", "el"]`. English keeps the existing URLs; Greek uses `/el/`, including `/el/stations/.../`, `/el/live-tracks/`, and `/el/tools/endpoint-finder/`. The header language switcher opens the equivalent page. No automatic language redirect is used.

Greek interface messages, SEO descriptions, and location labels live in `src/i18n/el.json`. Both static pages and browser controls use that dictionary. Station names, song titles, stored locations, stream URLs, and slugs remain unchanged. The English intro is configured in `countries/gr.json`; its Greek translation is in the dictionary.

The route integration and sitemap use each country's `locales` configuration. Greek pages have self-referencing canonicals, `lang="el"`, `og:locale="el_GR"`, and reciprocal `en`/`el`/`x-default` links. Redirects and the web manifest also have Greek equivalents. The existing Google verification tag appears in both languages.

```sh
COUNTRY=gr npm run dev
npm test
COUNTRY=gr npm run check
COUNTRY=gr npm run build
python3 tools/check-localized-site.py dist
```

Deploy the generated site using the existing workflow with `COUNTRY=gr` (also the default). No separate repository or backend is needed for Greek pages. When adding another language, add its dictionary to `translate.ts`, its code and display name to `index.ts`, its social locale to `SEO.astro`, then enable it in the country's `locales` list once the translation is complete.
