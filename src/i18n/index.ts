import { translate, type Locale } from './translate';
export { translate } from './translate';
import { site } from '../../countries/site.mjs';
export const locales: Locale[] = (site.locales || ['en']).filter((locale: string) => ['en', 'hr', 'el', 'sv', 'nl'].includes(locale));
export const multilingual = locales.length > 1;
export const languageNames = { en: 'English', hr: 'Hrvatski', el: 'Ελληνικά', sv: 'Svenska', nl: 'Nederlands' };
export function localeFor(url: URL): Locale {
  return locales.find(locale => locale !== 'en' && (url.pathname === `/${locale}` || url.pathname.startsWith(`/${locale}/`))) || 'en';
}
export function languagePath(path: string, locale: Locale): string {
  const prefix = locales.find(language => language !== 'en' && (path === `/${language}` || path.startsWith(`/${language}/`)));
  const base = (prefix ? path.slice(prefix.length + 1) : path) || '/';
  return locale !== 'en' && locales.includes(locale) ? `/${locale}${base}` : base;
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
