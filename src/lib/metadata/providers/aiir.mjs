const track = value => value?.type === 'track' && value.title
  ? { artist: value.artist || '', title: value.title, art: value.imageUrl || null }
  : null;

export function parse(payload) {
  const current = track(payload?.nowPlaying);
  return { song: current, history: Array.isArray(payload?.previouslyPlayed)
    ? payload.previouslyPlayed.map(value => ({ song: track({ ...value, type: 'track' }) }))
      .filter(entry => entry.song && entry.song.title !== current?.title)
    : [] };
}

export const history = payload => ({ song_history: parse(payload).history });
