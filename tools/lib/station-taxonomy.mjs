import { readFileSync, existsSync } from 'node:fs';
const root = new URL('../../', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const policy = read('tools/config/station-taxonomy.json');
const shared = read('tools/config/genre-cleanup.json');
const cache = new Map();
const entities = {amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '};
export const canonical = value => value.replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (raw,key) => {
  if (key.startsWith('#')) {
    const n=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):Number(key.slice(1));
    return n>0 && n<=0x10ffff ? String.fromCodePoint(n) : raw;
  }
  return entities[key.toLowerCase()] || raw;
}).normalize('NFKC').toLowerCase().replace(/\s+/gu,' ').trim();
export function classifyTags(tags, country='gr') {
  if (!cache.has(country)) {
    const url=new URL(`countries/${country}.genre-cleanup.json`,root);
    const custom=existsSync(url)?JSON.parse(readFileSync(url,'utf8')):{};
    cache.set(country, {
      aliases:Object.fromEntries(Object.entries({...shared.aliases,...policy.aliases,...custom.aliases}).map(([k,v])=>[canonical(k),(Array.isArray(v)?v:[v]).map(canonical)])),
      remove:new Set([...shared.remove,...policy.remove,...(custom.remove||[])].map(canonical)),
    });
  }
  const {aliases,remove}=cache.get(country);
  const result={genres:[],formats:[],review:[],removed:[]};
  const add=(key,value)=>{if(!result[key].includes(value))result[key].push(value);};
  function visit(raw,seen=new Set()) {
    if(typeof raw!=='string')return;
    let value=canonical(raw);
    if(!value || remove.has(value) || /^\d+\s*(kbps|kbit\/s|bit)$/.test(value)){if(value)add('removed',value);return;}
    if(/^(?:[0-9]0|(?:19|20)[0-9]0)$/.test(value))value+='s';
    const decade=value.match(/^(?:19|20)?(\d0)[’'´]?s$/);
    if(decade && !/^(192|193|194)/.test(value))value=decade[1]+'s';
    if(policy.genres.includes(value)){add('genres',value);return;}
    if(policy.formats.includes(value)){add('formats',value);return;}
    if(Object.hasOwn(aliases,value) && !seen.has(value)){
      for(const target of aliases[value])visit(target,new Set([...seen,value]));return;
    }
    const parts=value.split(/[,;|]/);
    if(parts.length>1){for(const part of parts)visit(part,seen);return;}
    add('review',value);
  }
  for(const tag of tags||[])visit(tag);
  return result;
}
