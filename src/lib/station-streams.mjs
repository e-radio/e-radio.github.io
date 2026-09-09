// Keep stream_url as the default for existing consumers of station data.
export function stationStreams(station) {
  const fallback = { id: 'default', label: 'Default', url: station.stream_url, bitrate: station.bitrate, codec: station.codec };
  const candidates = station.streams?.length ? station.streams : [fallback];
  const streams = candidates.filter((s, index) => s.url && candidates.findIndex(other => other.url === s.url) === index);
  if (fallback.url && !streams.some(s => s.url === fallback.url)) streams.unshift(fallback);
  return streams.map(s => ({ ...s, quality: [s.bitrate ? `${s.bitrate} kbps` : null, s.codec].filter(Boolean).join(' · ') }));
}

// Changing sources must not start a paused station.
export function replaceStream(audio, url, requested) {
  const resume = requested || !audio.paused;
  audio.pause();
  audio.src = url;
  audio.load();
  return resume;
}
