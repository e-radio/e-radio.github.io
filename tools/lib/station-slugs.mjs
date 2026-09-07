// Reserve existing URLs before assigning suffixes, so unrelated URLs stay stable.
export function ensureUniqueStationSlugs(stations) {
  const reserved = new Set(stations.map(s => s.slug).filter(Boolean));
  const seen = new Set();
  const changes = [];
  for (const station of stations) {
    const previous = station.slug;
    if (previous && !seen.has(previous)) {
      seen.add(previous);
      continue;
    }
    const base = previous || 'station';
    const suffix = String(station.stationuuid || 'station').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 8) || 'station';
    let slug = `${base}-${suffix}`;
    let count = 2;
    while (reserved.has(slug) || seen.has(slug)) slug = `${base}-${suffix}-${count++}`;
    station.slug = slug;
    reserved.add(slug);
    seen.add(slug);
    changes.push({ stationuuid: station.stationuuid, name: station.name, previous, slug });
  }
  return changes;
}

export function assertUniqueStationSlugs(stations) {
  const seen = new Set();
  for (const station of stations) {
    if (typeof station.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(station.slug) || seen.has(station.slug)) {
      throw new Error(`Invalid or duplicate station slug: ${station.slug}. Run node tools/fix-station-slugs.mjs.`);
    }
    seen.add(station.slug);
  }
}
