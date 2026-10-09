import { artworkUrl, parseTextHistory } from '../common.mjs';
import { icecastTrack, icecastSource } from '../../icecast.mjs';
import { stripBroadcastLabel } from '../../metadata-text.mjs';
const playlistHistory = source => {
  const tracks = Array.isArray(source?.playlist?.trackList) ? source.playlist.trackList : [];
  const current = stripBroadcastLabel(source?.title);
  const previous = stripBroadcastLabel(tracks.at(-1)?.title) === current ? tracks.slice(0, -1) : tracks;
  return previous.slice().reverse().filter(track => typeof track?.title === 'string' && track.title.trim())
    .map(track => ({ song: icecastTrack({ icestats: { source: { title: track.title } } }) }));
};
export function parse(payload, context) {
  const song = icecastTrack(payload, context.streamUrl, context.endpoint);
  const source = icecastSource(payload, context.streamUrl, context.endpoint);
  return { song: song && { ...song, art: artworkUrl(source, context.endpoint) }, listeners: song?.listeners,
    history: playlistHistory(source) };
}
export const history = payload => payload;

export function textHistory(rawText) {
  const entries = parseTextHistory(rawText);
  if (entries.length) return entries;
  const line = rawText.split('\n').map(value => value.trim()).find(value => /^current song[:：]/i.test(value));
  const title = line?.replace(/^[^:：]+[:：]\s*/, '').trim();
  return title ? [{ time: null, title }] : [];
}
