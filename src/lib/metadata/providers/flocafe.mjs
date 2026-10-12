import { parse as parseIcecast } from './icecast.mjs';

export function parse(payload, context) {
  const result = parseIcecast(payload, context);
  const song = result.song;
  if (!song || song.artist || !song.title?.includes('_')) return result;
  const separator = song.title.indexOf('_');
  const artist = song.title.slice(0, separator).trim();
  const title = song.title.slice(separator + 1).trim();
  return artist && title ? { ...result, song: { ...song, artist, title } } : result;
}
