import { repairMetadataText } from '../../metadata-text.mjs';
import { centovaHistoryTracks } from '../../centovacast-history.mjs';
export function parse(payload) {
  const entry = payload?.type === 'result' ? payload.data?.[0] : null;
  const artist = repairMetadataText(entry?.track?.artist);
  const title = repairMetadataText(entry?.track?.title);
  const unknownArtist = typeof artist === 'string' && artist.trim().toLowerCase() === 'unknown';
  const image = entry?.track?.imageurl || entry?.track?.image;
  const noCover = typeof image === 'string' && /(?:^|\/)nocover\.[a-z0-9]+(?:[?#]|$)/iu.test(image);
  return { song: entry && { ...entry.track, artist: unknownArtist ? '' : artist,
    title, album: repairMetadataText(entry.track?.album),
    text: unknownArtist ? title : repairMetadataText(entry.song || entry.summary?.replace(/<[^>]+>/g, '').trim()),
    imageurl: noCover ? null : entry.track?.imageurl,
    image: noCover ? null : entry.track?.image,
    art: noCover ? null : image },
    listeners: entry?.listeners ?? entry?.listenertotal, playedAt: entry?.track?.started };
}
export const history = payload => ({ song_history: centovaHistoryTracks(payload) });
