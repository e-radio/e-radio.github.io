import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
// Exercise the same pure translator used by Astro and the player on Node 20+.
const source = readFileSync(new URL('../src/i18n/translate.ts', import.meta.url), 'utf8')
  .replace("import hr from './hr.json';", `const hr = ${readFileSync(new URL('../src/i18n/hr.json', import.meta.url), 'utf8')};`);
const localizedSource = source.replace("import el from './el.json';", `const el = ${readFileSync(new URL('../src/i18n/el.json', import.meta.url), 'utf8')};`);
const js = ts.transpileModule(localizedSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
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
test('Greek controls, SEO, locations, and placeholders translate', () => {
  assert.equal(t('Play', 'el'), 'Αναπαραγωγή');
  assert.equal(t('Play Athens FM', 'el'), 'Αναπαραγωγή: Athens FM');
  assert.equal(t('Showing stations {0}–{1} of {2}', 'el', [1, 20, 64]), 'Εμφανίζονται οι σταθμοί 1–20 από 64');
  assert.equal(t('Attica', 'el'), 'Αττική');
  assert.equal(t('Greek Radio Stations by City | E-Radio', 'el'), 'Ελληνικοί ραδιοφωνικοί σταθμοί ανά πόλη | E-Radio');
  assert.match(t('Listen to Athens FM live from Attica, Greece. Stream pop radio online with reliable playback, station details, and the latest stream quality info.', 'el'), /^Ακούστε Athens FM ζωντανά από την περιοχή Αττική/);
  assert.equal(t('https://radio.example/stream', 'el'), 'https://radio.example/stream');
});
test('Locale routing preserves pages, queries, external URLs and asset URLs', async () => {
  for (const language of ['el', 'hr']) {
    const routingSource = readFileSync(new URL('../src/i18n/index.ts', import.meta.url), 'utf8')
      .replace("import { translate, type Locale } from './translate';", "type Locale = 'en' | 'hr' | 'el'; const translate = (value: any) => value;")
      .replace("export { translate } from './translate';", '')
      .replace("import { site } from '../../countries/site.mjs';", `const site = {locales: ['en', '${language}'], siteUrl: 'https://radio.example'};`);
    const routingJs = ts.transpileModule(routingSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    const { localeHelpers, languagePath, localeFor } = await import(`data:text/javascript;base64,${Buffer.from(routingJs).toString('base64')}`);
    const { localizePath } = localeHelpers(new URL(`https://radio.example/${language}/stations/example/`));
    assert.equal(localizePath('/stations/example/?quality=2'), `/${language}/stations/example/?quality=2`);
    assert.equal(localizePath(`/${language}/live-tracks/`), `/${language}/live-tracks/`);
    assert.equal(localizePath('https://radio.example/stations/example/'), `https://radio.example/${language}/stations/example/`);
    assert.equal(localizePath('https://stream.example/radio.mp3'), 'https://stream.example/radio.mp3');
    assert.equal(localizePath('/station-icons/example.webp'), '/station-icons/example.webp');
    assert.equal(languagePath(`/${language}/stations/example/`, 'en'), '/stations/example/');
    assert.equal(localeFor(new URL('https://radio.example/elsewhere/')), 'en');
  }
});
test('Greek genre links match existing routes and resolve slug collisions', async () => {
  const genreSource = readFileSync(new URL('../src/lib/genre-links.ts', import.meta.url), 'utf8')
    .replace("import stations from './stations';", `const stations = [{ genres: ['ελληνικά', 'r&b', 'r b', 'ελληνικά'] }];`);
  const js = ts.transpileModule(genreSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const { genreSlug } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
  assert.equal(genreSlug('ελληνικά'), 'ellinika');
  assert.equal(genreSlug('r&b'), 'r-b');
  assert.equal(genreSlug('r b'), 'r-b-2');
});
