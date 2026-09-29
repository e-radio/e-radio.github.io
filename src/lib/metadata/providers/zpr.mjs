// Grupa ZPR Media music/v2 feed. Future entries are a queue, never history.
const song = track => ({
  artist: Array.isArray(track?.artists) ? track.artists.filter(a => typeof a === 'string').join(' & ') : '',
  title: typeof track?.name === 'string' ? track.name : '',
  art: track?.image || track?.thumb || null,
});
const entries = tracks => Array.isArray(tracks)
  ? tracks.filter(track => track && typeof track.name === 'string' && track.name.trim()).map(track => ({song: song(track)})) : [];
export function parse(payload) {
  const upcoming = entries(payload?.futures);
  return {song: song(payload?.current), history: entries(payload?.pasts), next: upcoming[0] || null, upcoming};
}
export function history(payload) {
  return {song_history: entries(payload?.pasts)};
}
