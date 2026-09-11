import { translate, type Locale } from './translate';
export { translate } from './translate';
import { site } from '../../countries/site.mjs';
export const multilingual = site.countryCode === 'HR' && site.locales?.includes('hr');
export function localeFor(url: URL): Locale {
  return multilingual && /^\/hr(?:\/|$)/.test(url.pathname) ? 'hr' : 'en';
}
export function languagePath(path: string, locale: Locale): string {
  const base = path.replace(/^\/hr(?=\/|$)/, '') || '/';
  return locale === 'hr' ? `/hr${base}` : base;
}
export function localeHelpers(url: URL) {
  const locale = localeFor(url);
  return {
    locale,
    t: (value: any, args?: any[]) => translate(value, locale, args),
    localizePath: (value: string | undefined) => {
      if (!value || !multilingual || value.startsWith('#')) return value;
      const absolute = value.startsWith(site.siteUrl);
      const path = absolute ? value.slice(site.siteUrl.length) || '/' : value;
      if (!path.startsWith('/') || path.startsWith('//') || /\.[a-z0-9]+(?:[?#]|$)/i.test(path)) return value;
      const localized = languagePath(path, locale);
      return absolute ? `${site.siteUrl}${localized}` : localized;
    },
  };
}
