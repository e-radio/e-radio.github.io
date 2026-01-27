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
  const name = station.name ?? "";
  const location = station.city ?? station.state ?? "";
  const normalizedName = name.toLowerCase();
  const parts: string[] = [];

  if (name) parts.push(name);
  if (location && !normalizedName.includes(location.toLowerCase())) {
    parts.push(location);
  }

  const base = slugify(parts.join(" "));
  const suffix = station.stationuuid ? station.stationuuid.slice(0, 8) : "station";
  return base ? base : `station-${suffix}`;
}