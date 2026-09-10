import rawStations from "./stations";

export const METADATA_PAGE_SIZE = 20;
export const metadataStations = rawStations.filter((station) => {
  return Boolean(station.stream_url && typeof station.nowplaying_url === 'string' && station.nowplaying_url.trim());
}).sort((a, b) => (b.votes || 0) - (a.votes || 0) || a.name.localeCompare(b.name));
