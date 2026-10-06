const clean = value => typeof value === 'string' ? value.trim() : '';

export function parse(payload) {
  const artist = clean(payload?.artist);
  const title = clean(payload?.title);
  const next = clean(payload?.next);
  const separator = next.indexOf(': ');
  return {
    song: { artist, title, art: clean(payload?.art) || null },
    next: next ? { song: separator > 0
      ? { artist: next.slice(0, separator).trim(), title: next.slice(separator + 2).trim() }
      : { title: next } } : null,
  };
}
