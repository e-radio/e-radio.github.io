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

export function radiojarHistoryEndpoint(nowPlayingUrl) {
  try {
    const url = new URL(nowPlayingUrl);
    if (!['www.radiojar.com', 'radiojar.com'].includes(url.hostname) || !/^\/api\/stations\/[^/]+\/now_playing\/$/.test(url.pathname)) return null;
    url.pathname = url.pathname.replace(/now_playing\/$/, 'tracks/');
    url.search = '';
    return url.href;
  } catch { return null; }
}

export function radiojarHistoryTracks(payload, now = Date.now()) {
  if (!Array.isArray(payload)) return [];
  const timestamp = value => {
    if (typeof value !== 'string' || !value.trim()) return NaN;
    const iso = value.trim();
    return Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso) ? iso : `${iso}Z`);
  };
  return payload.flatMap(entry => {
    if (!entry || typeof entry.track !== 'string' || !entry.track.trim()) return [];
    const start = timestamp(entry.tm);
    const end = timestamp(entry.tm_end);
    if (!Number.isFinite(start) || start > now || (Number.isFinite(end) && end > now)) return [];
    return [{ song: {title: entry.track.trim(), artist: typeof entry.artist === 'string' ? entry.artist.trim() : '',
      art: typeof entry.thumb === 'string' ? entry.thumb : '', album: entry.album || ''}, played_at: start / 1000 }];
  }).sort((a,b) => b.played_at - a.played_at).slice(0,15);
}
