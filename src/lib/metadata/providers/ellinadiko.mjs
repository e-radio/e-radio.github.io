const clean = value => typeof value === 'string' ? value.trim() : '';

export function parse(payload) {
  const track = payload?.nowOnAir;
  const artist = clean(track?.artist);
  const title = clean(track?.title);
  return {
    song: { artist, title, text: [artist, title].filter(Boolean).join(' – '), art: clean(track?.image) || null },
  };
}
