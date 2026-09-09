import test from 'node:test';
import assert from 'node:assert/strict';
import { radiojarEndpoint, radiojarHasTrack, radiojarSong, radiojarHistoryEndpoint, radiojarHistoryTracks } from '../src/lib/radiojar.mjs';
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

test('Radiojar history endpoint uses the matching station ID',()=>{
 assert.equal(radiojarHistoryEndpoint('https://www.radiojar.com/api/stations/abc/now_playing/'),'https://www.radiojar.com/api/stations/abc/tracks/');
 assert.equal(radiojarHistoryEndpoint('https://other.example/api/stations/abc/now_playing/'),null);
});
test('Radiojar history parses UTC times, sorts newest first, and excludes unfinished or invalid tracks',()=>{
 const now=Date.parse('2026-09-09T14:00:00Z');
 const tracks=radiojarHistoryTracks([
  {track:'Older',artist:'Artist',tm:'2026-09-09T13:00:00',tm_end:'2026-09-09T13:04:00'},
  {track:'Now playing',tm:'2026-09-09T13:59:00',tm_end:'2026-09-09T14:03:00'},
  {track:'Newest',tm:'2026-09-09T15:50:00+02:00',tm_end:'2026-09-09T15:55:00+02:00',thumb:'https://example.com/art'},
  {track:' ',tm:'2026-09-09T13:00:00'}, {track:'Bad date',tm:'invalid'}
 ],now);
 assert.deepEqual(tracks.map(t=>t.song.title),['Newest','Older']);
 assert.equal(tracks[1].played_at,Date.parse('2026-09-09T13:00:00Z')/1000);
 assert.equal(tracks[0].song.art,'https://example.com/art');
 assert.deepEqual(radiojarHistoryTracks({error:'unavailable'}),[]);
});
