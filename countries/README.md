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

## GitHub Pages

Use a separate repository for each country site, or build selected countries from this shared repository into separate deployment repositories. In the repository's **Settings → Secrets and variables → Actions → Variables**, set:

- `COUNTRY`: for example `hr` (defaults to `gr`).
- `SITE_URL`: the final origin, for example `https://your-account.github.io` or a custom domain.

The existing Pages workflow reads these variables. This template currently requires a root-domain deployment: a GitHub Pages user/organization site or a custom domain. Repository subpaths such as `/croatia/` are rejected because navigation and asset paths are root-relative.

To offer this repository as a GitHub template, enable **Template repository** in GitHub repository settings, then use **Use this template** for each new country. No repository setting or deployment is changed by this refactor.

## Maintenance and checks

```sh
npm test
npm run check
COUNTRY=hr npm run check
npm run build
COUNTRY=hr npm run build
```

Supported country-aware tools are `stations:import`, `stations:metadata`, `stations:icons`, `tools/fetch-missing-station-icons.mjs`, and `tools/fix-station-slugs.mjs`. Historical Python repair scripts and other one-off tools in `tools/` are Greece-specific; do not run them for another country. Import review reports and metadata discovery reports have country suffixes. Failed or absent metadata does not prevent audio playback.

## Exclude deleted stations from future imports

Add `{ "stationuuid": "UUID", "reason": "Removed intentionally" }` entries to `countries/<code>.excluded-stations.json`. The importer skips those IDs before matching stream URLs, includes skipped records in its report, and removes matching primary IDs from the local dataset. Include all alternate UUIDs when deleting a merged station. Exclusions apply only to the selected country; an absent file means no exclusions. Remove an exclusion to allow that UUID to be imported again.
