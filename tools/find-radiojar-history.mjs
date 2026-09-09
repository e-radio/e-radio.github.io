import {readFile,writeFile} from 'node:fs/promises';
import {radiojarHistoryEndpoint,radiojarHistoryTracks} from '../src/lib/radiojar.mjs';
const root=new URL('../',import.meta.url), path=new URL('src/data/stations-gr.json',root);
const original=await readFile(path,'utf8'), stations=JSON.parse(original);
const targets=stations.filter(s=>s.metadata_server==='radiojar' && s.nowplaying_url);
let cursor=0; const results=[];
async function worker(){while(cursor<targets.length){
 const station=targets[cursor++], endpoint=radiojarHistoryEndpoint(station.nowplaying_url);
 const result={slug:station.slug,endpoint,verified:false,added:false};
 try{
  if(!endpoint)throw Error('Unsupported endpoint');
  const response=await fetch(endpoint,{signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error(`HTTP ${response.status}`);
  const tracks=radiojarHistoryTracks(await response.json());
  result.tracks=tracks.length;result.verified=tracks.length>0;
  if(result.verified&&!station.history_url){station.history_url=endpoint;result.added=true;}
 }catch(e){result.error=e.cause?.message||e.message;}
 results.push(result);
}}
await Promise.all(Array.from({length:10},worker));
const report={checked:targets.length,verified:results.filter(r=>r.verified).length,added:results.filter(r=>r.added).length,results};
await writeFile(new URL('reports/radiojar-history.json',root),JSON.stringify(report,null,2)+'\n');
if(await readFile(path,'utf8')!==original)throw Error('Data changed during scan; refusing overwrite');
await writeFile(path,JSON.stringify(stations,null,2)+'\n');
console.log(JSON.stringify({checked:report.checked,verified:report.verified,added:report.added}));
