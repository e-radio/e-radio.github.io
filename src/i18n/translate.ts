import hr from './hr.json';
import el from './el.json';
export type Locale = 'en' | 'hr' | 'el';
const dictionaries: Record<string, Record<string, string>> = { hr, el };
// Full-message patterns support SEO sentences assembled by shared data helpers.
const makePatterns = (messages: Record<string, string>) => Object.entries(messages).filter(([key]) => /\{\d+\}/.test(key) && !['{0} station{1}', '{0} · {1}', '← {0}'].includes(key)).map(([key, value]) => {
  const slots: number[] = [];
  const source = key.split(/(\{\d+\})/).map(part => {
    if (/^\{\d+\}$/.test(part)) { slots.push(Number(part.slice(1, -1))); return '(.+?)'; }
    return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('');
  return { regex: new RegExp(`^${source}$`), value, slots, length: key.length };
}).sort((a, b) => b.length - a.length);
const localePatterns = Object.fromEntries(Object.entries(dictionaries).map(([locale, messages]) => [locale, makePatterns(messages)]));
export function translate(value: any, locale: Locale, args?: any[]): any {
  if (typeof value !== 'string') return value;
  let result = value.replaceAll('&copy;', '©').replaceAll('&amp;', '&');
  let values = args;
  const messages = dictionaries[locale];
  if (messages) {
    if (messages[value]) result = messages[value];
    else if (!args) {
      for (const pattern of localePatterns[locale]) {
        const match = value.match(pattern.regex);
        if (!match) continue;
        result = pattern.value; values = [];
        pattern.slots.forEach((slot, i) => { values![slot] = match[i + 1]; });
        break;
      }
    }
  }
  if (messages && result === value && !values) {
    for (const separator of [' · ', ', ']) {
      if (value.includes(separator)) return value.split(separator).map(part => translate(part, locale)).join(separator);
    }
  }
  return values ? result.replace(/\{(\d+)\}/g, (_, i) => String(translate(values![Number(i)] ?? '', locale))) : result;
}

export function clientTranslate(value: any, args?: any[]): any {
  return translate(value, typeof document !== 'undefined' && document.documentElement.lang in dictionaries ? document.documentElement.lang as Locale : 'en', args);
}
