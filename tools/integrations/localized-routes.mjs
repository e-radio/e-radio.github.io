import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Reuse the original page modules, including their getStaticPaths implementations.
export function localizedRoutes(site) {
  return {
    name: 'country-localized-routes',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        if (site.countryCode !== 'HR' || !site.locales?.includes('hr')) return;
        const root = resolve('src/pages');
        injectRoute({ pattern: '/hr/site.webmanifest', entrypoint: resolve(root, 'site.webmanifest.ts'), prerender: true });
        for (const file of readdirSync(root, { recursive: true })) {
          if (!file.endsWith('.astro')) continue;
          const route = file.replace(/\.astro$/, '').replace(/(^|\/)index$/, '$1').replace(/\/$/, '');
          injectRoute({ pattern: `/hr/${route}`, entrypoint: resolve(root, file), prerender: true });
        }
      },
    },
  };
}
