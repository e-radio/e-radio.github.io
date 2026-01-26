import rawStations from "../data/stations-gr.json";

export async function GET() {
  const root = "https://e-radio.github.io";

  const urls = [
    `${root}/`,
    ...rawStations.map((station) => `${root}/stations/${station.slug}/`)
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}
</urlset>`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" }
  });
}