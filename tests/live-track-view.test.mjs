import test from 'node:test';
import assert from 'node:assert/strict';
import { updateTrackText, trackArtworkController } from '../src/lib/live-track-view.mjs';
test('unchanged text is untouched and changed text retains its node', () => {
  let writes=0;
  const node={nodeType:3,value:'Song',get nodeValue(){return this.value;},set nodeValue(v){writes++;this.value=v;}};
  const element={firstChild:node,childNodes:[node],get textContent(){return node.value;},set textContent(v){throw Error('Replaced text node');}};
  updateTrackText(element,'Song'); assert.equal(writes,0);
  updateTrackText(element,'Next song'); assert.equal(writes,1); assert.equal(node.value,'Next song');
});
test('empty fields can gain text and subsequently clear without replacing nodes', () => {
  const element={firstChild:null,childNodes:[],textContent:''};
  updateTrackText(element,'Artist'); assert.equal(element.textContent,'Artist');
  const node={nodeType:3,nodeValue:'Artist'};
  const populated={firstChild:node,childNodes:[node],get textContent(){return node.nodeValue;}};
  updateTrackText(populated,''); assert.equal(node.nodeValue,''); assert.equal(populated.firstChild,node);
});
test('failed artwork is not retried, while new artwork still loads', () => {
  const requests=[]; let error;
  const image={value:'https://site.test/logo.webp',get src(){return this.value;},set src(v){this.value=v;requests.push(v);},addEventListener(name,fn){error=fn;}};
  const update=trackArtworkController(image,'/logo.webp','https://site.test/live-tracks/');
  assert.equal(update(undefined),true); assert.equal(requests.length,0);
  assert.equal(update('https://art.test/broken.jpg'),false); error();
  assert.deepEqual(requests,['https://art.test/broken.jpg','https://site.test/logo.webp']);
  assert.equal(update('https://art.test/broken.jpg'),true); assert.equal(requests.length,2);
  update('https://art.test/new.jpg'); update('https://art.test/new.jpg'); assert.equal(requests.length,3);
  update('http://art.test/insecure.jpg'); assert.equal(image.src,'https://site.test/logo.webp');
  error(); update(undefined); assert.equal(requests.length,4);
});
