import test from 'node:test';
import assert from 'node:assert/strict';
import {endpointCandidates,checkEndpoint} from '../src/lib/endpoint-finder.mjs';
test('finder derives provider candidates and rejects unsafe inputs',()=>{
 assert.equal(endpointCandidates('https://a.tunzilla.com/http://radio.test:8000/stream').streamUrl,'http://radio.test:8000/stream');
 assert.equal(endpointCandidates('https://s3.radio.co/abc/listen').candidates[0].server,'radio.co');
 assert.match(endpointCandidates('https://host.test/listen/demo/stream').candidates[0].now,/api\/nowplaying\/demo$/);
 assert.throws(()=>endpointCandidates('javascript:alert(1)'));assert.throws(()=>endpointCandidates('https://user:pass@host.test/'));
});
test('finder rejects HTML and audio, then verifies a proxy without inventing history',async()=>{
 let calls=0;
 const result=await checkEndpoint({server:'shoutcast',now:'https://radio.test/stats',history:null},'https://radio.test/stream',new AbortController().signal,async()=>{
  calls++;return {ok:true,headers:new Headers({'content-type':calls===1?'audio/mpeg':'text/plain'}),body:{cancel:async()=>{}},text:async()=>calls===2?'<html>Error</html>':'{"songtitle":"Artist - Song"}'};
 });
 assert.equal(result.attempts.length,3);assert.equal(result.current.song.artist,'Artist');assert.match(result.config.nowplaying_url,/a.tunzilla.com/);assert.equal(result.config.history_url,undefined);
});
test('finder cancels before sending requests',async()=>{
 const control=new AbortController();control.abort();
 await assert.rejects(checkEndpoint({server:'icecast',now:'https://radio.test/status'},'',control.signal,()=>{throw Error('Must not fetch');}),{name:'AbortError'});
});

test('finder recognizes Bauer, Radiojar, sid and mount parameters',()=>{
 assert.equal(endpointCandidates('https://live-bauerse-fm.sharp-stream.com/mixmegapol_instream_se_aacp').candidates[0].server,'bauer');
 assert.equal(endpointCandidates('https://stream.radiojar.com/demo').candidates[0].now,'https://www.radiojar.com/api/stations/demo/now_playing/');
 const {candidates}=endpointCandidates('https://host.test/proxy/demo?sid=2&mp=chosen');
 assert.ok(candidates.some(c=>c.now==='https://host.test/stats?sid=2&json=1'));
 assert.ok(candidates.some(c=>c.now==='https://host.test/proxy/demo/status-json.xsl?mount=%2Fchosen'));
 assert.equal(new Set(candidates.map(c=>c.now)).size,candidates.length);
});
test('finder matches AzuraCast directory streams and excludes other stations',async()=>{
 const candidate=endpointCandidates('https://host.test/radio/8000/stream').candidates.find(c=>c.directory);
 const fetcher=async url=>url.endsWith('/demo')?new Response(JSON.stringify({now_playing:{song:{title:'Right'}},song_history:[{song:{title:'Previous'}}]})):new Response(JSON.stringify([{station:{shortcode:'wrong',listen_url:'https://host.test/other'},now_playing:{song:{title:'Wrong'}}},{station:{shortcode:'demo',mounts:[{url:'https://host.test/radio/8000/stream'}]},now_playing:{song:{title:'Right'}},song_history:[{song:{title:'Previous'}}]}]));
 const result=await checkEndpoint(candidate,'https://host.test/radio/8000/stream',new AbortController().signal,fetcher);
 assert.equal(result.current.song.title,'Right');
 assert.equal(result.config.nowplaying_url,'https://host.test/api/nowplaying/demo');
 assert.equal(result.config.history_url,result.config.nowplaying_url);
 const missing=await checkEndpoint(candidate,'https://host.test/missing',new AbortController().signal,fetcher);
 assert.equal(missing.config,null);
});
test('finder does not refetch a combined endpoint with empty history or accept listeners alone',async()=>{
 let calls=0;
 const candidate={server:'azuracast',now:'https://host.test/api',history:'https://host.test/api'};
 await checkEndpoint(candidate,'https://host.test/stream',new AbortController().signal,async()=>{calls++;return new Response(JSON.stringify({now_playing:{song:{title:'Song'}},song_history:[]}));});
 assert.equal(calls,1);
 const result=await checkEndpoint({server:'shoutcast',now:'https://host.test/stats'},'https://host.test/stream',new AbortController().signal,async()=>new Response('{"currentlisteners":10}'));
 assert.equal(result.config,null);
});
