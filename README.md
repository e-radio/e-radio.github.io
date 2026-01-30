# e-Radio Greece

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
- `npm run fix favicons` - Cache missing station icons, resize to 128px, and create branded placeholders

## Data Source

Radio station data is fetched from the [Radio Browser API](https://www.radio-browser.info/), which provides information about thousands of radio stations worldwide.

## Icon Maintenance

Run `npm run fix favicons` whenever new stations are added or existing assets go missing. The tool will try homepage link icons first, then `og:image`, fall back to `/favicon.ico`, resize the best result to 128×128, and finally generate a branded SVG placeholder with station initials if no icon can be recovered.

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
