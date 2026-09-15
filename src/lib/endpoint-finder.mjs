import { decodeProviderMetadata, parseMetadata, parseHistory } from './metadata/index.mjs';
export function endpointCandidates(input) {
 const url = new URL(input.trim().replace(/^https:\/\/(?:a\.tunzilla\.com|r\.jina\.ai)\//i,''));
 if (!['http:','https:'].includes(url.protocol) || url.username || url.password) throw new Error('Enter an HTTP or HTTPS stream URL without credentials.');
 const candidates=[];
 const add=(server,now,history)=>candidates.push({server,now,history});
 const parts=url.pathname.split('/').filter(Boolean);
 if(url.hostname.endsWith('.radio.co') && parts[0]) add('radio.co',`https://public.radio.co/api/v2/${parts[0]}/track/current`,`https://public.radio.co/api/v2/${parts[0]}/track/history`);
 if(parts[0]==='listen' && parts[1]) add('azuracast',`${url.origin}/api/nowplaying/${parts[1]}`,`${url.origin}/api/nowplaying/${parts[1]}`);
 if(['streams','proxy'].includes(parts[0]) && parts[1]) {
  const id=encodeURIComponent(parts[1]);
  add('centovacast',`${url.origin}/rpc/${id}/streaminfo.get`,`${url.origin}/external/rpc.php?m=recenttracks.get&username=${id}&limit=10`);
 }
 if(parts[0]==='stream' && parts[1]) add('shoutcast',`${url.origin}/json/stream/${parts[1]}`,`${url.origin}/json/stream/${parts[1]}`);
 const base=['proxy','radio'].includes(parts[0]) && parts[1] ? `${url.origin}/${parts[0]}/${parts[1]}` : url.origin;
 add('icecast',`${base}/status-json.xsl?mount=${encodeURIComponent(url.searchParams.get('mp') || (parts[0]==='radio'?'/'+parts.slice(2).join('/'):url.pathname))}`,null);
 add('shoutcast',`${base}/stats?sid=1&json=1`,`${base}/played?sid=1&type=json`);
 add('shoutcast',`${base}/7.html`,`${base}/played.html`);
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
  const raw=decodeProviderMetadata(candidate.server,text);
  const parsed=parseMetadata(candidate.server,raw,{streamUrl,endpoint:candidate.now});
  if(!parsed.text && parsed.listeners==null) throw new Error('No metadata');
  return parsed;
 });
 let history=null;
 if(current && candidate.history) history=candidate.history===candidate.now && current.data.payload.song_history.length ? current : await read(candidate.history,text=>{
  const parsed=parseHistory(candidate.server,text);
  if(!parsed.song_history?.length)throw new Error('No history');
  return parsed;
 });
 return {candidate,attempts,current:current?.data,config:current?{nowplaying_url:current.url,metadata_server:candidate.server,metadata_mode:'direct',...(history?{history_url:history.url}:{})}:null};
}
