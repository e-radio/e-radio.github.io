import test from 'node:test';
import assert from 'node:assert/strict';
import { icecastTrack } from '../src/lib/icecast.mjs';

test('Icecast single source provides track, artist and zero listeners', () => {
  assert.deepEqual(icecastTrack({icestats:{source:{title:' Song ',artist:' Artist ',listeners:0}}}), {title:'Song',artist:'Artist',listeners:0});
  assert.equal(icecastTrack({icestats:{}}), null);
});
test('Icecast shared servers select the endpoint mount, including proxied endpoints', () => {
  const payload = {icestats:{source:[{listenurl:'http://radio.test/other',title:'Wrong'},{listenurl:'http://radio.test/live',yp_currently_playing:'Correct',listeners:12}]}};
  assert.equal(icecastTrack(payload,'https://radio.test/','https://r.jina.ai/http://radio.test/status-json.xsl?mount=%2Flive').title,'Correct');
  assert.equal(icecastTrack(payload,'https://radio.test/missing','https://radio.test/status-json.xsl'),null);
});
test('Icecast missing song does not substitute the station name', () => {
  assert.equal(icecastTrack({icestats:{source:{server_name:'Station'}}}).title,'');
});
