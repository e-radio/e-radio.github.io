const clean = value => typeof value === 'string' ? value.trim() : '';
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
  let title = clean(source.title) || clean(source.yp_currently_playing) || clean(source.songtitle);
  let artist = clean(source.artist);
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
