import rawStations from "../data/stations-gr.json";

const ROOT_URL = "https://e-radio.github.io";
const STATIONS_PER_PAGE = 50;

const formatUrlEntry = (entry: {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
}) => {
  return [
    "  <url>",
    `    <loc>${entry.loc}</loc>`,
    `    <lastmod>${entry.lastmod}</lastmod>`,
    `    <changefreq>${entry.changefreq}</changefreq>`,
    `    <priority>${entry.priority}</priority>`,
    "  </url>",
  ].join("\n");
};

export async function GET() {
  const buildDate = new Date();
  const lastmod = buildDate.toISOString().split("T")[0];
  const totalPages = Math.max(1, Math.ceil(rawStations.length / STATIONS_PER_PAGE));

  const staticPages = [
    {
      loc: `${ROOT_URL}/`,
      lastmod,
      changefreq: "daily",
      priority: "1.0",
    },
    {
      loc: `${ROOT_URL}/top-rated/`,
      lastmod,
      changefreq: "weekly",
      priority: "0.8",
    },
    {
      loc: `${ROOT_URL}/city/`,
      lastmod,
      changefreq: "weekly",
      priority: "0.8",
    },
    {
      loc: `${ROOT_URL}/high-quality/`,
      lastmod,
      changefreq: "weekly",
      priority: "0.8",
    },
    {
      loc: `${ROOT_URL}/genres/`,
      lastmod,
      changefreq: "weekly",
      priority: "0.8",
    },
    {
      loc: `${ROOT_URL}/demo/`,
      lastmod,
      changefreq: "monthly",
      priority: "0.3",
    },
  ];

  const paginationPages = Array.from({ length: totalPages - 1 }, (_, index) => {
    const pageNumber = index + 2;
    return {
      loc: `${ROOT_URL}/page/${pageNumber}/`,
      lastmod,
      changefreq: "weekly",
      priority: "0.7",
    };
  });

  const stationPages = rawStations.map((station) => ({
    loc: `${ROOT_URL}/stations/${station.slug}/`,
    lastmod,
    changefreq: "weekly",
    priority: "0.6",
  }));

  const urls = [...staticPages, ...paginationPages, ...stationPages];

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