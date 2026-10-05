import { repairMetadataText } from '../../metadata-text.mjs';

const repairEntry = entry => entry?.song ? { ...entry, song: {
  ...entry.song,
  artist: repairMetadataText(entry.song.artist),
  title: repairMetadataText(entry.song.title),
  album: repairMetadataText(entry.song.album),
  text: repairMetadataText(entry.song.text),
} } : entry;

export function parse(payload) {
  return { song: repairEntry(payload?.now_playing)?.song, listeners: payload?.listeners?.current,
    playedAt: payload?.now_playing?.played_at, history: (payload?.song_history || []).map(repairEntry),
    next: repairEntry(payload?.playing_next || payload?.next_track || payload?.queue?.[0]) };
}
export const history = payload => Array.isArray(payload) ? payload.map(repairEntry) : ({ ...payload,
  now_playing: repairEntry(payload?.now_playing),
  song_history: (payload?.song_history || []).map(repairEntry),
  playing_next: repairEntry(payload?.playing_next),
});
