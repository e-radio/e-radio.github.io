import test from 'node:test';
import assert from 'node:assert/strict';
import { faviconUrl, downloadFavicon } from '../tools/lib/favicon-download.mjs';
test('favicon URL validation rejects malformed URLs and unsupported schemes',()=>{
 for(const url of ['not a url','file:///tmp/image.png','https://user:password@host.test/a']) assert.throws(()=>faviconUrl(url));
 assert.equal(faviconUrl('https://host.test/image'), 'https://host.test/image');
});
test('permanent HTTP and non-image failures are not retried',async()=>{
 for(const response of [new Response('missing',{status:404}),new Response('<html/>',{headers:{'content-type':'text/html'}}),new Response('',{headers:{'content-type':'image/png'}})]) {
  let calls=0;
  await assert.rejects(downloadFavicon('https://host.test/image',{fetchImpl:async()=>{calls++;return response;},sleep:async()=>{}}));
  assert.equal(calls,1);
 }
});
test('temporary errors retry and extensionless binary downloads are accepted',async()=>{
 let calls=0;
 const result=await downloadFavicon('https://host.test/image',{fetchImpl:async()=>++calls===1?new Response('',{status:503}):new Response(new Uint8Array([1,2,3]),{headers:{'content-type':'application/octet-stream'}}),sleep:async()=>{}});
 assert.deepEqual([...result],[1,2,3]);assert.equal(calls,2);
});
test('oversized responses are rejected before reading',async()=>{
 await assert.rejects(downloadFavicon('https://host.test/image',{fetchImpl:async()=>new Response('x',{headers:{'content-type':'image/png','content-length':'11000000'}})}),/10 MB/);
});
