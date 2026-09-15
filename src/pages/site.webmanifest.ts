import type { APIContext } from 'astro';
import { localeHelpers, languagePath } from '../i18n/index';
import { site } from '../../countries/site.mjs';
import base from '../../countries/manifest-base.json';
export function GET({ url }: APIContext) {
  const { t, locale } = localeHelpers(url);
  return new Response(JSON.stringify({
    ...base,
    name: site.siteName,
    short_name: site.siteShortName,
    description: t(site.introText),
    lang: locale,
    start_url: languagePath("/", locale),
    scope: languagePath("/", locale),
    icons: [
      { src: site.icon192, sizes: '192x192', type: 'image/png' },
      { src: site.icon512, sizes: '512x512', type: 'image/png' },
    ],
  }), { headers: { 'Content-Type': 'application/manifest+json' } });
}
