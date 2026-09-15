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
