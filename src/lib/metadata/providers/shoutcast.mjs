import { parseTextHistory } from '../common.mjs';
const splitSong = value => {
  const text = typeof value === 'string' ? value.trim() : '';
  const separator = /\s+-\s+/.exec(text);
  if (!separator) return { text, title: text };
  const artist = text.slice(0, separator.index).trim();
  const title = text.slice(separator.index + separator[0].length).trim();
  return artist && title ? { text, artist, title } : { text, title: text };
};
export function parse(payload) {
  if (typeof payload?.nowplaying === 'string' && Array.isArray(payload?.trackhistory)) {
    return { song: { ...splitSong(payload.nowplaying), art: payload.coverart }, listeners: payload.connections,
      history: payload.trackhistory.slice(payload.trackhistory[0] === payload.nowplaying ? 1 : 0)
        .map(text => ({ song: splitSong(text) })) };
  }
  return { song: splitSong(payload?.songtitle), listeners: payload?.currentlisteners };
}
export function history(payload) {
  if (Array.isArray(payload?.trackhistory)) {
    const result = parse(payload);
    return { now_playing: { song: result.song }, song_history: result.history };
  }
  if (!Array.isArray(payload)) return payload;
  return {
    now_playing: { song: splitSong(payload[0]?.title), played_at: payload[0]?.playedat },
    song_history: payload.slice(1).map(track => ({ song: splitSong(track.title), played_at: track.playedat })),
  };
}

// Shoutcast v1 /7.html: six numeric fields followed by the complete song text.
export function decode(text, decodeJson) {
  const raw = text.includes('Markdown Content:') ? text.slice(text.indexOf('Markdown Content:') + 17) : text;
  const plain = raw.replace(/<[^>]*>/g, '').trim();
  const match = plain.match(/^(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),([\s\S]*)$/);
  if (!match) return decodeJson(text);
  const songtitle = match[7].trim().replace(/&amp;/gi, '&').replace(/&#39;|&apos;/gi, "'").replace(/&quot;/gi, '"');
  return { currentlisteners: Number(match[1]), songtitle };
}
export const textHistory = parseTextHistory;
