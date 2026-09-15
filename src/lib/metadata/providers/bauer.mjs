// Bauer Listen API: /nowplaying/{code} and /events/{code}/now/{limit}.
const song = track => ({
  artist: track?.ArtistName ?? track?.nowPlayingArtist,
  title: track?.TrackTitle ?? track?.nowPlayingTrack,
  art: track?.ImageUrl || track?.ImageUrlSmall || track?.nowPlayingImage || track?.nowPlayingSmallImage,
});

export function parse(payload) {
  return { song: song(payload) };
}

export function history(payload) {
  // Events may lag the current-song endpoint. Never replace now playing with
  // the first history entry. Unzoned timestamps must not become viewer-local dates.
  return { song_history: (Array.isArray(payload) ? payload : [])
    .filter(track => track && (track.nowPlayingTrack || track.nowPlayingArtist))
    .map(track => ({ song: song(track) })) };
}
