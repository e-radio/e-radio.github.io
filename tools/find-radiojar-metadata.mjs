import {readFile,writeFile} from 'node:fs/promises';
import {radiojarEndpoint,radiojarHasTrack} from '../src/lib/radiojar.mjs';
const root=new URL('../',import.meta.url);
const path=new URL('src/data/stations-gr.json',root);
const original=await readFile(path,'utf8');
const stations=JSON.parse(original);
const targets=stations.map(station=>({station,endpoints:[...new Set([station.stream_url,...(station.streams||[]).flatMap(s=>[s.url,...(s.alternate_urls||[])])].map(radiojarEndpoint).filter(Boolean))]})).filter(s=>s.endpoints.length);
const cache=new Map();
function probe(url){
 if(!cache.has(url))cache.set(url,(async()=>{
  try{
   const response=await fetch(url,{signal:AbortSignal.timeout(8000)});
   if(!response.ok)return {error:`HTTP ${response.status}`};
   const payload=await response.json();
   return radiojarHasTrack(payload)?{verified:true,artist:payload.artist,title:payload.title}:{error:'No current track title'};
  }catch(e){return {error:e.cause?.message||e.message};}
 })());
 return cache.get(url);
}
let cursor=0;const results=[];
async function worker(){while(cursor<targets.length){
 const {station,endpoints}=targets[cursor++];const attempts=[];let found;
 for(const endpoint of endpoints){const result=await probe(endpoint);attempts.push({endpoint,...result});if(result.verified){found=endpoint;break;}}
 let added=false;
 if(found&&!station.nowplaying_url){station.nowplaying_url=found;station.metadata_server='radiojar';added=true;}
 results.push({slug:station.slug,verified:Boolean(found),added,attempts});
}}
await Promise.all(Array.from({length:12},worker));
const report={checked:results.length,verified:results.filter(r=>r.verified).length,added:results.filter(r=>r.added).length,results};
await writeFile(new URL('reports/radiojar-metadata.json',root),JSON.stringify(report,null,2)+'\n');
if(await readFile(path,'utf8')!==original)throw Error('Station data changed during scan; refusing overwrite');
await writeFile(path,JSON.stringify(stations,null,2)+'\n');
console.log(JSON.stringify({checked:report.checked,verified:report.verified,added:report.added}));
