export function parse(payload) {
  return { song: payload?.now_playing?.song, listeners: payload?.listeners?.current,
    playedAt: payload?.now_playing?.played_at, history: payload?.song_history || [],
    next: payload?.playing_next || payload?.next_track || payload?.queue?.[0] };
}
export const history = payload => payload;
