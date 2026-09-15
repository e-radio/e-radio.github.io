import { decodeProviderMetadata, parseMetadata, parseHistory } from './metadata/index.mjs';
import { radiojarEndpoint, radiojarHistoryEndpoint } from './radiojar.mjs';
export function endpointCandidates(input) {
 const url = new URL(input.trim().replace(/^https:\/\/(?:a\.tunzilla\.com|r\.jina\.ai)\//i,''));
 if (!['http:','https:'].includes(url.protocol) || url.username || url.password) throw new Error('Enter an HTTP or HTTPS stream URL without credentials.');
 const candidates=[];
 const add=(server,now,history)=>{if(!candidates.some(c=>c.server===server && c.now===now)) candidates.push({server,now,history});};
 const parts=url.pathname.split('/').filter(Boolean);
 const radiojar=radiojarEndpoint(url.href);
 if(radiojar) add('radiojar',radiojar,radiojarHistoryEndpoint(radiojar));
 // Verified official Mix Megapol mapping; stream names are not Bauer station codes.
 if(url.hostname==='live-bauerse-fm.sharp-stream.com' && /^mixmegapol_instream_se_(mp3|aacp)$/.test(parts[0] || ''))
  add('bauer','https://listenapi.planetradio.co.uk/api9.2/nowplaying/mme','https://listenapi.planetradio.co.uk/api9.2/events/mme/now/10');
 const sid=encodeURIComponent(url.searchParams.get('sid') || parts.find(p=>/^sid\d+$/i.test(p))?.slice(3) || '1');
 if(url.hostname.endsWith('.radio.co') && parts[0]) add('radio.co',`https://public.radio.co/api/v2/${parts[0]}/track/current`,`https://public.radio.co/api/v2/${parts[0]}/track/history`);
 if(parts[0]==='listen' && parts[1]) add('azuracast',`${url.origin}/api/nowplaying/${parts[1]}`,`${url.origin}/api/nowplaying/${parts[1]}`);
 if(['streams','proxy','sc','ssl','ic'].includes(parts[0]) && parts[1]) {
  const id=encodeURIComponent(parts[1]);
  add('centovacast',`${url.origin}/rpc/${id}/streaminfo.get`,`${url.origin}/external/rpc.php?m=recenttracks.get&username=${id}&limit=10`);
 }
 if(parts[0]==='stream' && parts[1]) add('shoutcast',`${url.origin}/json/stream/${parts[1]}`,`${url.origin}/json/stream/${parts[1]}`);
 const base=['proxy','radio','sc','ssl','ic'].includes(parts[0]) && parts[1] ? `${url.origin}/${parts[0]}/${parts[1]}` : url.origin;
 const rawMount=url.searchParams.get('mp') || url.searchParams.get('mount') || (parts[0]==='radio'?'/'+parts.slice(2).join('/'):url.pathname);
 const mount=rawMount.startsWith('/')?rawMount:`/${rawMount}`;
 for(const origin of new Set([base,url.origin])) {
  add('icecast',`${origin}/status-json.xsl?mount=${encodeURIComponent(mount)}`,null);
  add('shoutcast',`${origin}/stats?sid=${sid}&json=1`,`${origin}/played?sid=${sid}&type=json`);
  add('shoutcast',`${origin}/7.html?sid=${sid}`,`${origin}/played.html?sid=${sid}`);
 }
 candidates.push({server:'azuracast',now:`${url.origin}/api/nowplaying`,history:null,directory:true});
 return {streamUrl:url.href,candidates};
}
export async function checkEndpoint(candidate, streamUrl, signal, fetchImpl=fetch) {
 const attempts=[];
 async function read(endpoint,decode) {
  for(const [method,url] of [['Direct',endpoint],['Jina',`https://r.jina.ai/${endpoint}`],['Tunzilla',`https://a.tunzilla.com/${endpoint}`]]) {
   if(signal.aborted) throw new DOMException('Aborted','AbortError');
   try {
    const response=await fetchImpl(url,{signal:AbortSignal.any([signal,AbortSignal.timeout(7000)])});
    if(!response.ok) {attempts.push({method,url,status:`HTTP ${response.status}`});continue;}
    if(/audio\//i.test(response.headers.get('content-type') || '')) {await response.body?.cancel();attempts.push({method,url,status:'Audio response'});continue;}
    const text=await response.text();
    let data;
    try {data=decode(text);} catch {attempts.push({method,url,status:'Invalid metadata'});continue;}
    attempts.push({method,url,status:'Verified'});return {data,url};
   } catch(error) {if(signal.aborted)throw error;attempts.push({method,url,status:'Blocked, unavailable or timed out'});}
  }
  return null;
 }
 const current=await read(candidate.now,text=>{
  let raw=decodeProviderMetadata(candidate.server,text);
  if(candidate.directory) {
   const target=new URL(streamUrl);
   const matches=value=>{try {const u=new URL(value);return u.hostname===target.hostname && u.port===target.port && decodeURIComponent(u.pathname).replace(/\/+$/,'')===decodeURIComponent(target.pathname).replace(/\/+$/,'') && u.search===target.search;}catch{return false;}};
   const entry=Array.isArray(raw) && raw.find(item=>[item?.station?.listen_url,...(item?.station?.mounts || []).map(m=>m.url),...(item?.station?.remotes || []).map(m=>m.url)].some(matches));
   if(!entry?.station?.shortcode) throw new Error('No matching station');
   raw=entry;
  }
  const parsed=parseMetadata(candidate.server,raw,{streamUrl,endpoint:candidate.now});
  if(!parsed.text) throw new Error('No metadata');
  return {...parsed,...(candidate.directory?{shortcode:raw.station.shortcode}:{})};
 });
 if(current && candidate.directory) {
  const endpoint=`${candidate.now}/${encodeURIComponent(current.data.shortcode)}`;
  const verified=await checkEndpoint({server:'azuracast',now:endpoint,history:endpoint},streamUrl,signal,fetchImpl);
  return {...verified,attempts:[...attempts,...verified.attempts]};
 }
 let history=current?.data.payload.song_history.length ? current : null;
 if(current && candidate.history) history=candidate.history===candidate.now ? (current.data.payload.song_history.length ? current : null) : await read(candidate.history,text=>{
  const parsed=parseHistory(candidate.server,text);
  if(!parsed.song_history?.length)throw new Error('No history');
  return {...parsed,...(candidate.directory?{shortcode:raw.station.shortcode}:{})};
 });
 return {candidate,attempts,current:current?.data,config:current?{nowplaying_url:current.url,metadata_server:candidate.server,metadata_mode:'direct',...(history?{history_url:history.url}:{})}:null};
}
