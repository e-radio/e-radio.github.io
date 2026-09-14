export function parse(payload) {
  return { song: payload?.current_track, history: payload?.history || [], next: payload?.next_track };
}
export const history = payload => ({
  now_playing: payload?.current_track ? { song: payload.current_track } : payload?.now_playing,
  song_history: payload?.song_history || payload?.history || [],
  playing_next: payload?.next_track,
});
