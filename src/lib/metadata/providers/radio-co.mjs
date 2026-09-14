const song = track => track && ({ ...track,
  artist: track.track_artist || track.artist,
  title: track.track_title || track.title,
  art: track.artwork_urls?.large || track.artwork_urls?.standard || track.artwork_url_large || track.artwork_url,
});
const entry = track => ({ song: song(track), played_at: track.start_time });
export function parse(payload) {
  const track = payload?.current_track || (!Array.isArray(payload?.data) ? payload?.data : null);
  return { song: song(track), playedAt: track?.start_time, history: payload?.history || [], next: payload?.next_track };
}
export function history(payload) {
  if (Array.isArray(payload?.data)) return { song_history: payload.data.map(entry) };
  return {
    now_playing: payload?.current_track ? entry(payload.current_track) : payload?.now_playing,
    song_history: payload?.song_history || payload?.history || [],
    playing_next: payload?.next_track,
  };
}
