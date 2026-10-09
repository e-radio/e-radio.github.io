const clean = value => typeof value === 'string' ? value.trim() : '';

export function parse(payload) {
  const track = payload?.nowOnAir;
  const artist = clean(track?.artist);
  const title = clean(track?.title);
  return {
    song: { artist, title, text: [artist, title].filter(Boolean).join(' – '), art: clean(track?.image) || null },
  };
}

export function history(payload) {
  return { song_history: (Array.isArray(payload) ? payload : []).map(track => ({
    song: { artist: clean(track.artist), title: clean(track.title), art: clean(track.cover) || null },
    time: clean(track.played_at),
  })).filter(entry => entry.song.artist || entry.song.title) };
}
