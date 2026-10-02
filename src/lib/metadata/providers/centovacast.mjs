import { repairMetadataText } from '../../metadata-text.mjs';
import { centovaHistoryTracks } from '../../centovacast-history.mjs';
export function parse(payload) {
  const entry = payload?.type === 'result' ? payload.data?.[0] : null;
  return { song: entry && { ...entry.track, artist: repairMetadataText(entry.track?.artist),
    title: repairMetadataText(entry.track?.title), album: repairMetadataText(entry.track?.album),
    text: repairMetadataText(entry.song || entry.summary?.replace(/<[^>]+>/g, '').trim()),
    art: entry.track?.imageurl || entry.track?.image },
    listeners: entry?.listeners ?? entry?.listenertotal, playedAt: entry?.track?.started };
}
export const history = payload => ({ song_history: centovaHistoryTracks(payload) });
