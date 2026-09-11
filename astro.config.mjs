// @ts-check
import { defineConfig } from 'astro/config';
import { readFileSync } from 'node:fs';
import { assertUniqueStationSlugs } from './tools/lib/station-slugs.mjs';
import { site, stationsPath, redirects } from './countries/site.mjs';
import { localizedRoutes } from './tools/integrations/localized-routes.mjs';

assertUniqueStationSlugs(JSON.parse(readFileSync(stationsPath, 'utf8')));
const countryRedirects = site.countryCode === 'HR' ? { ...redirects, '/page/1/': '/' } : redirects;
const localizedRedirects = site.countryCode === 'HR' && site.locales?.includes('hr')
  ? Object.fromEntries(Object.entries(countryRedirects)
      .filter(([, target]) => typeof target === 'string' && target.startsWith('/'))
      .map(([source, target]) => [`/hr${source}`, `/hr${target}`]))
  : {};

export default defineConfig({
  output: 'static',
  integrations: [localizedRoutes(site)],
  site: site.siteUrl,
  redirects: { ...countryRedirects, ...localizedRedirects },
});
