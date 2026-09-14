import { parseTextHistory } from '../common.mjs';
export function parse(payload) {
  return { song: { text: payload?.songtitle }, listeners: payload?.currentlisteners };
}
export function history(payload) {
  if (!Array.isArray(payload)) return payload;
  return {
    now_playing: { song: { text: payload[0]?.title || '' }, played_at: payload[0]?.playedat },
    song_history: payload.slice(1).map(track => ({ song: { text: track.title }, played_at: track.playedat })),
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
