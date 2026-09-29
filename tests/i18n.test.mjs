import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
// Exercise the same pure translator used by Astro and the player on Node 20+.
const source = readFileSync(new URL('../src/i18n/translate.ts', import.meta.url), 'utf8')
  .replace("import en from './en.json';", `const en = ${readFileSync(new URL('../src/i18n/en.json', import.meta.url), 'utf8')};`)
  .replace("import hr from './hr.json';", `const hr = ${readFileSync(new URL('../src/i18n/hr.json', import.meta.url), 'utf8')};`);
const localizedSource = source.replace("import pl from './pl.json';", `const pl = ${readFileSync(new URL('../src/i18n/pl.json', import.meta.url), 'utf8')};`).replace("import el from './el.json';", `const el = ${readFileSync(new URL('../src/i18n/el.json', import.meta.url), 'utf8')};`);
const js = ts.transpileModule(localizedSource.replace("import nl from './nl.json';", `const nl = ${readFileSync(new URL('../src/i18n/nl.json', import.meta.url), 'utf8')};`).replace("import sv from './sv.json';", `const sv = ${readFileSync(new URL('../src/i18n/sv.json', import.meta.url), 'utf8')};`), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
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
  for (const language of ['el', 'hr', 'sv']) {
    const routingSource = readFileSync(new URL('../src/i18n/index.ts', import.meta.url), 'utf8')
      .replace("import { translate, type Locale } from './translate';", "type Locale = 'en' | 'hr' | 'el' | 'sv'; const translate = (value: any) => value;")
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
test('Swedish controls, SEO, counties and interpolation translate', () => {
  assert.equal(t('Play', 'sv'), 'Spela');
  assert.equal(t('Play Bandit Rock', 'sv'), 'Spela Bandit Rock');
  assert.equal(t('Showing stations {0}–{1} of {2}', 'sv', [1, 20, 50]), 'Visar station 1–20 av 50');
  assert.equal(t('Stockholm county', 'sv'), 'Stockholms län');
  assert.equal(t('Swedish Radio Stations by City | Sveriges Radio', 'sv'), 'Svenska radiostationer efter stad | Sveriges Radio');
  assert.equal(t('https://stream.example/radio.mp3', 'sv'), 'https://stream.example/radio.mp3');
});

test('Dutch controls, SEO and locations translate without changing station names', () => {
 assert.equal(t('Play', 'nl'), 'Afspelen');
 assert.equal(t('Play Classics Radio', 'nl'), 'Classics Radio afspelen');
 assert.equal(t('North Brabant', 'nl'), 'Noord-Brabant');
 assert.equal(t('Dutch Radio Stations by City | Netherlands FM', 'nl'), 'Nederlandse radiozenders per stad | Netherlands FM');
 assert.equal(t('Showing stations {0}–{1} of {2}', 'nl', [1,20,50]), 'Zenders 1–20 van 50');
 const dictionary=JSON.parse(readFileSync(new URL('../src/i18n/nl.json', import.meta.url), 'utf8'));
 for(const [key,value] of Object.entries(dictionary)) assert.deepEqual((key.match(/\{\d+\}/g)||[]).sort(),(value.match(/\{\d+\}/g)||[]).sort(),key);
});

test('Polish controls, station SEO and geography translate while names and URLs remain intact', () => {
  assert.equal(t('Play', 'pl'), 'Odtwórz');
  assert.equal(t('Play REVERB RIFF RADIO', 'pl'), 'Odtwórz REVERB RIFF RADIO');
  assert.equal(t('Warsaw', 'pl'), 'Warszawa');
  assert.equal(t('Masovian Voivodeship', 'pl'), 'województwo mazowieckie');
  assert.equal(t('Polish Radio Stations – Radio Internetowe | Radio Internetowe', 'pl'), 'Radio Internetowe – polskie stacje radiowe na żywo');
  const description = t('Listen to REVERB RIFF RADIO live from Masovian Voivodeship, Poland. Stream rock radio online with reliable playback, station details, and the latest stream quality info.', 'pl');
  assert.match(description, /REVERB RIFF RADIO/);
  assert.match(description, /województwo mazowieckie, Polska/);
  assert.doesNotMatch(description, /Listen|Voivodeship|Poland/);
  assert.equal(t('http://radio.example/stream', 'pl'), 'http://radio.example/stream');
  assert.equal(t('{0} stations found', 'pl', [22]), 'Liczba znalezionych stacji: 22');
});

test('Polish default locale retains root URLs and puts English under /en/', async () => {
  const source = readFileSync(new URL('../src/i18n/index.ts', import.meta.url), 'utf8')
    .replace("import { translate, type Locale } from './translate';", "const translate = (value) => value;")
    .replace("export { translate } from './translate';", '')
    .replace("import { site } from '../../countries/site.mjs';", "const site = {locales:['pl','en'], defaultLocale:'pl', siteUrl:'https://radio-internetowe.github.io'};");
  const js = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ESNext, target:ts.ScriptTarget.ES2022}}).outputText;
  const {localeFor, languagePath, localeHelpers} = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
  assert.equal(localeFor(new URL('https://radio-internetowe.github.io/')), 'pl');
  assert.equal(localeFor(new URL('https://radio-internetowe.github.io/en/stations/test/')), 'en');
  assert.equal(languagePath('/en/stations/test/?q=radio#play', 'pl'), '/stations/test/?q=radio#play');
  assert.equal(languagePath('/stations/test/', 'en'), '/en/stations/test/');
  const en = localeHelpers(new URL('https://radio-internetowe.github.io/en/'));
  assert.equal(en.localizePath('https://radio-internetowe.github.io/'), 'https://radio-internetowe.github.io/en/');
  assert.equal(en.localizePath('/en/city/warsaw/'), '/en/city/warsaw/');
  assert.equal(en.localizePath('/station-icons/pl/example.webp'), '/station-icons/pl/example.webp');
  assert.equal(en.localizePath('https://radio.example/live.mp3'), 'https://radio.example/live.mp3');
});

test('Polish and English location labels use the appropriate city names', () => {
 assert.equal(t('Warszawa', 'en'), 'Warsaw');
 assert.equal(t('Kraków', 'en'), 'Krakow');
 assert.equal(t('Warsaw', 'pl'), 'Warszawa');
 assert.equal(t('Wrocław', 'en'), 'Wrocław');
 assert.equal(t('Masovian Voivodeship', 'pl'), 'województwo mazowieckie');
});
