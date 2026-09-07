import rawStations from "../data/stations-gr.json";

export const METADATA_PAGE_SIZE = 20;
export const metadataStations = rawStations.filter((station) => {
  return Boolean(station.stream_url && station.nowplaying_url && station.metadata_server);
}).sort((a, b) => (b.votes || 0) - (a.votes || 0) || a.name.localeCompare(b.name));
