import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMetadata, parseHistory, decodeMetadata, scraperFor } from '../src/lib/metadata/index.mjs';
const context = { streamUrl: 'https://relay.example/radio/8000/stream', endpoint: 'https://relay.example/status-json.xsl?mount=%2Fchosen' };
test('AzuraCast keeps current track, history, upcoming song and listener count', () => {
 const raw={now_playing:{song:{title:'Track',artist:'Artist',text:'Artist - Track',art:'https://images.example/cover.jpg'},played_at:100},listeners:{current:0},song_history:[{song:{title:'Earlier'}}],playing_next:{song:{title:'Next'}}};
 const result=parseMetadata('azuracast',raw,context);
 assert.equal(result.text,'Artist - Track');assert.equal(result.listeners,0);
 assert.equal(result.payload.playing_next.song.title,'Next');assert.equal(result.payload.song_history.length,1);
 assert.equal(result.payload.now_playing.played_at,100);
});
test('CentovaCast parses current song and wrapped recent tracks', () => {
 const result=parseMetadata('centovacast',{type:'result',data:[{song:'Artist - Track',track:{artist:'Artist',title:'Track',imageurl:'/cover.jpg'},listeners:12}]},context);
 assert.equal(result.song.title,'Track');assert.equal(result.song.art,'https://relay.example/cover.jpg');assert.equal(result.listeners,12);
 const history=parseHistory('centovacast',JSON.stringify({type:'result',data:[[{title:'Earlier',artist:'Singer',time:100}]]}));
 assert.equal(history.song_history[0].song.title,'Earlier');
});
test('Icecast chooses endpoint mount rather than a different station', () => {
 const payload={icestats:{source:[{listenurl:'http://host/other',title:'Wrong',listeners:9},{listenurl:'http://host/chosen',title:'Right',listeners:2}]}};
 assert.equal(parseMetadata('icecast',payload,context).text,'Right');
 assert.equal(parseMetadata('icecast',payload,context).listeners,2);
 assert.equal(parseMetadata('icecast',payload,{...context,endpoint:'https://relay.example/status-json.xsl?mount=/missing'}).text,null);
});
test('Icecast splits combined track fields into artist and title', () => {
 for (const field of ['title', 'yp_currently_playing', 'songtitle']) {
  const result = parseMetadata('icecast', {icestats:{source:{[field]:' Selena Gomez - Love On ',listeners:0}}}, context);
  assert.equal(result.song.artist, 'Selena Gomez');
  assert.equal(result.song.title, 'Love On');
  assert.equal(result.payload.now_playing.song.artist, 'Selena Gomez');
  assert.equal(result.listeners, 0);
 }
});
test('Icecast preserves hyphenated names, title suffixes and explicit artists', () => {
 const parse = source => parseMetadata('icecast', {icestats:{source}}, context).song;
 assert.equal(parse({title:'Jay-Z - Song - Live'}).artist, 'Jay-Z');
 assert.equal(parse({title:'Jay-Z - Song - Live'}).title, 'Song - Live');
 assert.equal(parse({title:'Love On',artist:'Selena Gomez'}).title, 'Love On');
 assert.equal(parse({title:'Selena Gomez - Love On',artist:'Selena Gomez'}).title, 'Love On');
 assert.equal(parse({title:'Song - Live',artist:'Singer'}).title, 'Song - Live');
 assert.equal(parse({title:'Title-Only'}).artist, '');
 assert.equal(parse({title:' ',yp_currently_playing:'Selena Gomez - Love On'}).title, 'Love On');
});
test('Shoutcast uses songtitle, never the station title', () => {
 assert.equal(parseMetadata('shoutcast',{title:'Station name',songtitle:'Actual song'},context).text,'Actual song');
 const payload=parseHistory('shoutcast',JSON.stringify([{title:'Current',playedat:200},{title:'Previous',playedat:100}]));
 assert.equal(payload.now_playing.song.text,'Current');assert.equal(payload.song_history[0].song.text,'Previous');
});
test('Radiojar and Radio.co have independent adapters', () => {
 assert.equal(parseMetadata('radiojar',{title:'Track',artist:'Artist',thumb:'https://img.example/x'},context).song.art,'https://img.example/x');
 assert.equal(parseMetadata('radio.co',{current_track:{title:'Song',artist:'Artist'}},context).text,'Artist – Song');
 assert.notEqual(scraperFor('radiojar'),scraperFor('radio.co'));
});
test('JSON and Jina wrappers share decoding, provider errors fail', () => {
 assert.deepEqual(decodeMetadata('Title: x\nMarkdown Content:\n{"songtitle":"Song"}'),{songtitle:'Song'});
 assert.throws(()=>decodeMetadata('{"type":"error"}'));
 assert.throws(()=>decodeMetadata('not metadata'));
 assert.equal(parseHistory('icecast','Current Song: A title').now_playing.song.text,'A title');
});
test('Missing data and unknown providers degrade without inventing a song', () => {
 for(const server of ['azuracast','centovacast','icecast','shoutcast','radiojar','radio.co','other'])assert.equal(parseMetadata(server,{},context).text,null);
 assert.equal(parseMetadata('other',{song:'Fallback track'},context).text,'Fallback track');
});

test('Otvoreni maps current artist/title and lastTen without inventing timezone offsets', () => {
 const raw={artist:'SONGKILLERS',title:'SUPERMAN',lastTen:[{artist:'TOMA',title:'BUDALA JA',starttime:'2026-09-14 02:13:16'}]};
 const result=parseMetadata('otvoreni',raw,context);
 assert.equal(result.song.artist,'SONGKILLERS');
 assert.equal(result.song.title,'SUPERMAN');
 assert.deepEqual(result.payload.song_history,[{song:{artist:'TOMA',title:'BUDALA JA'}}]);
 assert.equal(parseHistory('otvoreni',JSON.stringify(raw)).song_history.length,1);
 assert.equal(parseMetadata('otvoreni',{},context).text,null);
});
