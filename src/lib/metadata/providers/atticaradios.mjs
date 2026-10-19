export function parse(payload) {
  const artist = typeof payload?.artist === 'string' ? payload.artist.trim() : '';
  const title = typeof payload?.song === 'string' ? payload.song.trim() : '';
  const image = typeof payload?.artistImage === 'string' ? payload.artistImage.trim() : '';
  const art = image.startsWith('//') ? `https:${image}` : /^https?:\/\//i.test(image) ? image : null;
  return { song: title ? { artist, title, art } : null };
}
