const entries = payload => Array.isArray(payload?.items) ? payload.items : [];
const songEntry = item => ({
  song: {
    artist: item.artist || '',
    title: item.title || item.full || '',
    art: item.cover || null,
  },
  played_at: item.played_ts,
});

export function history(payload) {
  return { song_history: entries(payload).map(songEntry) };
}
