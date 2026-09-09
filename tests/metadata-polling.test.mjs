import test from 'node:test';
import assert from 'node:assert/strict';
import { metadataPollDelay } from '../src/lib/metadata-polling.mjs';
const now = 1000000;
const payload = (duration, played_at = 990) => ({now_playing:{duration,played_at}});
test('AzuraCast schedules just after song end, capped at one minute', () => {
  assert.equal(metadataPollDelay('azuracast',payload(33),15000,now),25000);
  assert.equal(metadataPollDelay('azuracast',payload(300),15000,now),60000);
  assert.equal(metadataPollDelay('azuracast',payload(11),15000,now),5000);
});
test('expired tracks retry after five seconds', () => {
  assert.equal(metadataPollDelay('azuracast',payload(10),15000,now),5000);
  assert.equal(metadataPollDelay('azuracast',payload(5),15000,now),5000);
});
test('live shows, invalid timing and other providers retain the fallback interval', () => {
  for (const data of [null,{},payload(0),payload(-1),payload('30'),payload(30,0),payload(30,1010),payload(Infinity),{...payload(30),live:{is_live:true}}]) {
    assert.equal(metadataPollDelay('azuracast',data,15000,now),15000);
  }
  for (const server of ['icecast','radiojar','centovacast','shoutcast']) assert.equal(metadataPollDelay(server,payload(30),15000,now),15000);
});
