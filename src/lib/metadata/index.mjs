import * as zpr from './providers/zpr.mjs';
import * as sonicpanel from './providers/sonicpanel.mjs';
import * as strefa from './providers/strefa.mjs';
import * as azuracast from './providers/azuracast.mjs';
import * as centovacast from './providers/centovacast.mjs';
import * as icecast from './providers/icecast.mjs';
import * as shoutcast from './providers/shoutcast.mjs';
import * as radiojar from './providers/radiojar.mjs';
import * as radioCo from './providers/radio-co.mjs';
import * as otvoreni from './providers/otvoreni.mjs';
import * as gamerzinn from './providers/gamerzinn.mjs';
import * as bauer from './providers/bauer.mjs';
import * as jolene from './providers/jolene.mjs';
import * as ellinadiko from './providers/ellinadiko.mjs';
import * as coolfm from './providers/coolfm.mjs';
import * as diesi from './providers/diesi.mjs';
import * as rcast from './providers/rcast.mjs';
import * as unknown from './providers/unknown.mjs';
import { artworkUrl, gatherSongHistory, parseTextHistory } from './common.mjs';
import { stripBroadcastLabel } from '../metadata-text.mjs';
export { artworkUrl, gatherSongHistory } from './common.mjs';

const providers = { zpr, sonicpanel, strefa, jolene, ellinadiko, coolfm, diesi, rcast, bauer, gamerzinn, otvoreni, azuracast, centovacast, icecast, shoutcast, radiojar, 'radio.co': radioCo, unknown };
export const scraperFor = server => providers[server] || unknown;

const cleanSong = song => song && typeof song === 'object'
  ? Object.fromEntries(Object.entries(song).map(([key, value]) =>
      [key, ['artist', 'title', 'text'].includes(key) ? stripBroadcastLabel(value) : value]))
  : song;
const cleanEntry = entry => {
  if (!entry || typeof entry !== 'object') return entry;
  const cleaned = cleanSong(entry);
  return cleaned.song && typeof cleaned.song === 'object'
    ? { ...cleaned, song: cleanSong(cleaned.song) } : cleaned;
};
const cleanEntries = entries => Array.isArray(entries) ? entries.map(cleanEntry) : entries;

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
  const song = cleanSong(result.song) || {};
  const text = song.text || [song.artist, song.title].filter(Boolean).join(' – ') || null;
  const art = artworkUrl(song, context.endpoint) || null;
  const normalizedSong = { ...song, art };
  return { song: normalizedSong, text, listeners: result.listeners,
    payload: { now_playing: { song: normalizedSong, played_at: result.playedAt },
      song_history: cleanEntries(result.history) || [], playing_next: cleanEntry(result.next) || null,
      upcoming: cleanEntries(result.upcoming) || [] } };
}

export function parseHistory(server, text) {
  const raw = text.includes('Markdown Content:') ? text.slice(text.indexOf('Markdown Content:') + 17).trim() : text;
  if (/^\s*[\[{]/.test(raw)) {
    const history = scraperFor(server).history(decodeMetadata(raw));
    if (Array.isArray(history)) return cleanEntries(history);
    return { ...history, now_playing: cleanEntry(history?.now_playing),
      song_history: cleanEntries(history?.song_history), playing_next: cleanEntry(history?.playing_next),
      upcoming: cleanEntries(history?.upcoming) };
  }
  const [current, ...rest] = (scraperFor(server).textHistory || parseTextHistory)(raw);
  return {
    now_playing: current ? { song: { text: stripBroadcastLabel(current.title) } } : undefined,
    song_history: rest.map(entry => ({ text: stripBroadcastLabel(entry.title), played_at: entry.time, time: entry.time })),
  };
}

export function decodeProviderMetadata(server, text) {
  const decode = scraperFor(server).decode;
  return decode ? decode(text, decodeMetadata) : decodeMetadata(text);
}

// Unknown/fallback parsing does not establish support for a station's provider.
export function supportsNowPlaying(server) {
  return server !== 'unknown' && Object.hasOwn(providers, server)
    && typeof providers[server].parse === 'function';
}
export function isLiveTrackStation(station) {
  return Boolean(station && supportsNowPlaying(station.metadata_server)
    && typeof station.stream_url === 'string' && station.stream_url.trim()
    && typeof station.nowplaying_url === 'string' && station.nowplaying_url.trim());
}
