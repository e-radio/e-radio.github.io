const clean = value => typeof value === 'string'
  ? value.replace(/<[^>]*>/g, '').replace(/&amp;/gi, '&').replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"').replace(/&nbsp;/gi, ' ').trim()
  : '';

const song = value => {
  const text = clean(value).replace(/^\d+\.\)\s*/, '').trim();
  if (!text) return null;
  const match = /\s+-\s+/.exec(text);
  if (!match) return { text, title: text };
  const artist = text.slice(0, match.index).trim();
  const title = text.slice(match.index + match[0].length).trim();
  return artist && title ? { text, artist, title } : { text, title: text };
};

const tracks = payload => {
  const current = song(payload?.title);
  const history = Array.isArray(payload?.history) ? payload.history : [];
  return {
    current,
    history: history.map(song).filter(track => track && !/^jingle$/i.test(track.artist || '')
      && track.text !== current?.text).map(track => ({ song: track })),
  };
};

export function parse(payload) {
  const { current, history } = tracks(payload);
  return {
    song: { ...current, art: clean(payload?.art) || null },
    listeners: payload?.listeners,
    history,
  };
}

export function history(payload) {
  const { current, history } = tracks(payload);
  return { now_playing: current ? { song: current } : undefined, song_history: history };
}
