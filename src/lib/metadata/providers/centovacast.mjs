import { centovaHistoryTracks } from '../../centovacast-history.mjs';
export function parse(payload) {
  const entry = payload?.type === 'result' ? payload.data?.[0] : null;
  return { song: entry && { ...entry.track, text: entry.song || entry.summary?.replace(/<[^>]+>/g, '').trim(),
    art: entry.track?.imageurl || entry.track?.image },
    listeners: entry?.listeners ?? entry?.listenertotal, playedAt: entry?.track?.started };
}
export const history = payload => ({ song_history: centovaHistoryTracks(payload) });
