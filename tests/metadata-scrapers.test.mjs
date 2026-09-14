import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMetadata, parseHistory, decodeMetadata, decodeProviderMetadata, scraperFor } from '../src/lib/metadata/index.mjs';
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

test('Icecast history supports dated HTML tables and proxy markdown', () => {
 const html='<TABLE><TR><TD>2026-09-14 13:59:29</TD><TD>ARTIST - SONG</TD><TD><B>CURRENT SONG</B></TD></TR><TR><TD>2026-09-14 13:57:13</TD><TD>TOM &amp; JANE - PREVIOUS</TD></TR></TABLE>';
 const result=parseHistory('icecast',html);
 assert.equal(result.now_playing.song.text,'ARTIST - SONG');
 assert.equal(result.song_history[0].text,'TOM & JANE - PREVIOUS');
 assert.equal(result.song_history[0].time,'13:57:13');
 assert.equal(parseHistory('icecast','Markdown Content:\n| 2026-09-14 13:59:29 | ARTIST - SONG |').now_playing.song.text,'ARTIST - SONG');
});

test('Gamerz Inn history maps artwork, artist and millisecond timestamps', () => {
 const raw={results:[{author:'Artist',title:'Song',ts:1789390269000,img_url:'https://img.example/art.jpg'},{author:'Earlier',title:'Track',ts:1789390014000}]};
 const result=parseMetadata('gamerzinn',raw,context);
 assert.equal(result.song.artist,'Artist');assert.equal(result.song.art,'https://img.example/art.jpg');
 assert.equal(result.payload.now_playing.played_at,1789390269);
 assert.equal(result.payload.song_history[0].song.title,'Track');
 assert.equal(parseHistory('gamerzinn',JSON.stringify(raw)).song_history.length,1);
 assert.equal(parseMetadata('gamerzinn',{},context).text,null);
});

test('Shoutcast v1 decodes HTML or Jina text and preserves commas in titles', () => {
 for(const text of ['<HTML><body>38,1,173,512,38,256,Artist - Song, Part 2</body></html>','Markdown Content:\n38,1,173,512,38,256,Artist - Song, Part 2']) {
  const result=parseMetadata('shoutcast',decodeProviderMetadata('shoutcast',text),context);
  assert.equal(result.text,'Artist - Song, Part 2');assert.equal(result.listeners,38);
 }
 assert.throws(()=>decodeProviderMetadata('shoutcast','<html>Invalid resource</html>'));
 const history=parseHistory('shoutcast','<tr><td>23:27:34</td><td>Artist - Current<td><b>Current Song</b></td></tr><tr><td>23:23:54</td><td>Artist - Previous</tr>');
 assert.equal(history.now_playing.song.text,'Artist - Current');
 assert.equal(history.song_history[0].text,'Artist - Previous');
});

test('Radio.co v2 current and history retain separate fields, art and timestamps', () => {
 const track={title:'Artist - Song',track_artist:'Artist',track_title:'Song',start_time:'2026-09-14T22:19:41+00:00',artwork_urls:{large:'https://img.example/art.jpg'}};
 const result=parseMetadata('radio.co',{data:track},context);
 assert.equal(result.song.artist,'Artist');assert.equal(result.song.title,'Song');assert.equal(result.song.art,track.artwork_urls.large);
 assert.equal(result.payload.now_playing.played_at,track.start_time);
 const history=parseHistory('radio.co',JSON.stringify({data:[track]}));
 assert.equal(history.song_history.length,1);assert.equal(history.now_playing,undefined);
});
