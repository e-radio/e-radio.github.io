// @ts-check
import { defineConfig } from 'astro/config';
import { readFileSync } from 'node:fs';
import { assertUniqueStationSlugs } from './tools/lib/station-slugs.mjs';
import { site, stationsPath, redirects } from './countries/site.mjs';
assertUniqueStationSlugs(JSON.parse(readFileSync(stationsPath, 'utf8')));
export default defineConfig({ output: 'static', site: site.siteUrl, redirects });
