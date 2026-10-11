import * as centovacast from './centovacast.mjs';

// The broadcaster sometimes replaces Greek letters with literal question marks
// before publishing its CentovaCast feed. Those lost characters cannot be decoded.
const unreadable = song => [song?.artist, song?.title, song?.text]
  .some(value => typeof value === 'string' && /\?{2,}/u.test(value));
const unknown = song => !song?.title || /^unknown$/iu.test(song.title.trim());

export function parse(payload) {
  const result = centovacast.parse(payload);
  return unreadable(result.song) || unknown(result.song)
    ? { ...result, song: null } : result;
}

export function history(payload) {
  const result = centovacast.history(payload);
  return { song_history: result.song_history.filter(entry => !unreadable(entry.song) && !unknown(entry.song)) };
}
