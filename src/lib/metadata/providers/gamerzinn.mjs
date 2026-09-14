const tracks = payload => (Array.isArray(payload?.results) ? payload.results : []).map(track => ({
  song: { artist: track.author, title: track.title, text: track.metadata,
    art: track.img_large_url || track.img_medium_url || track.img_url },
  played_at: typeof track.ts === 'number' ? track.ts / 1000 : undefined,
}));
export function parse(payload) {
  const [current, ...previous] = tracks(payload);
  return { song: current?.song, playedAt: current?.played_at, history: previous };
}
export function history(payload) {
  const [current, ...previous] = tracks(payload);
  return { now_playing: current, song_history: previous };
}
