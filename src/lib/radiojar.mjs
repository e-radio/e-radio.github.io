export function radiojarEndpoint(streamUrl) {
  try {
    const url = new URL(streamUrl);
    if (url.hostname !== 'stream.radiojar.com') return null;
    const id = url.pathname.split('/').filter(Boolean)[0];
    return id ? `https://www.radiojar.com/api/stations/${encodeURIComponent(decodeURIComponent(id))}/now_playing/` : null;
  } catch { return null; }
}
export function radiojarHasTrack(payload) {
  return payload && !Array.isArray(payload) && typeof payload.title === 'string' && Boolean(payload.title.trim());
}

export function radiojarSong(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const clean = value => typeof value === 'string' ? value.trim() : '';
  return { title: clean(payload.title), artist: clean(payload.artist), art: clean(payload.thumb) };
}
