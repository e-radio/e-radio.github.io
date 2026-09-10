import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
function config(country,siteUrl='') {
 return JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',`import {site,stationsPath,redirects,countryText} from './countries/site.mjs'; console.log(JSON.stringify({site,stationsPath,redirects,title:countryText('Greek Radio in Greece')}));`],{env:{...process.env,COUNTRY:country,SITE_URL:siteUrl},encoding:'utf8'}));
}
test('Greece retains its dataset, geography and redirects',()=>{
 const gr=config('gr'); assert.equal(gr.site.countryCode,'GR'); assert.ok(gr.stationsPath.endsWith('stations-gr.json')); assert.equal(gr.site.siteUrl,'https://e-radio.github.io'); assert.ok(Object.keys(gr.redirects).length>0); assert.ok(gr.site.regions.includes('attica')); assert.equal(gr.title,'Greek Radio in Greece');
});
test('Croatia uses isolated data, country text and canonical origin',()=>{
 const hr=config('hr','https://radio.example.org'); assert.ok(hr.stationsPath.endsWith('stations-hr.json')); assert.equal(hr.title,'Croatian Radio in Croatia'); assert.equal(hr.site.siteUrl,'https://radio.example.org'); assert.deepEqual(hr.redirects,{}); assert.deepEqual(hr.site.cityAliases,{});
});
test('invalid country codes and subpath URLs fail clearly',()=>{
 assert.throws(()=>config('../gr'));
 assert.throws(()=>config('hr','https://example.org/repository/'));
});
