import rawStations from "../data/stations-gr.json";

const ROOT_URL = "https://e-radio.github.io";
const HOMEPAGE_PER_PAGE = 50;
const HUB_PER_PAGE = 20;
const HIGH_BITRATE_THRESHOLD = 320;

const formatUrlEntry = (entry: {
  loc: string;
  lastmod?: string;
}) => {
  return [
    "  <url>",
    `    <loc>${entry.loc}</loc>`,
    entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>` : null,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
};

export async function GET() {
  const buildDate = new Date();
  const lastmod = buildDate.toISOString().split("T")[0];
  const totalPages = Math.max(1, Math.ceil(rawStations.length / HOMEPAGE_PER_PAGE));
  const highQualityStations = rawStations.filter((station) => Number(station.bitrate || 0) >= HIGH_BITRATE_THRESHOLD);
  const highQualityPages = Math.max(1, Math.ceil(highQualityStations.length / HUB_PER_PAGE));

  const transliterateGreek = (input: string) => {
    const map: Record<string, string> = {
      Α: "a", Β: "v", Γ: "g", Δ: "d", Ε: "e", Ζ: "z", Η: "i", Θ: "th", Ι: "i", Κ: "k", Λ: "l", Μ: "m",
      Ν: "n", Ξ: "x", Ο: "o", Π: "p", Ρ: "r", Σ: "s", Τ: "t", Υ: "y", Φ: "f", Χ: "ch", Ψ: "ps", Ω: "o",
      α: "a", β: "v", γ: "g", δ: "d", ε: "e", ζ: "z", η: "i", θ: "th", ι: "i", κ: "k", λ: "l", μ: "m",
      ν: "n", ξ: "x", ο: "o", π: "p", ρ: "r", σ: "s", ς: "s", τ: "t", υ: "y", φ: "f", χ: "ch", ψ: "ps", ω: "o",
    };
    return input
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .split("")
      .map((char) => map[char] ?? char)
      .join("");
  };

  const baseCitySlug = (city: string) =>
    transliterateGreek(city || "")
      .toLowerCase()
      .trim()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "other";

  const baseRegionSlug = (region: string) =>
    transliterateGreek(region || "")
      .toLowerCase()
      .trim()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "other";

  const baseGenreSlug = (genre: string) =>
    transliterateGreek(genre || "")
      .toLowerCase()
      .trim()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "other";

  const staticPages = [
    {
      loc: `${ROOT_URL}/`,
      lastmod,
    },
    {
      loc: `${ROOT_URL}/top-rated/`,
      lastmod,
    },
    {
      loc: `${ROOT_URL}/city/`,
      lastmod,
    },
    {
      loc: `${ROOT_URL}/high-quality/`,
      lastmod,
    },
    {
      loc: `${ROOT_URL}/genres/`,
      lastmod,
    },
    {
      loc: `${ROOT_URL}/region/`,
      lastmod,
    },
    {
      loc: `${ROOT_URL}/demo/`,
      lastmod,
    },
    {
      loc: `${ROOT_URL}/dmca/`,
      lastmod,
    },
  ];

  const paginationPages = Array.from({ length: totalPages - 1 }, (_, index) => {
    const pageNumber = index + 2;
    return {
      loc: `${ROOT_URL}/page/${pageNumber}/`,
      lastmod,
    };
  });

  const highQualityPagination = Array.from({ length: Math.max(0, highQualityPages - 1) }, (_, index) => {
    const pageNumber = index + 2;
    return {
      loc: `${ROOT_URL}/high-quality/page/${pageNumber}/`,
      lastmod,
    };
  });

  const cityMap = new Map<string, typeof rawStations>();
  for (const station of rawStations) {
    const city = (station.city || "").trim();
    if (!city || city.toLowerCase() === "other") {
      continue;
    }
    if (!cityMap.has(city)) {
      cityMap.set(city, []);
    }
    cityMap.get(city)?.push(station);
  }

  const citySlugCounts = new Map<string, number>();
  const cityPages = [...cityMap.entries()].map(([city, stations]) => {
    const base = baseCitySlug(city);
    const nextCount = (citySlugCounts.get(base) || 0) + 1;
    citySlugCounts.set(base, nextCount);
    const slug = nextCount > 1 ? `${base}-${nextCount}` : base;
    return {
      loc: `${ROOT_URL}/city/${slug}/`,
      lastmod,
      slug,
      stations,
    };
  });

  const cityPagination = cityPages.flatMap((cityPage) => {
    const total = Math.ceil(cityPage.stations.length / HUB_PER_PAGE);
    if (total <= 1) return [];
    return Array.from({ length: total - 1 }, (_, index) => ({
      loc: `${ROOT_URL}/city/${cityPage.slug}/page/${index + 2}/`,
      lastmod,
    }));
  });

  const regionMap = new Map<string, typeof rawStations>();
  for (const station of rawStations) {
    const region = (station.state || "").trim();
    if (!region || region.toLowerCase() === "other") {
      continue;
    }
    if (!regionMap.has(region)) {
      regionMap.set(region, []);
    }
    regionMap.get(region)?.push(station);
  }

  const regionSlugCounts = new Map<string, number>();
  const regionPages = [...regionMap.entries()].map(([region, stations]) => {
    const base = baseRegionSlug(region);
    const nextCount = (regionSlugCounts.get(base) || 0) + 1;
    regionSlugCounts.set(base, nextCount);
    const slug = nextCount > 1 ? `${base}-${nextCount}` : base;
    return {
      loc: `${ROOT_URL}/region/${slug}/`,
      lastmod,
      slug,
      stations,
    };
  });

  const regionPagination = regionPages.flatMap((regionPage) => {
    const total = Math.ceil(regionPage.stations.length / HUB_PER_PAGE);
    if (total <= 1) return [];
    return Array.from({ length: total - 1 }, (_, index) => ({
      loc: `${ROOT_URL}/region/${regionPage.slug}/page/${index + 2}/`,
      lastmod,
    }));
  });

  const genreMap = new Map<string, typeof rawStations>();
  for (const station of rawStations) {
    const genres = Array.isArray(station.genres) && station.genres.length > 0 ? station.genres : ["Other"];
    for (const genre of genres) {
      const key = genre.trim() || "Other";
      if (!genreMap.has(key)) {
        genreMap.set(key, []);
      }
      genreMap.get(key)?.push(station);
    }
  }

  const genreSlugCounts = new Map<string, number>();
  const genrePages = [...genreMap.entries()].map(([genre, stations]) => {
    const base = baseGenreSlug(genre);
    const nextCount = (genreSlugCounts.get(base) || 0) + 1;
    genreSlugCounts.set(base, nextCount);
    const slug = nextCount > 1 ? `${base}-${nextCount}` : base;
    return {
      loc: `${ROOT_URL}/genres/${slug}/`,
      lastmod,
      slug,
      stations,
    };
  });

  const genrePagination = genrePages.flatMap((genrePage) => {
    const total = Math.ceil(genrePage.stations.length / HUB_PER_PAGE);
    if (total <= 1) return [];
    return Array.from({ length: total - 1 }, (_, index) => ({
      loc: `${ROOT_URL}/genres/${genrePage.slug}/page/${index + 2}/`,
      lastmod,
    }));
  });

  const stationPages = rawStations.map((station) => ({
    loc: `${ROOT_URL}/stations/${station.slug}/`,
  }));

  const urls = [
    ...staticPages,
    ...paginationPages,
    ...highQualityPagination,
    ...cityPages.map(({ loc, lastmod }) => ({ loc, lastmod })),
    ...regionPages.map(({ loc, lastmod }) => ({ loc, lastmod })),
    ...genrePages.map(({ loc, lastmod }) => ({ loc, lastmod })),
    ...cityPagination,
    ...regionPagination,
    ...genrePagination,
    ...stationPages,
  ];

  const body = [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<urlset",
    "  xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"",
    "  xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"",
    "  xsi:schemaLocation=\"http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd\"",
    ">",
    urls.map((entry) => formatUrlEntry(entry)).join("\n"),
    "</urlset>",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}