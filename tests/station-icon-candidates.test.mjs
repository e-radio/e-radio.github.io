import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {discoverIconCandidates, manifestIconCandidates, inspectIcon, normalizeIcon} from '../tools/lib/station-icon-candidates.mjs';

test('discovers additional logo sources and resolves relative URLs', () => {
  const result=discoverIconCandidates(`<link rel="manifest" href="app/site.webmanifest">
  <script type="application/ld+json">{"@graph":[{"logo":{"contentUrl":"/brand.svg"}}]}</script>
  <script type="application/ld+json">broken JSON</script>
  <header><img class="station-logo" data-src="/header.png?x=1&amp;y=2"><img src="/advert.png"></header>
  <meta name="twitter:image" content="/share.jpg"><link rel="icon" sizes="9999x9999" href="/tiny.png">`, 'https://radio.test/home/');
  assert.deepEqual(result.manifests,['https://radio.test/home/app/site.webmanifest']);
  for (const url of ['/brand.svg','/header.png?x=1&y=2','/share.jpg','/tiny.png']) assert.ok(result.candidates.some(c=>c.url===`https://radio.test${url}`));
  assert.ok(!result.candidates.some(c=>c.url.includes('advert')));
  assert.equal(result.candidates.find(c=>c.url.endsWith('tiny.png')).score,4);
  assert.equal(manifestIconCandidates({icons:[{src:'icons/icon.png'},{src:'javascript:alert(1)'}]},'https://radio.test/app/site.webmanifest')[0].url,'https://radio.test/app/icons/icon.png');
  assert.equal(manifestIconCandidates({icons:[]},'https://radio.test/').length,0);
});
test('prefers actual square and adequately sized images over tiny icons and banners',async()=>{
  const image=(width,height)=>sharp({create:{width,height,channels:4,background:'red'}}).png().toBuffer();
  const square=await inspectIcon(await image(256,256));
  const tiny=await inspectIcon(await image(16,16));
  const banner=await inspectIcon(await image(1200,200));
  assert.ok(square.quality>tiny.quality);
  assert.ok(square.quality>banner.quality);
  await assert.rejects(inspectIcon(Buffer.from('not an image')));
});
test('fits rectangular logos with transparent padding rather than cropping',async()=>{
  const input=await sharp({create:{width:400,height:100,channels:4,background:'red'}}).png().toBuffer();
  const output=await normalizeIcon(input);
  const {data,info}=await sharp(output).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width,256);assert.equal(info.height,256);
  assert.equal(data[3],0);
  for(const x of [0,255]) assert.equal(data[(128*256+x)*4+3],255);
});
