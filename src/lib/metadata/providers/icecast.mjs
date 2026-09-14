import { artworkUrl, parseTextHistory } from '../common.mjs';
import { icecastTrack, icecastSource } from '../../icecast.mjs';
export function parse(payload, context) {
  const song = icecastTrack(payload, context.streamUrl, context.endpoint);
  return { song: song && { ...song, art: artworkUrl(icecastSource(payload, context.streamUrl, context.endpoint), context.endpoint) }, listeners: song?.listeners };
}
export const history = payload => payload;

export function textHistory(rawText) {
  const entries = parseTextHistory(rawText);
  if (entries.length) return entries;
  const line = rawText.split('\n').map(value => value.trim()).find(value => /^current song[:：]/i.test(value));
  const title = line?.replace(/^[^:：]+[:：]\s*/, '').trim();
  return title ? [{ time: null, title }] : [];
}
