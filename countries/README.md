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

Restart the development server after changing country or editing a country configuration. `COUNTRY` selects `countries/<code>.json`; `SITE_URL` optionally overrides its canonical origin. The interface is currently English for both countries. `language` declares the actual interface language; it does not translate text automatically.

## Create another country

```sh
node tools/create-country.mjs --code si --name Slovenia --adjective Slovenian --url https://your-site.example
COUNTRY=si npm run stations:import
COUNTRY=si npm run stations:metadata
COUNTRY=si npm run stations:icons
COUNTRY=si npm run build
```

The scaffold refuses to overwrite an existing country. It creates a configuration, an empty station dataset, and an empty redirects file. Import reads the configured Radio Browser country code. Metadata discovery and icon caching use the same selected dataset. Croatia's placeholder `.example` domain must be replaced before publishing.

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
