type CityStation = {
  state?: string | null;
};

const cleanText = (value: unknown) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

const selectMostCommon = (values: unknown[], excluded: string[] = []) => {
  const excludedKeys = new Set(excluded.map((value) => value.toLocaleLowerCase("en")));
  const counts = new Map<string, { value: string; count: number }>();
  for (const candidate of values) {
    const value = cleanText(candidate);
    const key = value.toLocaleLowerCase("en");
    if (!value || value.length > 60 || excludedKeys.has(key) || ["other", "unknown"].includes(key)) continue;
    if (!/^[\p{L}][\p{L}\p{M} .'-]*$/u.test(value)) continue;
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { value, count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))[0]?.value || "";
};

export const buildCitySeo = (
  cityValue: string,
  stations: CityStation[],
  start: number,
  end: number,
  page = 1,
) => {
  const rawCity = cleanText(cityValue);
  const hasCity = Boolean(rawCity) && !["other", "unknown"].includes(rawCity.toLocaleLowerCase("en"));
  const city = hasCity ? rawCity : "";
  const region = hasCity
    ? selectMostCommon(stations.map((station) => station.state), [city])
    : "";
  const country = "Greece";
  const locationParts = [city, region, country].filter(Boolean);
  const location = locationParts.join(", ") || "Greece";
  const stationCount = stations.length;
  const stationWord = stationCount === 1 ? "station" : "stations";

  const heading = hasCity
    ? `${city} Radio Stations – Listen to ${city} Radio Online`
    : "Greek Radio Stations – Listen to Radio Online";
  const longTitle = `${heading} | E-Radio`;
  const firstPageTitle = longTitle.length <= 75
    ? longTitle
    : `${hasCity ? city : "Greek"} Radio Stations Online | E-Radio`;
  const pageTitle = page === 1
    ? firstPageTitle
    : `${hasCity ? city : "Greek"} Radio Stations – Page ${page} | E-Radio`;

  const subject = hasCity ? `${city} radio` : "Greek radio";
  const pageDescription = page === 1
    ? `Listen to ${stationCount} ${subject} ${stationWord} live online. Discover local radio from ${location} and start listening for free.`
    : `Listen to ${subject} stations online. Page ${page} features stations ${start}–${end} of ${stationCount} from ${location}.`;

  const introduction = hasCity
    ? `Discover ${city} radio stations broadcasting music, news, talk, entertainment and more. Browse local radio from across ${city} and listen online for free.`
    : "Discover Greek radio stations broadcasting music, news, talk, entertainment and more. Browse stations from across Greece and listen online for free.";

  const areaSentence = hasCity && region
    ? `Find local radio serving ${city} and the surrounding region of ${region}.`
    : hasCity
      ? `Find local radio broadcasting from across ${city}.`
      : "Find local stations broadcasting from cities and regions across Greece.";

  return {
    city,
    region,
    country,
    heading,
    subtitle: `Listen to ${stationCount} radio ${stationWord} from ${location}, live online.`,
    introduction,
    rangeLabel: `Showing stations ${start}–${end} of ${stationCount}`,
    pageTitle,
    pageDescription,
    footerHeading: hasCity ? `Listen to Radio from ${location}` : "Listen to Radio from Greece",
    footerText: `Explore ${hasCity ? city : "Greek"} radio stations and listen live from anywhere in the world. ${areaSentence} Choose a station and start listening to ${subject} online.`,
  };
};
