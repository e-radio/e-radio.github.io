import { stationsPath } from "../countries/site.mjs";
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { ensureUniqueStationSlugs, assertUniqueStationSlugs } from './lib/station-slugs.mjs';
const dataFile = stationsPath;
const stations = JSON.parse(await readFile(dataFile, 'utf8'));
const changes = ensureUniqueStationSlugs(stations);
assertUniqueStationSlugs(stations);
if (changes.length) {
  const temporary = stationsPath + ".tmp";
  await writeFile(temporary, `${JSON.stringify(stations, null, 2)}\n`);
  await rename(temporary, dataFile);
  await mkdir(new URL('../reports/', import.meta.url), { recursive: true });
  await writeFile(new URL('../reports/station-slug-changes.json', import.meta.url), `${JSON.stringify(changes, null, 2)}\n`);
}
console.log(`Checked ${stations.length} stations; repaired ${changes.length} slugs.`);
