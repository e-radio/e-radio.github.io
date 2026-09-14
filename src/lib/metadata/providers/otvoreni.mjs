// Otvoreni supplies structured current-song fields and lastTen in one response.
export function parse(payload) {
  return {
    song: { artist: payload?.artist, title: payload?.title },
    history: Array.isArray(payload?.lastTen)
      ? payload.lastTen.map(track => ({ song: { artist: track.artist, title: track.title } }))
      : [],
  };
}
export function history(payload) {
  const result = parse(payload);
  return { now_playing: { song: result.song }, song_history: result.history };
}
