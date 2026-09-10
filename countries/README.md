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

Supported country-aware tools are `stations:import`, `stations:metadata`, `stations:icons`, `tools/fetch-missing-station-icons.mjs`, and `tools/fix-station-slugs.mjs`. Historical Python repair scripts and other one-off tools in `tools/` are Greece-specific; do not run them for another country. Import review reports and metadata discovery reports have country suffixes. Failed or absent metadata does not prevent audio playback.

## Exclude deleted stations from future imports

Add `{ "stationuuid": "UUID", "reason": "Removed intentionally" }` entries to `countries/<code>.excluded-stations.json`. The importer skips those IDs before matching stream URLs, includes skipped records in its report, and removes matching primary IDs from the local dataset. Include all alternate UUIDs when deleting a merged station. Exclusions apply only to the selected country; an absent file means no exclusions. Remove an exclusion to allow that UUID to be imported again.
