import * as azuracast from './providers/azuracast.mjs';
import * as centovacast from './providers/centovacast.mjs';
import * as icecast from './providers/icecast.mjs';
import * as shoutcast from './providers/shoutcast.mjs';
import * as radiojar from './providers/radiojar.mjs';
import * as radioCo from './providers/radio-co.mjs';
import * as otvoreni from './providers/otvoreni.mjs';
import * as unknown from './providers/unknown.mjs';
import { artworkUrl, gatherSongHistory, parseTextHistory } from './common.mjs';
export { artworkUrl, gatherSongHistory } from './common.mjs';

const providers = { otvoreni, azuracast, centovacast, icecast, shoutcast, radiojar, 'radio.co': radioCo, unknown };
export const scraperFor = server => providers[server] || unknown;

export function decodeMetadata(text) {
  const raw = text.includes('Markdown Content:') ? text.slice(text.indexOf('Markdown Content:') + 17).trim() : text.trim();
  const start = raw.search(/[\[{]/);
  if (start < 0) throw new Error('Metadata response contains no JSON');
  const payload = JSON.parse(raw.slice(start));
  if (payload?.type === 'error') throw new Error('Metadata provider returned an error');
  return payload;
}

// Providers return data only. Pages own rendering, polling, and playback.
export function parseMetadata(server, payload, context = {}) {
  const result = scraperFor(server).parse(payload, context);
  const song = result.song || {};
  const text = song.text || [song.artist, song.title].filter(Boolean).join(' – ') || null;
  const art = artworkUrl(song, context.endpoint) || null;
  const normalizedSong = { ...song, art };
  return { song: normalizedSong, text, listeners: result.listeners,
    payload: { now_playing: { song: normalizedSong, played_at: result.playedAt },
      song_history: result.history || [], playing_next: result.next || null } };
}

export function parseHistory(server, text) {
  const raw = text.includes('Markdown Content:') ? text.slice(text.indexOf('Markdown Content:') + 17).trim() : text;
  if (/^\s*[\[{]/.test(raw)) return scraperFor(server).history(decodeMetadata(raw));
  const [current, ...rest] = (scraperFor(server).textHistory || parseTextHistory)(raw);
  return {
    now_playing: current ? { song: { text: current.title } } : undefined,
    song_history: rest.map(entry => ({ text: entry.title, played_at: entry.time, time: entry.time })),
  };
}
