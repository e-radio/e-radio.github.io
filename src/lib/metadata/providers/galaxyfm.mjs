const artwork = value => {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value, 'https://galaxyfm.gr/');
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
};

const entry = track => {
  if (!track || typeof track.title !== 'string' || !track.title.trim()) return null;
  const played = Date.parse(track.played_at_iso || '');
  return {
    song: { artist: typeof track.artist === 'string' ? track.artist.trim() : '',
      title: track.title.trim(), art: artwork(track.cover_url) },
    played_at: Number.isFinite(played) ? played / 1000 : undefined,
  };
};

export function parse(payload) {
  const current = entry(payload?.current);
  const currentId = payload?.current?.id;
  const history = Array.isArray(payload?.history) ? payload.history
    .filter(track => currentId == null || String(track?.id) !== String(currentId))
    .map(entry).filter(Boolean) : [];
  return { song: current?.song, playedAt: current?.played_at, history };
}
