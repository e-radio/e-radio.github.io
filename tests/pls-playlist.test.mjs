import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePlsPlaylist } from '../src/lib/pls-playlist.mjs';

test('parses the Radio Fanos PLS example', () => {
  assert.deepEqual(parsePlsPlaylist('[playlist]\nNumberOfEntries=1\nFile1=http://s5.onweb.gr:8506/stream\nTitle1=Radio Fanos\nLength1=-1\nVersion=2'), [
    { index: 1, url: 'http://s5.onweb.gr:8506/stream', title: 'Radio Fanos', length: '-1' },
  ]);
});

test('sorts entries and rejects non-HTTP targets', () => {
  const playlist = '[playlist]\nTitle2=Second\nFile2=https://example.com/b\nFile1=javascript:alert(1)\nFile3=http://example.com/c';
  assert.deepEqual(parsePlsPlaylist(playlist).map(entry => entry.index), [2, 3]);
  assert.deepEqual(parsePlsPlaylist('File1=https://example.com/no-section'), []);
});
