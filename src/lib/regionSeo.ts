type RegionStation = {
  city?: string | null;
};

const REGION_NAMES = new Set([
  "attica",
  "central greece",
  "central macedonia",
  "crete",
  "eastern macedonia and thrace",
  "epirus",
  "ionian islands",
  "north aegean",
  "peloponnese",
  "south aegean",
  "thessaly",
  "western greece",
  "western macedonia",
]);

const CITY_ALIASES = new Map([
  ["heraclion", "Heraklion"],
  ["iraklio", "Heraklion"],
  ["messologi", "Mesolongi"],
  ["nafplion", "Nafplio"],
  ["patra", "Patras"],
  ["rethimno", "Rethymno"],
  ["nea kallikrateia", "Nea Kallikrateia"],
  ["νέα καλλικράτεια", "Nea Kallikrateia"],
]);

const cleanText = (value: unknown) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

const normalizedKey = (value: string) =>
  value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("en");

const canonicalCity = (value: string) => CITY_ALIASES.get(normalizedKey(value)) || value;

const isUsefulCity = (city: string, region: string, country: string) => {
  const key = normalizedKey(city);
  if (!city || city.length > 60 || city !== city.replace(/[\u0000-\u001f\u007f]/g, "")) return false;
  if (!/^[\p{L}][\p{L}\p{M} .'-]*$/u.test(city)) return false;
  if (["other", "unknown", "greece", normalizedKey(region), normalizedKey(country)].includes(key)) return false;
  return !REGION_NAMES.has(key);
};

export const selectRegionCities = (
  stations: RegionStation[],
  region: string,
  country: string,
  limit = 6,
) => {
  const counts = new Map<string, { city: string; count: number }>();
  for (const station of stations) {
    const rawCity = cleanText(station.city);
    const city = canonicalCity(rawCity);
    if (!isUsefulCity(city, region, country)) continue;
    const key = normalizedKey(city);
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { city, count: 1 });
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city))
    .slice(0, limit)
    .map(({ city }) => city);
};

const formatList = (items: string[]) => {
  if (items.length < 2) return items[0] || "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
};

export const buildRegionSeo = (
  regionValue: string,
  stations: RegionStation[],
  start: number,
  end: number,
  page = 1,
) => {
  const region = cleanText(regionValue) || "Greece";
  const country = "Greece";
  const location = country ? `${region}, ${country}` : region;
  const stationCount = stations.length;
  const stationWord = stationCount === 1 ? "station" : "stations";
  const cities = selectRegionCities(stations, region, country);
  const displayCities = cities.slice(0, 6);
  const cityList = formatList(displayCities);
  const metaCities = cities.slice(0, 2);

  const heading = `${region} Radio Stations – Listen to ${region} Radio Online`;
  const baseTitle = `${heading} | E-Radio`;
  const firstPageTitle = baseTitle.length <= 75
    ? baseTitle
    : `${region} Radio Stations Online | E-Radio`;
  const pageTitle = page === 1
    ? firstPageTitle
    : `${region} Radio Stations – Page ${page} | E-Radio`;

  const genericDescription = `Listen to ${stationCount} ${region} radio ${stationWord} live online. Discover local radio from ${location} and start listening for free.`;
  const cityDescription = metaCities.length >= 2
    ? `Listen to ${stationCount} ${region} radio ${stationWord} live online. Discover radio from ${metaCities.join(", ")} and across ${location}.`
    : genericDescription;
  const firstPageDescription = cityDescription.length <= 165 ? cityDescription : genericDescription;
  const pageDescription = page === 1
    ? firstPageDescription
    : `Listen to ${region} radio stations online. Page ${page} features stations ${start}–${end} of ${stationCount} from ${location}.`;

  const citySentence = displayCities.length >= 2
    ? `Find local radio from ${region}, including stations broadcasting from ${cityList}.`
    : `Find local radio broadcasting from across ${region}.`;

  return {
    country,
    cities: displayCities,
    heading,
    subtitle: `Listen to ${stationCount} radio ${stationWord} from ${location}, live online.`,
    introduction: `Discover ${region} radio stations broadcasting music, news, talk, entertainment and more. Browse local radio from across ${region} and listen online for free.`,
    rangeLabel: `Showing stations ${start}–${end} of ${stationCount}`,
    pageTitle,
    pageDescription,
    footerHeading: `Listen to Radio from ${location}`,
    footerText: `Explore ${region} radio stations and listen live from anywhere in the world. ${citySentence} Choose a station and start listening to ${region} radio online.`,
  };
};
