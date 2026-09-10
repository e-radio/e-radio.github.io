import { site } from '../../countries/site.mjs';
import type greeceStations from '../data/stations-gr.json';

// Vite tracks these JSON imports so edits invalidate page data during development.
const datasets = import.meta.glob<typeof greeceStations>('../data/stations-*.json', {
  eager: true,
  import: 'default',
});
const datasetKey = site.stationsFile.replace(/^src\//, '../');
const selected = datasets[datasetKey];
if (!selected) throw new Error(`Country dataset not found: ${site.stationsFile}`);
const stations = selected.map(station => ({
  ...station,
  favicon: station.favicon && !/^https?:\/\/|^\/station-icons\//i.test(station.favicon) ? '' : station.favicon,
}));
export default stations;
