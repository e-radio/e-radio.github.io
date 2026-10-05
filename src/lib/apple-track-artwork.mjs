const clean = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/&|\+/g, ' and ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');

export const hasTrackArtwork = value => typeof value === 'string' && /^https:\/\//i.test(value)
  && !/\/(?:no[ _-]?cover|default[ _-]?cover)(?:[./?]|$)/i.test(value);

export function createAppleTrackArtwork({ country = 'GR', fetchImpl = fetch, now = Date.now } = {}) {
  const cache = new Map();
  let nextRequestAt = 0;
  const lookup = (artist, title) => {
    if (!artist?.trim() || !title?.trim()) return Promise.resolve(null);
    const key = `${clean(artist)}|${clean(title)}`;
    if (cache.has(key)) return cache.get(key);
    const request = (async () => {
      // One search every three seconds per visitor: no more than 20 a minute.
      const delay = Math.max(0, nextRequestAt - now());
      nextRequestAt = Math.max(now(), nextRequestAt) + 3000;
      if (delay) await new Promise(resolve => setTimeout(resolve, delay));
      try {
        const url = new URL('https://itunes.apple.com/search');
        url.searchParams.set('term', `${artist} ${title}`);
        url.searchParams.set('country', country);
        url.searchParams.set('media', 'music');
        url.searchParams.set('entity', 'song');
        url.searchParams.set('limit', '1');
        const response = await fetchImpl(url.href);
        if (!response.ok) return null;
        const payload = await response.json();
        const item = payload.results?.[0];
        return item && /^https:\/\//i.test(item.artworkUrl100 || '')
          && /^https:\/\/(?:music\.apple\.com|itunes\.apple\.com)\//i.test(item.trackViewUrl || '')
          ? { artwork: item.artworkUrl100.replace(/\/100x100bb\./, '/512x512bb.'), url: item.trackViewUrl } : null;
      } catch { return null; }
    })();
    cache.set(key, request);
    if (cache.size > 100) cache.delete(cache.keys().next().value);
    return request;
  };
  return lookup;
}
