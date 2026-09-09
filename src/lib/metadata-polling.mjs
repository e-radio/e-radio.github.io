// AzuraCast timestamps and durations are seconds; browser delays are milliseconds.
export function metadataPollDelay(server, payload, fallback = 15000, now = Date.now()) {
  if (server !== 'azuracast' || payload?.live?.is_live) return fallback;
  const { played_at: started, duration } = payload?.now_playing || {};
  if (!Number.isFinite(started) || started <= 0 || !Number.isFinite(duration) || duration <= 0 || started * 1000 > now) return fallback;
  const remaining = (started + duration) * 1000 - now;
  return remaining <= 0 ? 5000 : Math.min(60000, Math.max(5000, remaining + 2000));
}
