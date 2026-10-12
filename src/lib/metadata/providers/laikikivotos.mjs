import { stripBroadcastLabel } from '../../metadata-text.mjs';

const clean = value => typeof value === 'string' ? stripBroadcastLabel(value).trim() : '';
const tracks = payload => (Array.isArray(payload?.results) ? payload.results : [])
  .map(track => {
    const metadata = clean(track?.metadata);
    let artist = clean(track?.author);
    let title = clean(track?.title);
    if (!title || title === metadata) title = metadata;
    if (!artist && title) {
      const separator = /\s*-\s*/u.exec(title);
      if (separator && separator.index > 0 && separator.index + separator[0].length < title.length) {
        artist = title.slice(0, separator.index).trim();
        title = title.slice(separator.index + separator[0].length).trim();
      }
    }
    if (!title) return null;
    return {
      song: { artist, title, art: track.img_large_url || track.img_medium_url || track.img_url || null },
      played_at: Number.isFinite(track.ts) ? track.ts / 1000 : undefined,
    };
  }).filter(Boolean);

export function parse(payload) {
  const [current] = tracks(payload);
  return { song: current?.song, playedAt: current?.played_at,
    listeners: payload?.results?.[0]?.n_listeners };
}

export function history(payload) {
  const [current, ...previous] = tracks(payload);
  return { now_playing: current, song_history: previous };
}
