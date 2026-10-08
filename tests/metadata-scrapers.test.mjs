import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMetadata, parseHistory, decodeMetadata, decodeProviderMetadata, supportsNowPlaying, isLiveTrackStation, scraperFor } from '../src/lib/metadata/index.mjs';
const context = { streamUrl: 'https://relay.example/radio/8000/stream', endpoint: 'https://relay.example/status-json.xsl?mount=%2Fchosen' };
test('Shoutcast current track and RadioPoint archive history work together', () => {
 const raw = {ok:true,items:[
  {artist:'Singer',title:'Current',played_ts:1791336248,cover:'https://covers.example/current.jpg',cover_source:'deezer'},
  {artist:'Earlier Singer',title:'Earlier',played_ts:1791336014,cover:'https://radiopoint.gr/placeholder.png',cover_source:'placeholder'},
 ]};
 const current = parseMetadata('shoutcast',decodeProviderMetadata('shoutcast','Title: \n\nMarkdown Content:\n6,1,32,200,6,128,United - Gillespie Oblique'),context);
 assert.equal(current.song.artist,'United');
 assert.equal(current.song.title,'Gillespie Oblique');
 const history = parseHistory('shoutcast',JSON.stringify(raw));
 assert.equal(history.song_history.length,2);
 assert.equal(history.song_history[0].song.artist,'Singer');
 assert.equal(history.song_history[0].song.art,'https://covers.example/current.jpg');
 assert.equal(history.song_history[1].song.art,'https://radiopoint.gr/placeholder.png');
 assert.equal(history.song_history[1].played_at,1791336014);
});
test('AzuraCast keeps current track, history, upcoming song and listener count', () => {
 const raw={now_playing:{song:{title:'Track',artist:'Artist',text:'Artist - Track',art:'https://images.example/cover.jpg'},played_at:100},listeners:{current:0},song_history:[{song:{title:'Earlier'}}],playing_next:{song:{title:'Next'}}};
 const result=parseMetadata('azuracast',raw,context);
 assert.equal(result.text,'Artist - Track');assert.equal(result.listeners,0);
 assert.equal(result.payload.playing_next.song.title,'Next');assert.equal(result.payload.song_history.length,1);
 assert.equal(result.payload.now_playing.played_at,100);
});
test('AzuraCast repairs Windows-1253 Greek song fields without changing normal tracks', () => {
 const broken = {artist:'ÌÐÅËËÏÕ ÓÙÔÇÑÉÁ',title:'ÈÁÑÈÅÉ ÌÉÁ ÌÅÑÁ ÍÁ ÐÏÍÁÓ',
  text:'ÌÐÅËËÏÕ ÓÙÔÇÑÉÁ - ÈÁÑÈÅÉ ÌÉÁ ÌÅÑÁ ÍÁ ÐÏÍÁÓ',art:'https://example.com/art.jpg'};
 const payload = {now_playing:{song:{title:'Κάτι Τέτοιες Ώρες',artist:'Tolis Voskopoulos'}},
  song_history:[{song:broken,played_at:100}],playing_next:{song:broken}};
 const parsed = parseMetadata('azuracast',payload,context);
 assert.equal(parsed.song.title,'Κάτι Τέτοιες Ώρες');
 assert.equal(parsed.payload.song_history[0].song.artist,'ΜΠΕΛΛΟΥ ΣΩΤΗΡΙΑ');
 assert.equal(parsed.payload.playing_next.song.title,'ΘΑΡΘΕΙ ΜΙΑ ΜΕΡΑ ΝΑ ΠΟΝΑΣ');
 assert.equal(parsed.payload.playing_next.song.art,broken.art);
 assert.equal(parseHistory('azuracast',JSON.stringify(payload)).song_history[0].song.title,'ΘΑΡΘΕΙ ΜΙΑ ΜΕΡΑ ΝΑ ΠΟΝΑΣ');
 assert.equal(broken.artist,'ÌÐÅËËÏÕ ÓÙÔÇÑÉÁ');
});
test('CentovaCast parses current song and wrapped recent tracks', () => {
 const result=parseMetadata('centovacast',{type:'result',data:[{song:'Artist - Track',track:{artist:'Artist',title:'Track',imageurl:'/cover.jpg'},listeners:12}]},context);
 assert.equal(result.song.title,'Track');assert.equal(result.song.art,'https://relay.example/cover.jpg');assert.equal(result.listeners,12);
 const history=parseHistory('centovacast',JSON.stringify({type:'result',data:[[{title:'Earlier',artist:'Singer',time:100}]]}));
 assert.equal(history.song_history[0].song.title,'Earlier');
});
test('CentovaCast omits Unknown artist and nocover placeholder from station promos', () => {
 const payload={type:'result',data:[{song:'Unknown - Station promo',track:{artist:'Unknown',title:'Station promo',imageurl:'https://radio.example/covers/nocover.png'},listeners:2}]};
 const result=parseMetadata('centovacast',payload,context);
 assert.equal(result.text,'Station promo');
 assert.equal(result.song.artist,'');
 assert.equal(result.song.art,null);
 assert.equal(result.listeners,2);
});
test('Icecast chooses endpoint mount rather than a different station', () => {
 const payload={icestats:{source:[{listenurl:'http://host/other',title:'Wrong',listeners:9},{listenurl:'http://host/chosen',title:'Right',listeners:2}]}};
 assert.equal(parseMetadata('icecast',payload,context).text,'Right');
 assert.equal(parseMetadata('icecast',payload,context).listeners,2);
 assert.equal(parseMetadata('icecast',payload,{...context,endpoint:'https://relay.example/status-json.xsl?mount=/missing'}).text,null);
});
test('Icecast extracts Jazler song and artist from embedded XML', () => {
 const xml = '<?xml version="1.0"?><Schedule System="Jazler"><Event eventType="song"><Song title="CAN`T TAKE MY EYES (acoustic)"><Artist name="SAGI REI"/></Song></Event></Schedule>';
 const payload = {icestats:{source:{title:xml,listeners:9}}};
 const song = parseMetadata('icecast',payload,context);
 assert.equal(song.song.title,'CAN`T TAKE MY EYES (acoustic)');
 assert.equal(song.song.artist,'SAGI REI');
 assert.equal(song.text,'SAGI REI – CAN`T TAKE MY EYES (acoustic)');
 const escaped = xml.replace('CAN`T TAKE MY EYES (acoustic)', 'ROCK &amp; ROLL &#39;LIVE&#39;');
 assert.equal(parseMetadata('icecast',{icestats:{source:{title:escaped}}},context).song.title,"ROCK & ROLL 'LIVE'");
 assert.equal(parseMetadata('icecast',{icestats:{source:{title:'<Schedule System="Jazler">broken'}}},context).text,null);
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
test('Leading broadcast labels are removed across providers and track lists', () => {
 const icecast = parseMetadata('icecast', {icestats:{source:{
  title:'Now Playing: HARRY STYLES - AMERICAN GIRLS',listeners:4,
 }}}, context);
 assert.equal(icecast.song.artist,'HARRY STYLES');
 assert.equal(icecast.song.title,'AMERICAN GIRLS');
 assert.equal(icecast.text,'HARRY STYLES – AMERICAN GIRLS');
 const pulsar = parseMetadata('icecast', {icestats:{source:{
  title:'PULSAR Radio - Now On Air:Bob Margolin - The Same Thing',
 }}}, context);
 assert.equal(pulsar.song.artist,'Bob Margolin');
 assert.equal(pulsar.song.title,'The Same Thing');
 const playing = parseMetadata('icecast', {icestats:{source:{title:'Playing: Singer - Song'}}}, context);
 assert.equal(playing.song.artist,'Singer');
 assert.equal(playing.song.title,'Song');
 const azura = parseMetadata('azuracast', {
  now_playing:{song:{artist:'Now Playing: Singer',title:'Now Playing: Song',text:'Now Playing: Singer - Song'}},
  song_history:[{song:{artist:'Now Playing: Previous',title:'Older'}}],
  playing_next:{song:{title:'Now Playing: Next'}},
  queue:[{song:{title:'Now Playing: Later'}}],
 }, context);
 assert.equal(azura.song.artist,'Singer');
 assert.equal(azura.song.title,'Song');
 assert.equal(azura.text,'Singer - Song');
 assert.equal(azura.payload.song_history[0].song.artist,'Previous');
 assert.equal(azura.payload.playing_next.song.title,'Next');
 const history = parseHistory('azuracast', JSON.stringify({
  now_playing:{song:{title:'Now Playing: Current'}},
  song_history:[{song:{text:'Playing: Earlier'}}],
  playing_next:{song:{title:'Now Playing: Next'}},
 }));
 assert.equal(history.now_playing.song.title,'Current');
 assert.equal(history.song_history[0].song.text,'Earlier');
 assert.equal(history.playing_next.song.title,'Next');
 assert.equal(parseMetadata('radio.co',{current_track:{title:'Artist - Now Playing: Love',artist:'Singer'}},context).song.title,'Artist - Now Playing: Love');
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
test('Icecast repairs Greek titles misdecoded as Latin-1', () => {
 const track = 'ΓΙΩΡΓΟΣ ΓΙΑΝΝΙΑΣ - ΔΩΣ ΜΟΥ ΠΙΣΩ ΤΗΝ ΚΑΡΔΙΑ ΜΟΥ';
 const broken = Buffer.from(track, 'utf8').toString('latin1');
 const result = parseMetadata('icecast', {icestats:{source:{title:broken}}}, context);
 assert.equal(result.song.artist, 'ΓΙΩΡΓΟΣ ΓΙΑΝΝΙΑΣ');
 assert.equal(result.song.title, 'ΔΩΣ ΜΟΥ ΠΙΣΩ ΤΗΝ ΚΑΡΔΙΑ ΜΟΥ');
 assert.equal(result.text, 'ΓΙΩΡΓΟΣ ΓΙΑΝΝΙΑΣ – ΔΩΣ ΜΟΥ ΠΙΣΩ ΤΗΝ ΚΑΡΔΙΑ ΜΟΥ');
});
test('Shoutcast uses songtitle, never the station title', () => {
 assert.equal(parseMetadata('shoutcast',{title:'Station name',songtitle:'Actual song'},context).text,'Actual song');
 const payload=parseHistory('shoutcast',JSON.stringify([{title:'Current',playedat:200},{title:'Previous',playedat:100}]));
 assert.equal(payload.now_playing.song.text,'Current');assert.equal(payload.song_history[0].song.text,'Previous');
});
test('Shoutcast removes repeated Now On Air labels from current and past songs', () => {
 const current = parseMetadata('shoutcast',{songtitle:'Now On Air: Now On Air: PRESTIGE - POTE'},context);
 assert.equal(current.song.artist,'PRESTIGE');
 assert.equal(current.song.title,'POTE');
 assert.equal(current.text,'PRESTIGE - POTE');
 const history = parseHistory('shoutcast',JSON.stringify([
  {title:'Now On Air: PRESTIGE - POTE',playedat:200},
  {title:'Now On Air: OIKONOMOPOYLOS NIKOS - TORA TI NA TO KANO',playedat:100}
 ]));
 assert.equal(history.now_playing.song.text,'PRESTIGE - POTE');
 assert.equal(history.song_history[0].song.artist,'OIKONOMOPOYLOS NIKOS');
 const heaven = parseMetadata('shoutcast',{songtitle:'Now On Air:Eddie Amador - House Music (Full Intention Mix)'},context);
 assert.equal(heaven.song.artist,'Eddie Amador');
 assert.equal(heaven.song.title,'House Music (Full Intention Mix)');
 const heavenHistory = parseHistory('shoutcast',JSON.stringify([
  {title:'Now On Air:Eddie Amador - House Music (Full Intention Mix)',playedat:200},
  {title:"Now On Air:Lil' Mo' Yin Yang - Reach (Little More Mix)",playedat:100},
 ]));
 assert.equal(heavenHistory.song_history[0].song.artist,"Lil' Mo' Yin Yang");
 assert.equal(heavenHistory.song_history[0].song.title,'Reach (Little More Mix)');
});
test('Shoutcast removes trailing catalog IDs from current and past songs', () => {
 const current = parseMetadata('shoutcast',{songtitle:'Alexander Rybak - Fairytale [2KGU]'},context);
 assert.equal(current.song.artist,'Alexander Rybak');
 assert.equal(current.song.title,'Fairytale');
 assert.equal(current.text,'Alexander Rybak - Fairytale');
 const history = parseHistory('shoutcast',JSON.stringify([
  {title:'Alexander Rybak - Fairytale [2KGU]',playedat:200},
  {title:'Artist - Song [2KGU]',playedat:100}
 ]));
 assert.equal(history.song_history[0].song.title,'Song');
 const blue = parseMetadata('shoutcast',{songtitle:'Freeky Cleen and Dickey F - Anyway [VUG]'},context);
 assert.equal(blue.song.title,'Anyway');
 const blueHistory = parseHistory('shoutcast',JSON.stringify([
  {title:'Freeky Cleen and Dickey F - Anyway [VUG]',playedat:200},
  {title:'Matt Andersen - Coal Mining Blues [W4e]',playedat:100}
 ]));
 assert.equal(blueHistory.song_history[0].song.title,'Coal Mining Blues');
 const freakout = parseMetadata('shoutcast',{songtitle:'The Ultra Electric Mega Galactic - Through the Dark Matter [tR]'},context);
 assert.equal(freakout.song.title,'Through the Dark Matter');
 const freakoutHistory = parseHistory('shoutcast',JSON.stringify([
  {title:'The Ultra Electric Mega Galactic - Through the Dark Matter [tR]',playedat:200},
  {title:'Riot Horse - Shine [td]',playedat:100},
 ]));
 assert.equal(freakoutHistory.song_history[0].song.title,'Shine');
 assert.equal(parseMetadata('shoutcast',{songtitle:'Artist - Song [u1]'},context).song.title,'Song');
 assert.equal(parseMetadata('shoutcast',{songtitle:'Artist - Song [Live]'},context).song.title,'Song [Live]');
 assert.equal(parseMetadata('shoutcast',{songtitle:'Artist - Song [UK]'},context).song.title,'Song [UK]');
});
test('Shoutcast repairs Windows-1253 Greek metadata in current song and history', () => {
 const raw = 'ÊÁÉ ÐÏÔÁÌÉ ÐÏÕ ÔÑÅ×ÅÉ ÔÏ ÄÁÊÑÕ ÌÏÕ - ÑÉÔÁ ÓÁÊÅËËÁÑÉÏÕ';
 const current = parseMetadata('shoutcast',{songtitle:raw},context);
 assert.equal(current.song.artist,'ΚΑΙ ΠΟΤΑΜΙ ΠΟΥ ΤΡΕΧΕΙ ΤΟ ΔΑΚΡΥ ΜΟΥ');
 assert.equal(current.song.title,'ΡΙΤΑ ΣΑΚΕΛΛΑΡΙΟΥ');
 const history = parseHistory('shoutcast',JSON.stringify([
  {title:raw,playedat:200},
  {title:raw,playedat:100},
 ]));
 assert.equal(history.song_history[0].song.artist,'ΚΑΙ ΠΟΤΑΜΙ ΠΟΥ ΤΡΕΧΕΙ ΤΟ ΔΑΚΡΥ ΜΟΥ');
 assert.equal(history.song_history[0].song.title,'ΡΙΤΑ ΣΑΚΕΛΛΑΡΙΟΥ');
 assert.equal(parseMetadata('shoutcast',{songtitle:'Beyoncé - Halo'},context).song.artist,'Beyoncé');
});
test('SonicPanel maps current song, artwork, listeners and numbered history without jingles', () => {
 const raw={title:'Prince - Purple Rain feat. The Revolution',art:'https://stream1.468.gr/cp/musiclibrary/now.png',listeners:'19',
  history:['1.) Prince - Purple Rain feat. The Revolution<br>','2.) Julee Cruise - Summer Kisses, Winter Tears<br>',
   '3.) JINGLE - STATION ID<br>','4.) Johnny Logan - Hold Me Now<br>']};
 const result=parseMetadata('sonicpanel',raw,context);
 assert.equal(result.song.artist,'Prince');
 assert.equal(result.song.title,'Purple Rain feat. The Revolution');
 assert.equal(result.song.art,raw.art);
 assert.equal(result.listeners,'19');
 assert.deepEqual(result.payload.song_history.map(entry=>entry.song.title),['Summer Kisses, Winter Tears','Hold Me Now']);
 const history=parseHistory('sonicpanel',JSON.stringify(raw));
 assert.equal(history.now_playing.song.title,'Purple Rain feat. The Revolution');
 assert.deepEqual(history.song_history,result.payload.song_history);
 assert.equal(supportsNowPlaying('sonicpanel'),true);
 assert.equal(parseMetadata('sonicpanel',{},context).text,null);
});
test('Radiojar and Radio.co have independent adapters', () => {
 assert.equal(parseMetadata('radiojar',{title:'Track',artist:'Artist',thumb:'https://img.example/x'},context).song.art,'https://img.example/x');
 assert.equal(parseMetadata('radio.co',{current_track:{title:'Song',artist:'Artist'}},context).text,'Artist – Song');
 assert.notEqual(scraperFor('radiojar'),scraperFor('radio.co'));
});
test('Ellinadiko parses its station feed and supplied artwork', () => {
 const result = parseMetadata('ellinadiko', {nowOnAir: {
  artist: 'Singer', title: 'Track', image: 'https://ellinadiko.eu/cover.jpg',
 }}, context);
 assert.equal(result.text, 'Singer – Track');
 assert.equal(result.song.art, 'https://ellinadiko.eu/cover.jpg');
 assert.equal(parseMetadata('ellinadiko', {}, context).text, null);
 assert.equal(supportsNowPlaying('ellinadiko'), true);
});
test('Cool FM separates the current track from the next song', () => {
 const result = parseMetadata('coolfm', {
  title: 'Remastered 2001 - Althea And Donna', artist: 'Uptown Top Ranking',
  art: 'CoolFm.png', next: 'Tiwayo: Rise Up And Shine', history: [],
 }, { endpoint: 'https://www.coolfm.gr/stream_metadata.php' });
 assert.equal(result.song.title, 'Remastered 2001 - Althea And Donna');
 assert.equal(result.song.artist, 'Uptown Top Ranking');
 assert.equal(result.song.art, 'https://www.coolfm.gr/CoolFm.png');
 assert.equal(result.payload.playing_next.song.artist, 'Tiwayo');
 assert.equal(result.payload.playing_next.song.title, 'Rise Up And Shine');
 assert.equal(parseMetadata('coolfm', {}, context).payload.playing_next, null);
});
test('Diesi parses its nested Greek now-playing response', () => {
 const result = parseMetadata('diesi', {data: {status: 'success', artist: 'ΜΠΟΦΙΛΙΟΥ Ν - ΧΑΡΟΥΛΗΣ Γ', song: 'ΚΟΙΤΑ ΕΓΩ'}}, context);
 assert.equal(result.song.artist, 'ΜΠΟΦΙΛΙΟΥ Ν - ΧΑΡΟΥΛΗΣ Γ');
 assert.equal(result.song.title, 'ΚΟΙΤΑ ΕΓΩ');
 assert.equal(parseMetadata('diesi', {data: {status: 'error', song: 'Stale'}}, context).text, null);
});
test('Rcast parses plain text and Jina-wrapped now-playing responses', () => {
 const raw = 'Bryan Adams - Have You Ever Really Loved A Woman';
 const plain = parseMetadata('rcast', decodeProviderMetadata('rcast', raw), context);
 assert.equal(plain.song.artist, 'Bryan Adams');
 assert.equal(plain.song.title, 'Have You Ever Really Loved A Woman');
 const wrapped = parseMetadata('rcast', decodeProviderMetadata('rcast', `Title: \nURL Source: https://status.rcast.net/68849\nMarkdown Content:\n${raw}`), context);
 assert.equal(wrapped.text, plain.text);
 assert.throws(() => decodeProviderMetadata('rcast', '<html>Error</html>'));
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
test('Radio.co status history skips the current track when it is repeated first', () => {
 const payload={current_track:{title:'Live mix',artwork_url:'https://img.example/live.jpg'},history:[{title:'Live mix'},{title:'Previous mix'}]};
 assert.equal(parseMetadata('radio.co',payload,context).song.art,payload.current_track.artwork_url);
 assert.deepEqual(parseMetadata('radio.co',payload,context).payload.song_history.map(track=>track.title),['Previous mix']);
 assert.deepEqual(parseHistory('radio.co',JSON.stringify(payload)).song_history.map(track=>track.title),['Previous mix']);
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

test('Strefa parses songs, programme fallback and protocol-relative artwork', () => {
 const result = parseMetadata('strefa', {ok:true,data:{artist:'Artist',title:'Track',cover:'//strefa.fm/cover.jpg'}});
 assert.equal(result.text,'Artist – Track');assert.equal(result.song.art,'https://strefa.fm/cover.jpg');
 assert.equal(parseMetadata('strefa',{ok:true,data:{artist:'',title:'',value:'17:30 - 17:38 O Tym Się Mówi'}}).text,'17:30 - 17:38 O Tym Się Mówi');
 assert.equal(parseMetadata('strefa',{ok:false,data:{title:'Stale'}}).text,null);
});
test('Strefa history preserves all previous tracks without inventing a current song', () => {
 const result=parseHistory('strefa',JSON.stringify({ok:true,items:[{artist:'Artist',title:'Earlier',time:'17:26',cover:'//strefa.fm/art.jpg'}]}));
 assert.equal(result.now_playing,undefined);assert.equal(result.song_history.length,1);
 assert.equal(result.song_history[0].song.title,'Earlier');assert.equal(result.song_history[0].song.art,'https://strefa.fm/art.jpg');assert.equal(result.song_history[0].time,'17:26');
 assert.deepEqual(parseHistory('strefa','{"ok":false}').song_history,[]);
});

test('ZPR keeps current, past and all future songs separate and ordered', () => {
 const result=parseMetadata('zpr',{current:{artists:['A','B'],name:'Now',image:'https://example.com/art.jpg'},pasts:[{name:'Past'}],futures:[{name:'Next'},{name:'Later'},{name:'Last'}]});
 assert.equal(result.text,'A & B – Now');assert.equal(result.song.art,'https://example.com/art.jpg');
 assert.equal(result.payload.playing_next.song.title,'Next');
 assert.deepEqual(result.payload.upcoming.map(x=>x.song.title),['Next','Later','Last']);
 assert.deepEqual(result.payload.song_history.map(x=>x.song.title),['Past']);
 assert.deepEqual(parseMetadata('zpr',{}).payload.upcoming,[]);
 assert.deepEqual(parseHistory('zpr','{"futures":[{"name":"Future"}]}').song_history,[]);
});

test('CentovaCast repairs Latin-1 mojibake in Greek current songs and history', () => {
 const title = "ΤΙ ΣΟΥ'ΧΩ ΚΆΝΕΙ";
 const broken = Buffer.from(title, 'utf8').toString('latin1');
 const payload = {type:'result',data:[{song:`ANTONIS REMOS - ${broken}`,track:{artist:'ANTONIS REMOS',title:broken}}]};
 const result = parseMetadata('centovacast',payload,context);
 assert.equal(result.song.title,title);
 assert.equal(result.text,`ANTONIS REMOS - ${title}`);
 const history = parseHistory('centovacast',JSON.stringify({type:'result',data:[[{title:broken,artist:'ANTONIS REMOS',time:100}]]}));
 assert.equal(history.song_history[0].song.title,title);
 for (const normal of ['Ελληνικά', 'Beyoncé', 'ANTONIS REMOS', 'Ã', 'Live Ελληνικά']) {
  assert.equal(parseMetadata('centovacast',{type:'result',data:[{track:{title:normal}}]},context).song.title,normal);
 }
 assert.equal(payload.data[0].track.title,broken);
});
test('CentovaCast repairs Windows-1253 Greek metadata represented as Latin-1', () => {
 const payload = {type:'result',data:[{song:'Ð ÃÁÚÔÁÍÏÓ - ËÁÈÏÓ ÅÐÏ×Ç',track:{artist:'Ð ÃÁÚÔÁÍÏÓ',title:'ËÁÈÏÓ ÅÐÏ×Ç'}}]};
 assert.equal(parseMetadata('centovacast',payload,context).text,'Π ΓΑΪΤΑΝΟΣ - ΛΑΘΟΣ ΕΠΟΧΗ');
 const history = {type:'result',data:[[{artist:'ÓôáìÜôçò ÓðáíïõäÜêçò',title:'ÈñÞíïò',time:100}]]};
 assert.equal(parseHistory('centovacast',JSON.stringify(history)).song_history[0].song.artist,'Σταμάτης Σπανουδάκης');
 assert.equal(parseHistory('centovacast',JSON.stringify(history)).song_history[0].song.title,'Θρήνος');
 assert.equal(parseMetadata('centovacast',{type:'result',data:[{track:{title:'Beyoncé'}}]},context).song.title,'Beyoncé');
});
