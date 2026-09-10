import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = process.cwd();
export const countryCode = (process.env.COUNTRY || 'gr').toLowerCase();
if (!/^[a-z]{2}$/.test(countryCode)) throw new Error('COUNTRY must be a two-letter country code');
export const site = JSON.parse(readFileSync(resolve(root, `countries/${countryCode}.json`), 'utf8'));
if (site.countryCode !== countryCode.toUpperCase()) throw new Error('Country configuration code mismatch');
site.siteUrl = (process.env.SITE_URL || site.siteUrl).replace(/\/$/, '');
const url = new URL(site.siteUrl);
if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/') throw new Error('SITE_URL must be a site origin (use a GitHub Pages user/organization site or custom domain)');
export const stationsPath = resolve(root, site.stationsFile);
export const redirects = JSON.parse(readFileSync(resolve(root, site.redirectsFile), 'utf8'));
site.siteShortName ||= site.siteName;
site.socialImage ||= '/icons/icon-512x512.png';
site.logo ||= '/icons/icon-32x32.png';
site.favicon ||= '/favicon.svg';
site.favicon32 ||= '/icons/icon-32x32.png';
site.icon192 ||= '/icons/icon-192x192.png';
site.icon512 ||= '/icons/icon-512x512.png';
site.appleTouchIcon ||= '/icons/apple-touch-icon.png';
site.socialLocale ||= 'en_US';
site.introText ||= `Discover radio stations from ${site.countryName} and listen live online.`;
export const countryText = text => text
  .replaceAll('Greece', site.countryName)
  .replaceAll('Greek', site.countryAdjective);
