import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';

const base = new URL('../src/data/station-content/', import.meta.url);
const files = {};
for (const folder of readdirSync(base, { withFileTypes: true }).filter(entry => entry.isDirectory())) {
  for (const name of readdirSync(new URL(`${folder.name}/`, base)).filter(name => name.endsWith('.json'))) {
    files[`../data/station-content/${folder.name}/${name}`] = JSON.parse(readFileSync(new URL(`${folder.name}/${name}`, base), 'utf8'));
  }
}
const source = readFileSync(new URL('../src/lib/station-content.ts', import.meta.url), 'utf8')
  .replace(/import\.meta\.glob<StationContent>\([\s\S]*?\);/, `${JSON.stringify(files)};`);
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { getStationContent } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const uuid = '041e668c-567c-4d5c-931e-2e63b752ee95';

test('Editorial content selects Greek, falls back to English, and shares the timetable', () => {
  const greek = getStationContent(uuid, 'el');
  const english = getStationContent(uuid, 'en');
  assert.equal(greek.language, 'el');
  assert.notDeepEqual(greek.content.about, english.content.about);
  assert.deepEqual(getStationContent(uuid, 'nl'), english);
  assert.deepEqual(greek.schedule, english.schedule);
  assert.equal(greek.content.faqs.length, 4);
  assert.equal(getStationContent('no-editorial-content', 'el'), null);
});

test('Real FM timetable covers every weekday exactly once with continuous 24-hour slots', () => {
  const { schedule } = getStationContent(uuid, 'el');
  assert.equal(schedule.timezone, 'Europe/Athens');
  assert.deepEqual(schedule.groups.flatMap(group => group.days).sort(), [0, 1, 2, 3, 4, 5, 6]);
  const minutes = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  for (const group of schedule.groups) {
    let previous = 0;
    for (const entry of group.entries) {
      assert.match(entry.start, /^([01]\d|2[0-3]):[0-5]\d$/);
      assert.match(entry.end, /^([01]\d|2[0-3]):[0-5]\d$/);
      assert.equal(minutes(entry.start), previous);
      const end = entry.end === '00:00' ? 1440 : minutes(entry.end);
      assert.ok(end > previous);
      previous = end;
    }
    assert.equal(previous, 1440);
  }
  const friday = schedule.groups.find(group => group.days.includes(5));
  assert.equal(friday.entries.find(entry => entry.start === '10:00').name, 'Γιάννης Παπαγιάννης');
  for (const group of schedule.groups.filter(group => group.days.some(day => day === 0 || day === 6))) {
    assert.equal(group.entries.find(entry => entry.start === '19:00').name, 'Real Sports');
    assert.ok(!group.entries.some(entry => entry.name.startsWith('Κεντρικό Δελτίο')));
  }
});
