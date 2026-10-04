import { repairMetadataText } from './metadata-text.mjs';

const clean = value => typeof value === 'string' ? value.trim() : '';
const xmlText = value => value.replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi, entity => {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  const key = entity.slice(1, -1).toLowerCase();
  if (key in named) return named[key];
  const codepoint = key.startsWith('#x') ? Number.parseInt(key.slice(2), 16) : Number.parseInt(key.slice(1), 10);
  return Number.isInteger(codepoint) && codepoint >= 0 && codepoint <= 0x10ffff
    && !(codepoint >= 0xd800 && codepoint <= 0xdfff) ? String.fromCodePoint(codepoint) : entity;
});
const xmlAttribute = (tag, name) => {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match ? xmlText(match[2]).trim() : '';
};
const jazlerSong = value => {
  if (!/<Schedule\b[^>]*\bSystem\s*=\s*["']Jazler["']/i.test(value)) return null;
  const song = value.match(/<Song\b[^>]*>/i)?.[0];
  if (!song) return null;
  const title = xmlAttribute(song, 'title');
  if (!title) return null;
  const artist = xmlAttribute(value.match(/<Artist\b[^>]*\/?\s*>/i)?.[0] || '', 'name');
  return { title, artist };
};
const normalizeMount = value => {
  try { return decodeURIComponent(value).replace(/\/+$/, '') || '/'; }
  catch { return value.replace(/\/+$/, '') || '/'; }
};

// A server can host several stations; never use another mount's track.
export function icecastSource(payload, streamUrl, endpoint) {
  let source = payload?.icestats?.source;
  if (Array.isArray(source)) {
    try {
      const stream = new URL(streamUrl);
      const metadata = new URL(endpoint.replace(/^https:\/\/r\.jina\.ai\//i, ''));
      const mount = metadata.searchParams.get('mount') || stream.searchParams.get('mp') || stream.searchParams.get('mount') || stream.pathname;
      source = source.find(entry => {
        const value = entry?.listenurl || entry?.mount;
        if (typeof value !== 'string') return false;
        try { return normalizeMount(new URL(value, stream.origin).pathname) === normalizeMount(mount.startsWith('/') ? mount : `/${mount}`); }
        catch { return false; }
      });
    } catch { return null; }
  }
  if (!source || typeof source !== 'object') return null;
  return source;
}

export function icecastTrack(payload, streamUrl, endpoint) {
  const source = icecastSource(payload, streamUrl, endpoint);
  if (!source) return null;
  let title = repairMetadataText(clean(source.title) || clean(source.yp_currently_playing) || clean(source.songtitle));
  let artist = repairMetadataText(clean(source.artist));
  const jazler = jazlerSong(title);
  if (jazler) ({ title, artist } = jazler);
  else if (/^<\?xml\b/i.test(title) || /^<Schedule\b/i.test(title)) return null;
  // Split only the first spaced hyphen so hyphenated names and song titles survive.
  const separator = /\s+-\s+/.exec(title);
  if (separator) {
    const parsedArtist = title.slice(0, separator.index).trim();
    const parsedTitle = title.slice(separator.index + separator[0].length).trim();
    if (parsedArtist && parsedTitle && (!artist || artist === parsedArtist)) {
      artist = artist || parsedArtist;
      title = parsedTitle;
    }
  }
  return {
    title,
    artist,
    listeners: source.listeners,
  };
}
