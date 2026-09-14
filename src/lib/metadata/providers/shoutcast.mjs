export function parse(payload) {
  return { song: { text: payload?.songtitle }, listeners: payload?.currentlisteners };
}
export function history(payload) {
  if (!Array.isArray(payload)) return payload;
  return {
    now_playing: { song: { text: payload[0]?.title || '' }, played_at: payload[0]?.playedat },
    song_history: payload.slice(1).map(track => ({ song: { text: track.title }, played_at: track.playedat })),
  };
}
