import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { llmsText } from '../src/lib/llms-text.mjs';

for (const key of ['gr', 'hr', 'se', 'nl', 'nl-fm', 'pl']) {
  test(`${key} llms.txt points only to its configured site and stations`, () => {
    const site = JSON.parse(readFileSync(new URL(`../countries/${key}.json`, import.meta.url)));
    const stations = JSON.parse(readFileSync(new URL(`../${site.stationsFile}`, import.meta.url)));
    const result = llmsText(site, stations);
    const root = site.siteUrl.replace(/\/$/, '');
    const links = [...result.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map(match => match[1]);
    assert.ok(result.startsWith(`# ${site.siteName}\n\n>`));
    assert.ok(links.length >= 14);
    assert.ok(links.every(url => url.startsWith(`${root}/`)));
    assert.ok(links.includes(`${root}/sitemap.xml`));
    assert.ok(links.some(url => url.startsWith(`${root}/stations/`)));
    assert.ok(!result.includes('undefined'));
  });
}
