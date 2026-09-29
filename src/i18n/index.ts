import { translate, type Locale } from './translate';
export { translate } from './translate';
import { site } from '../../countries/site.mjs';
export const locales: Locale[] = (site.locales || ['en']).filter((locale: string) => ['en', 'hr', 'el', 'sv', 'nl', 'pl'].includes(locale));
export const defaultLocale: Locale = locales.includes(site.defaultLocale) ? site.defaultLocale : 'en';
export const multilingual = locales.length > 1;
export const languageNames = { en: 'English', hr: 'Hrvatski', el: 'Ελληνικά', sv: 'Svenska', nl: 'Nederlands', pl: 'Polski' };
export function localeFor(url: URL): Locale {
  return locales.find(locale => locale !== defaultLocale && (url.pathname === `/${locale}` || url.pathname.startsWith(`/${locale}/`))) || defaultLocale;
}
export function languagePath(path: string, locale: Locale): string {
  const prefix = locales.find(language => language !== defaultLocale && (path === `/${language}` || path.startsWith(`/${language}/`)));
  const base = (prefix ? path.slice(prefix.length + 1) : path) || '/';
  return locale !== defaultLocale && locales.includes(locale) ? `/${locale}${base}` : base;
}
export function localeHelpers(url: URL) {
  const locale = localeFor(url);
  function localizePath(value: string): string;
  function localizePath(value: undefined): undefined;
  function localizePath(value: string | undefined): string | undefined;
  function localizePath(value: string | undefined): string | undefined {
    if (!value || !multilingual || value.startsWith('#')) return value;
    const absolute = value.startsWith(site.siteUrl);
    const path = absolute ? value.slice(site.siteUrl.length) || '/' : value;
    if (!path.startsWith('/') || path.startsWith('//') || /\.[a-z0-9]+(?:[?#]|$)/i.test(path)) return value;
    const localized = languagePath(path, locale);
    return absolute ? `${site.siteUrl}${localized}` : localized;
  }
  return { locale, t: (value: any, args?: any[]) => translate(value, locale, args), localizePath };
}
