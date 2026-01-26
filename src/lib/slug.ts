export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function stationSlug(station: {
  name?: string;
  state?: string;
  city?: string;
  stationuuid?: string;
}): string {
  const base = slugify([station.name, station.city ?? station.state].filter(Boolean).join(" "));
  const suffix = station.stationuuid ? station.stationuuid.slice(0, 8) : "station";
  return base ? base : `station-${suffix}`;
}