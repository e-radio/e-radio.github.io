// CentovaCast recenttracks.get wraps its track list in data[0].
export function centovaHistoryTracks(payload) {
  if (payload?.type !== 'result' || !Array.isArray(payload?.data?.[0])) return [];
  return payload.data[0].filter(track =>
    track && typeof track.title === 'string' && track.title.trim() &&
    Number.isFinite(Number(track.time)) && Number(track.time) > 0
  ).map(track => ({
    song: {
      title: track.title.trim(),
      artist: typeof track.artist === 'string' ? track.artist : '',
      art: typeof track.image === 'string' ? track.image : null,
      album: typeof track.album === 'string' ? track.album : '',
    },
    played_at: Number(track.time),
  }));
}
