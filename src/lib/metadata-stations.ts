import rawStations from "../data/stations-gr.json";

export const METADATA_PAGE_SIZE = 20;
// Match the first record used to generate each station page when slugs repeat.
const seen = new Set<string>();
export const metadataStations = rawStations.filter((station) => {
  if (seen.has(station.slug)) return false;
  seen.add(station.slug);
  return Boolean(station.stream_url && station.nowplaying_url && station.metadata_server);
}).sort((a, b) => (b.votes || 0) - (a.votes || 0) || a.name.localeCompare(b.name));
