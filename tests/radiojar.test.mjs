import test from 'node:test';
import assert from 'node:assert/strict';
import { radiojarEndpoint, radiojarHasTrack, radiojarSong } from '../src/lib/radiojar.mjs';
test('Radiojar endpoint ignores audio query parameters and retains mount identity',()=>{
 assert.equal(radiojarEndpoint('https://stream.radiojar.com/abc123?nocache=1'),'https://www.radiojar.com/api/stations/abc123/now_playing/');
 assert.equal(radiojarEndpoint('https://stream.radiojar.com/pepper.m4a'),'https://www.radiojar.com/api/stations/pepper.m4a/now_playing/');
 assert.equal(radiojarEndpoint('https://other.example/abc123'),null);
 assert.equal(radiojarEndpoint('bad url'),null);
});
test('Only actual track titles qualify for saving a Radiojar endpoint',()=>{
 assert.ok(radiojarHasTrack({artist:'Artist',title:'Song',thumb:'https://example.com/art.jpg'}));
 assert.equal(Boolean(radiojarHasTrack({title:' '})),false);
 assert.equal(Boolean(radiojarHasTrack({error:'Not found'})),false);
 assert.equal(Boolean(radiojarHasTrack([{title:'Song'}])),false);
});

test('Radiojar Live Tracks maps artist, title and thumbnail without inventing missing fields',()=>{
 assert.deepEqual(radiojarSong({artist:' Artist ',title:' Song ',thumb:'https://example.com/cover.jpg'}),{artist:'Artist',title:'Song',art:'https://example.com/cover.jpg'});
 assert.deepEqual(radiojarSong({title:null,artist:123,thumb:''}),{title:'',artist:'',art:''});
 assert.equal(radiojarSong(null),null);
 assert.equal(radiojarSong([]),null);
});
