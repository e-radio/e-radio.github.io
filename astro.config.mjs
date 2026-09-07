// @ts-check
import { defineConfig } from 'astro/config';
import { readFileSync } from 'node:fs';
import { assertUniqueStationSlugs } from './tools/lib/station-slugs.mjs';

assertUniqueStationSlugs(JSON.parse(readFileSync(new URL('./src/data/stations-gr.json', import.meta.url), 'utf8')));

// https://astro.build/config
export default defineConfig({
  output: "static",
});