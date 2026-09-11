import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
// Exercise the same pure translator used by Astro and the player on Node 20+.
const source = readFileSync(new URL('../src/i18n/translate.ts', import.meta.url), 'utf8')
  .replace("import hr from './hr.json';", `const hr = ${readFileSync(new URL('../src/i18n/hr.json', import.meta.url), 'utf8')};`);
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { translate: t } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
test('English text and stream URLs remain unchanged', () => {
  assert.equal(t('Play', 'en'), 'Play');
  assert.equal(t('http://stream.example/fitness', 'hr'), 'http://stream.example/fitness');
  assert.equal(t('HRT Radio Sljeme', 'hr'), 'HRT Radio Sljeme');
});
test('Croatian controls and parameterized messages translate', () => {
  assert.equal(t('Play', 'hr'), 'Pokreni');
  assert.equal(t('Showing stations {0}–{1} of {2}', 'hr', [1, 20, 64]), 'Prikazane postaje: 1–20 od 64');
  assert.equal(t('Play Extra FM', 'hr'), 'Pokreni Extra FM');
});
test('City names are not replaced with county labels', () => {
  assert.equal(t('Zagreb', 'hr'), 'Zagreb');
  assert.equal(t('City of Zagreb', 'hr'), 'Grad Zagreb');
  assert.equal(t('Zagreb Radio Stations – Listen to Zagreb Radio Online | Radio Hrvatska', 'hr'), 'Radijske postaje: Zagreb – slušajte uživo | Radio Hrvatska');
});
test('Full SEO sentences translate without partial station-count matches', () => {
  const result = t('Discover Zagreb radio stations broadcasting music, news, talk, entertainment and more. Browse local radio from across Zagreb and listen online for free.', 'hr');
  assert.match(result, /^Otkrijte lokalne radijske postaje/);
  assert.ok(!result.includes('Discover'));
  assert.ok(result.includes('Zagreb'));
});
