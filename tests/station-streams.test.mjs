import test from 'node:test';
import assert from 'node:assert/strict';
import { stationStreams, replaceStream } from '../src/lib/station-streams.mjs';

test('legacy stations retain their default stream', () => {
  const streams = stationStreams({stream_url:'https://radio/high', bitrate:256, codec:'MP3'});
  assert.equal(streams.length, 1);
  assert.equal(streams[0].quality, '256 kbps · MP3');
});
test('qualities are deduplicated and the default is preserved', () => {
  const streams = stationStreams({stream_url:'https://radio/high', streams:[
    {id:'low', url:'https://radio/low', bitrate:64, codec:'AAC'},
    {id:'duplicate', url:'https://radio/low'},
  ]});
  assert.deepEqual(streams.map(s => s.url), ['https://radio/high', 'https://radio/low']);
});
for (const [paused, requested, expected] of [[true,false,false],[false,false,true],[true,true,true]]) {
  test(`switch preserves playback intent: paused=${paused}, requested=${requested}`, () => {
    const calls = [];
    const audio = {paused, src:'old', pause(){calls.push('pause');this.paused=true;}, load(){calls.push('load');}};
    assert.equal(replaceStream(audio,'new',requested), expected);
    assert.equal(audio.src,'new');
    assert.deepEqual(calls,['pause','load']);
  });
}
