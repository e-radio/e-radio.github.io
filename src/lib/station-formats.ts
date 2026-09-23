import stations from './stations';
export const formatSlug = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/['"]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0,80);
const groups = new Map<string, typeof stations>();
for (const station of stations) {
  for (const format of ('formats' in station ? station.formats as string[] : []) || []) {
    if (!groups.has(format)) groups.set(format, []);
    groups.get(format)!.push(station);
  }
}
export const formatEntries = [...groups].map(([name, stations]) => ({name, slug: formatSlug(name), stations})).sort((a,b)=>a.name.localeCompare(b.name));
