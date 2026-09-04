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

## Data Source

Radio station data is fetched from the [Radio Browser API](https://www.radio-browser.info/), which provides information about thousands of radio stations worldwide.

## Icon Maintenance

Run `npm run fix favicons` from the project root after adding stations without a `favicon`. For each missing icon, `fetch-missing-station-icons.mjs` checks the station's existing remote favicon and homepage metadata (`<link>` icons and `og:image`), then falls back to `/favicon.ico`. It converts the first usable image to a 256×256 WebP file in `public/station-icons`; if none can be downloaded, it creates a colored WebP placeholder using the station's initials. The script updates `src/data/stations-gr.json` with each new local icon path and skips stations whose `favicon` is already set.

## Removing Duplicate Stations

Run `python3 tools/remove-duplicate-stations.py` from the project root. The script groups stations by exact `stream_url`, keeps the entry with the best clean slug (then the shortest slug), and removes the others from `src/data/stations-gr.json`. It also deletes station icons that were used only by removed entries. Because the script edits data and icons directly, review the Git diff afterward.

## Fixing City and Region Fields

Run `python3 tools/fix-state-city-only.py` from the project root. The script finds stations whose `state` contains a city while `city` is empty, moves that value to `city`, and uses `tools/city-region-map.json` to set the correct Greek region in `state`. It also converts known Greek names and spelling variants to canonical English city names using `tools/city-name-map.json`. Unknown, non-English, or potentially misspelled cities are recorded for review, and `--max N` can limit how many stations are updated in one run.

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
