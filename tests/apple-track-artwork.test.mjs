import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppleTrackArtwork, hasTrackArtwork } from '../src/lib/apple-track-artwork.mjs';

const result = (artistName, trackName) => ({ artistName, trackName,
  artworkUrl100: 'https://is1-ssl.mzstatic.com/cover.jpg/100x100bb.jpg',
  trackViewUrl: 'https://music.apple.com/gr/album/example/123?i=456' });

test('requests one Apple result, uses the first artwork, and caches the lookup', async () => {
  let calls = 0;
  const lookup = createAppleTrackArtwork({ fetchImpl: async url => {
    calls++;
    assert.equal(new URL(url).searchParams.get('entity'), 'song');
    assert.equal(new URL(url).searchParams.get('limit'), '1');
    return { ok: true, json: async () => ({ results: [
      result('Concrete Blonde', 'Joey (Remastered)'),
    ] }) };
  } });
  const first = await lookup('CONCRETE BLONDE', 'JOEY');
  assert.equal(first?.artwork, 'https://is1-ssl.mzstatic.com/cover.jpg/512x512bb.jpg');
  assert.equal((await lookup('CONCRETE BLONDE', 'JOEY'))?.url, first.url);
  assert.equal(calls, 1);
});

test('takes the first Apple result without comparing artist or title', async () => {
  const lookup = createAppleTrackArtwork({ fetchImpl: async () => ({ ok: true,
    json: async () => ({ results: [result('Other Artist', 'Believe')] }) }) });
  assert.equal((await lookup('DIMITRIS NIKOPOULOS', 'BELIEVE'))?.artwork,
    'https://is1-ssl.mzstatic.com/cover.jpg/512x512bb.jpg');
});

test('does not use a missing image or a station placeholder', async () => {
  const lookup = createAppleTrackArtwork({ fetchImpl: async () => ({ ok: true,
    json: async () => ({ results: [{ ...result('Artist', 'Song'), artworkUrl100: null }] }) }) });
  assert.equal(await lookup('Artist', 'Song'), null);
  assert.equal(hasTrackArtwork('https://solid1.streamupsolutions.com/static/jkzjmwru/covers/nocover.png'), false);
  assert.equal(hasTrackArtwork('https://example.com/cover.jpg'), true);
});
