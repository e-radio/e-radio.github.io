// The shared endpoint carries multiple channels; never use its global `playing`.
const channel = 'jolene-country-radio';

export function parse(payload) {
  const track = payload?.extended?.[channel];
  const artist = typeof track?.artist === 'string' ? track.artist.trim() : '';
  const title = typeof track?.title === 'string' ? track.title.trim() : '';
  const fallback = payload?.stations?.[channel];
  const text = [artist, title].filter(Boolean).join(' – ')
    || (typeof fallback === 'string' ? fallback.trim() : '');
  return {
    song: { artist, title, text, art: track?.album_art?.['480'] || track?.album_art?.['320'] || track?.album_art?.['1000'] || null },
    history: [],
  };
}

export function history() {
  return { song_history: [] };
}
