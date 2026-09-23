import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMetadata, parseHistory, decodeMetadata, decodeProviderMetadata, supportsNowPlaying, isLiveTrackStation, scraperFor } from '../src/lib/metadata/index.mjs';
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

test('Shoutcast panel response provides artwork, listeners and deduplicated history', () => {
 const raw={nowplaying:'Artist - Current',coverart:'https://img.example/art.jpg',connections:0,trackhistory:['Artist - Current','Artist - Previous']};
 const result=parseMetadata('shoutcast',raw,context);
 assert.equal(result.text,raw.nowplaying);assert.equal(result.song.art,raw.coverart);assert.equal(result.listeners,0);
 assert.equal(result.payload.song_history.length,1);
 assert.equal(parseHistory('shoutcast',JSON.stringify(raw)).song_history[0].song.text,'Artist - Previous');
});

test('Live Tracks eligibility follows registered now-playing capability', () => {
 for(const metadata_server of ['azuracast','centovacast','shoutcast','icecast','radiojar','radio.co','otvoreni','gamerzinn']) {
  assert.equal(supportsNowPlaying(metadata_server),true);
  assert.equal(isLiveTrackStation({metadata_server,stream_url:'https://radio.test/stream',nowplaying_url:'https://radio.test/status'}),true);
 }
 for(const metadata_server of ['unknown','unsupported','toString',undefined]) assert.equal(supportsNowPlaying(metadata_server),false);
 const station={metadata_server:'radio.co',stream_url:'https://radio.test/stream',nowplaying_url:'https://radio.test/status'};
 for(const field of ['stream_url','nowplaying_url']) for(const value of ['', ' ', null, undefined]) assert.equal(isLiveTrackStation({...station,[field]:value}),false);
 assert.equal(isLiveTrackStation(null),false);
});

test('Shoutcast separates artist and title for Live Tracks and station pages', () => {
 const result=parseMetadata('shoutcast',{songtitle:'Merlin - Kad ti dodjem nesreco'},context);
 assert.equal(result.song.artist,'Merlin');assert.equal(result.song.title,'Kad ti dodjem nesreco');
 assert.equal(result.payload.now_playing.song.artist,'Merlin');
 assert.equal(result.text,'Merlin - Kad ti dodjem nesreco');
 const hyphen=parseMetadata('shoutcast',{songtitle:'Jay-Z - Song - Live'},context);
 assert.equal(hyphen.song.artist,'Jay-Z');assert.equal(hyphen.song.title,'Song - Live');
 assert.equal(parseMetadata('shoutcast',{songtitle:'Instrumental'},context).song.title,'Instrumental');
});

test('Bauer separates current fields and keeps delayed history from replacing the song', () => {
 const raw={TrackTitle:'They Don’t Care About Us',ArtistName:'Michael Jackson',ImageUrl:'https://images.example/mj.jpg',EventStart:'2026-09-16 00:48:38'};
 const current=parseMetadata('bauer',decodeProviderMetadata('bauer',`Markdown Content:\n${JSON.stringify(raw)}`),context);
 assert.equal(current.song.artist,raw.ArtistName);
 assert.equal(current.song.title,raw.TrackTitle);
 assert.equal(current.song.art,raw.ImageUrl);
 assert.equal(current.payload.now_playing.played_at,undefined);
 const result=parseHistory('bauer',JSON.stringify([{nowPlayingTrack:'På Måndag',nowPlayingArtist:'Miss Li',nowPlayingSmallImage:'https://images.example/previous.jpg',nowPlayingTime:'2026-09-15 23:53:09'},null,{}]));
 assert.equal(result.now_playing,undefined);
 assert.equal(result.song_history.length,1);
 assert.equal(result.song_history[0].song.artist,'Miss Li');
 assert.equal(result.song_history[0].song.title,'På Måndag');
 assert.equal(result.song_history[0].song.art,'https://images.example/previous.jpg');
 assert.equal(parseMetadata('bauer',null,context).text,null);
 assert.deepEqual(parseHistory('bauer','{}').song_history,[]);
 assert.equal(isLiveTrackStation({metadata_server:'bauer',stream_url:'https://radio.test/stream',nowplaying_url:'https://listenapi.planetradio.co.uk/api9.2/nowplaying/mme'}),true);
});

test('Jolene Country Radio selects its own track and artwork from the shared feed', () => {
 const payload={playing:'Wrong channel',stations:{jolene:'Wrong channel','jolene-country-radio':'Country Artist - Country Song'},extended:{'jolene-country-radio':{artist:'Country Artist',title:'Country Song',album_art:{480:'https://example.com/cover.jpg'}},jolene:{artist:'Wrong',title:'Channel'}}};
 const result=parseMetadata('jolene',payload);
 assert.equal(result.text,'Country Artist – Country Song');
 assert.equal(result.song.art,'https://example.com/cover.jpg');
 assert.equal(supportsNowPlaying('jolene'),true);
 assert.deepEqual(result.payload.song_history,[]);
 assert.equal(parseMetadata('jolene',{stations:payload.stations}).text,'Country Artist - Country Song');
 assert.equal(parseMetadata('jolene',{playing:'Wrong channel',extended:{jolene:{title:'Wrong'}}}).text,null);
});
