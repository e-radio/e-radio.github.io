import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Reuse the original page modules, including their getStaticPaths implementations.
export function localizedRoutes(site) {
  return {
    name: 'country-localized-routes',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        if (site.countryCode === 'GR') {
          for (const locale of (site.locales || ['en'])) {
            injectRoute({ pattern: `${locale === 'en' ? '' : `/${locale}`}/guides/greek-radio-online`, entrypoint: resolve('src/content/guides/GreekRadio.astro'), prerender: true });
          }
        }
        if (site.countryCode === 'HR') {
          for (const locale of (site.locales || ['en'])) {
            injectRoute({ pattern: `${locale === 'en' ? '' : `/${locale}`}/guides/koji-hrvatski-radio-slusati`, entrypoint: resolve('src/content/guides/CroatianStations.astro'), prerender: true });
          }
        }
        for (const locale of (site.locales || []).filter(locale => locale !== 'en')) {
          const root = resolve('src/pages');
          injectRoute({ pattern: `/${locale}/site.webmanifest`, entrypoint: resolve(root, 'site.webmanifest.ts'), prerender: true });
          for (const file of readdirSync(root, { recursive: true })) {
            if (!file.endsWith('.astro')) continue;
            const route = file.replace(/\.astro$/, '').replace(/(^|\/)index$/, '$1').replace(/\/$/, '');
            injectRoute({ pattern: `/${locale}/${route}`, entrypoint: resolve(root, file), prerender: true });
          }
        }
      },
    },
  };
}
