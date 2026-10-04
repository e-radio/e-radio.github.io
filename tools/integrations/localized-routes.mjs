import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Reuse the original page modules, including their getStaticPaths implementations.
export function localizedRoutes(site) {
  const defaultLocale = site.defaultLocale || 'en';
  return {
    name: 'country-localized-routes',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        if (site.countryCode === 'GR') {
          for (const locale of (site.locales || ['en'])) {
            injectRoute({ pattern: `${locale === defaultLocale ? '' : `/${locale}`}/guides/radiofonikoi-stathmoi-athina`, entrypoint: resolve('src/components/guides/AthensRadio.astro'), prerender: true });
            injectRoute({ pattern: `${locale === defaultLocale ? '' : `/${locale}`}/guides/greek-radio-online`, entrypoint: resolve('src/components/guides/GreekRadio.astro'), prerender: true });
            injectRoute({ pattern: `${locale === defaultLocale ? '' : `/${locale}`}/guides/find-greek-radio-stations`, entrypoint: resolve('src/components/guides/GreekStationFinder.astro'), prerender: true });
          }
        }
        if (site.countryCode === 'HR') {
          for (const locale of (site.locales || ['en'])) {
            injectRoute({ pattern: `${locale === defaultLocale ? '' : `/${locale}`}/guides/koji-hrvatski-radio-slusati`, entrypoint: resolve('src/components/guides/CroatianStations.astro'), prerender: true });
          }
        }
        for (const locale of (site.locales || []).filter(locale => locale !== defaultLocale)) {
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
