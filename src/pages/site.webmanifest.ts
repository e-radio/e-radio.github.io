import { site } from '../../countries/site.mjs';
import base from '../../countries/manifest-base.json';
export function GET() {
  return new Response(JSON.stringify({
    ...base,
    name: site.siteName,
    short_name: site.siteShortName,
    description: site.introText,
    icons: [
      { src: site.icon192, sizes: '192x192', type: 'image/png' },
      { src: site.icon512, sizes: '512x512', type: 'image/png' },
    ],
  }), { headers: { 'Content-Type': 'application/manifest+json' } });
}
