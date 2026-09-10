import { parseArgs } from 'node:util';
import { existsSync, writeFileSync } from 'node:fs';
const {values} = parseArgs({options:{code:{type:'string'},name:{type:'string'},adjective:{type:'string'},url:{type:'string'}}});
const code = values.code?.toLowerCase();
if (!code || !/^[a-z]{2}$/.test(code) || !values.name || !values.adjective || !values.url) throw new Error('Usage: node tools/create-country.mjs --code hr --name Croatia --adjective Croatian --url https://your-site.example');
const url=new URL(values.url);
if (!['https:','http:'].includes(url.protocol)||url.pathname!=='/')throw new Error('Use a root site URL, not a repository subpath');
const files={
 [`countries/${code}.json`]:{countryCode:code.toUpperCase(),countryName:values.name,countryAdjective:values.adjective,language:'en',siteName:`E-Radio ${values.name}`,siteUrl:url.origin,stationsFile:`src/data/stations-${code}.json`,regions:[],cityAliases:{},redirectsFile:`countries/${code}.redirects.json`,googleVerification:''},
 [`countries/${code}.redirects.json`]:{},
 [`src/data/stations-${code}.json`]:[]
};
for(const path of Object.keys(files))if(existsSync(path))throw new Error(`Refusing to overwrite ${path}`);
for(const [path,value] of Object.entries(files))writeFileSync(path,JSON.stringify(value,null,2)+'\n');
console.log(`Created ${values.name}. Import stations with COUNTRY=${code} npm run stations:import`);
