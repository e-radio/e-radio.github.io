import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mergeStations } from '../tools/fetch-greece-stations.mjs';
const station = {
  slug:'radio', stationuuid:'primary', city:null, stream_url:'https://radio/high', bitrate:320, codec:'AAC',
  alternate_stationuuids:['former'], aliases:['old-radio'], nowplaying_url:'https://radio/api',
  streams:[{url:'https://radio/high', bitrate:320}, {url:'https://radio/flac', codec:'FLAC', alternate_urls:['https://radio/old-flac']}]
};
test('merged UUIDs cannot recreate pages or overwrite consolidated metadata even with changed URLs', () => {
  for (const remotes of [
    [{stationuuid:'former',stream_url:'https://new/changed',bitrate:128,codec:'OGG'}, {stationuuid:'primary',bitrate:64}],
    [{stationuuid:'primary',bitrate:64}, {stationuuid:'former',stream_url:'https://new/changed',bitrate:128,codec:'OGG'}],
  ]) {
    const result=mergeStations([station],remotes);
    assert.deepEqual(result.merged,[station]);
    assert.equal(result.automaticallyAddedStations.length,0);
    assert.equal(result.recognizedMergedStations.length,2);
    assert.equal(result.missingFromApi.length,0);
  }
});
test('new UUIDs matching alternative qualities or stream aliases are rejected', () => {
  const result=mergeStations([station],[{stationuuid:'new1',stream_url:'https://radio/flac'},{stationuuid:'new2',stream_url:'https://radio/old-flac'}]);
  assert.deepEqual(result.merged,[station]);
  assert.equal(result.rejectedDuplicateStreams.length,2);
});
test('ordinary updates and genuinely new stations still import', () => {
  const result=mergeStations([{slug:'normal',stationuuid:'normal',stream_url:'https://normal',bitrate:64}],
    [{stationuuid:'normal',stream_url:'https://normal',bitrate:128},{stationuuid:'new',slug:'new',stream_url:'https://new'}]);
  assert.equal(result.merged.length,2);
  assert.equal(result.merged[0].bitrate,128);
  assert.equal(result.automaticallyAddedStations.length,1);
});
test('ambiguous merged UUID ownership fails before writing', () => {
  assert.throws(() => mergeStations([station,{stationuuid:'former',stream_url:'https://other'}],[]), /more than one/);
});
test('all actual consolidated stations survive repeated imports of their original UUIDs', () => {
  const locals=JSON.parse(readFileSync(new URL('../src/data/stations-gr.json',import.meta.url)));
  const consolidated=locals.filter(s => s.alternate_stationuuids?.length);
  assert.ok(consolidated.length > 0);
  const remote=consolidated.flatMap(s => [s.stationuuid,...s.alternate_stationuuids].map(uuid => ({stationuuid:uuid,stream_url:`https://changed.example/${uuid}`,bitrate:1,codec:'UNKNOWN'})));
  const first=mergeStations(locals,remote);
  const second=mergeStations(first.merged,remote);
  assert.equal(first.automaticallyAddedStations.length,0);
  assert.equal(second.automaticallyAddedStations.length,0);
  assert.deepEqual(second.merged,first.merged);
  for (const s of consolidated) assert.deepEqual(first.merged.find(x => x.stationuuid===s.stationuuid),s);
});

 test('unavailable stream URLs cannot recreate merged stations under a new UUID', () => {
  const local={...station,unavailable_streams:[{url:'https://radio/retired'}]};
  const result=mergeStations([local],[{stationuuid:'new-retired',stream_url:'https://radio/retired'}]);
  assert.deepEqual(result.merged,[local]);
  assert.equal(result.rejectedDuplicateStreams.length,1);
});

test('Greece exclusion blocks the requested UUID even when its stream changes', () => {
  const exclusions=JSON.parse(readFileSync(new URL('../countries/gr.excluded-stations.json',import.meta.url)));
  const uuid='e9af978d-8da9-48e1-a349-9f48ea2b3c7f';
  const remote={stationuuid:uuid,slug:'excluded',stream_url:'https://changed.example/stream'};
  const result=mergeStations([], [remote], exclusions);
  assert.deepEqual(result.merged,[]);
  assert.deepEqual(result.excludedStations,[remote]);
  assert.equal(result.automaticallyAddedStations.length,0);
  assert.deepEqual(mergeStations([remote],[remote],exclusions).merged,[]);
  assert.equal(mergeStations([],[remote],[]).merged.length,1);
});
