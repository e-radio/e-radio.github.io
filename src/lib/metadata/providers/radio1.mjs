const athensTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

function playedAt(value) {
  const match = typeof value === 'string' && value.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/u);
  if (!match) return null;
  const [, day, month, year, hour, minute, second] = match.map(Number);
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  if (!Number.isFinite(localAsUtc)) return null;
  const parts = Object.fromEntries(athensTime.formatToParts(new Date(localAsUtc)).map(part => [part.type, Number(part.value)]));
  const offset = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - localAsUtc;
  return Math.floor((localAsUtc - offset) / 1000);
}

const songs = payload => (Array.isArray(payload) ? payload : [])
  .filter(track => track?.type === 'Song' && typeof track.songName === 'string' && track.songName.trim())
  .map(track => ({ song: { artist: track.artistName === 'empty' ? '' : track.artistName || '', title: track.songName }, played_at: playedAt(track.startTime) }))
  .filter(entry => entry.played_at !== null)
  .sort((a, b) => a.played_at - b.played_at);

export function parse(payload, context = {}) {
  const tracks = songs(payload);
  const now = Number(context.now ?? Date.now()) / 1000;
  const played = tracks.filter(entry => entry.played_at <= now);
  const future = tracks.filter(entry => entry.played_at > now);
  const current = played.at(-1);
  return { song: current?.song || null, playedAt: current?.played_at,
    next: future[0] || null, upcoming: future };
}

export function history(payload) {
  return { song_history: songs(payload).reverse().slice(0, 10) };
}
