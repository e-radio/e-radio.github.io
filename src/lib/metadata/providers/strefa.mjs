const clean = value => typeof value === 'string' ? value.trim() : '';
function song(track) {
  const artist = clean(track?.artist);
  const title = clean(track?.title);
  const cover = clean(track?.cover);
  return { artist, title,
    text: [artist, title].filter(Boolean).join(' – ') || clean(track?.value) || clean(track?.program),
    art: cover.startsWith('//') ? `https:${cover}` : cover || null };
}
export function parse(payload) {
  return { song: song(payload?.ok === true ? payload.data : null), history: [] };
}
export function history(payload) {
  return { song_history: payload?.ok === true && Array.isArray(payload.items)
    ? payload.items.map(track => ({ song: song(track), time: track.time })) : [] };
}
