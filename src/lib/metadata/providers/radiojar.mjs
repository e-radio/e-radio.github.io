import { radiojarSong, radiojarHistoryTracks } from '../../radiojar.mjs';
export function parse(payload) {
  return { song: radiojarSong(payload), playedAt: payload?.played_at ?? payload?.playedat };
}
export const history = payload => ({ song_history: radiojarHistoryTracks(payload) });
