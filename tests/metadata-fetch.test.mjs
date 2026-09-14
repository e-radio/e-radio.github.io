import test from 'node:test';
import assert from 'node:assert/strict';
import { createMetadataFetcher } from '../src/lib/metadata-fetch.mjs';
const endpoint = 'https://r.jina.ai/http://radio.test/status';
test('invalid Jina body falls back and remembers direct endpoint', async () => {
 const calls = [];
 const client = createMetadataFetcher({fetchImpl: async url => {
  calls.push(url); return {ok:true,text:async()=>url===endpoint?'invalid':'{"title":"Song"}'};
 }});
 assert.deepEqual(await client.request(endpoint, JSON.parse), {title:'Song'});
 await client.request(endpoint, JSON.parse);
 assert.deepEqual(calls,[endpoint,'http://radio.test/status','http://radio.test/status']);
});
test('HTTP and network failures stop requests until a new page client', async () => {
 const calls=[];
 const client=createMetadataFetcher({fetchImpl:async url=>{
  calls.push(url); if(url===endpoint)return {ok:false,status:500}; throw new TypeError('Failed to fetch');
 }});
 await assert.rejects(client.request(endpoint,JSON.parse));
 await assert.rejects(client.request(endpoint,JSON.parse));
 assert.equal(client.isBlocked(endpoint),true);
 assert.deepEqual(calls,[endpoint,'http://radio.test/status','https://a.tunzilla.com/http://radio.test/status']);
});
test('successful proxy keeps normal polling without direct requests', async () => {
 let calls=0;
 const client=createMetadataFetcher({fetchImpl:async()=>{calls++;return {ok:true,text:async()=>'{}'};}});
 await client.request(endpoint,JSON.parse);await client.request(endpoint,JSON.parse);
 assert.equal(calls,2);assert.equal(client.isBlocked(endpoint),false);
});

test('Tunzilla is third fallback and is reused after success', async () => {
 const calls=[];
 const proxy='https://a.tunzilla.com/http://radio.test/status';
 const client=createMetadataFetcher({fetchImpl:async url=>{
  calls.push(url);
  if(url!==proxy) throw new TypeError('Failed to fetch');
  return {ok:true,text:async()=>'{}'};
 }});
 await client.request(endpoint,JSON.parse);
 await client.request(endpoint,JSON.parse);
 assert.deepEqual(calls,[endpoint,'http://radio.test/status',proxy,proxy]);
 assert.equal(client.isBlocked(endpoint),false);
});
test('direct endpoints fall back to Tunzilla without wrapping another proxy', async () => {
 const calls=[];
 const client=createMetadataFetcher({fetchImpl:async url=>{
  calls.push(url); return {ok:false,status:502};
 }});
 await assert.rejects(client.request('http://radio.test/status',JSON.parse));
 assert.deepEqual(calls,['http://radio.test/status','https://a.tunzilla.com/http://radio.test/status']);
});
