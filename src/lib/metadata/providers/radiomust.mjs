const channel = (payload, stream = 'radiomust') => Array.isArray(payload)
  ? payload.find(entry => entry?.stream === stream) : null;
const song = entry => entry && typeof entry === 'object'
  ? { artist: entry.artist || '', title: entry.title || '', art: entry.artwork || entry.albumCover || null }
  : null;
const historyEntries = entry => Array.isArray(entry?.history)
  ? entry.history.filter(track => track?.artist || track?.title)
      .map(track => ({ song: song(track), played_at: track.played }))
      .sort((a, b) => (b.played_at || 0) - (a.played_at || 0))
  : [];

export function parseChannel(payload, stream) {
  const entry = channel(payload, stream);
  return { song: song(entry?.current), next: entry?.next ? { song: song(entry.next) } : null,
    history: historyEntries(entry) };
}

export function historyChannel(payload, stream) {
  return { song_history: historyEntries(channel(payload, stream)) };
}

export const parse = payload => parseChannel(payload, 'radiomust');
export const history = payload => historyChannel(payload, 'radiomust');
