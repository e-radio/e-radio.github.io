import sharp from 'sharp';

const decode = value => value.replace(/&(?:amp|quot|apos|lt|gt);/g, entity => ({'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>'})[entity]);
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m => [m[1].toLowerCase(), decode(m[2] ?? m[3] ?? m[4])]));
const absolute = (value, base) => {
  if (typeof value !== 'string' || !value.trim()) return null;
  try { const url = new URL(value, base); return /^https?:$/.test(url.protocol) ? url.href : null; } catch { return null; }
};
export function uniqueCandidates(candidates) {
  const found = new Map();
  for (const candidate of candidates) {
    if (candidate.url && (!found.has(candidate.url) || found.get(candidate.url).score < candidate.score)) found.set(candidate.url, candidate);
  }
  return [...found.values()].sort((a,b) => b.score-a.score);
}
export function discoverIconCandidates(html, pageUrl) {
  const candidates = [], manifests = [];
  const baseTag = html.match(/<base\b[^>]*>/i);
  const base = baseTag && absolute(attrs(baseTag[0]).href, pageUrl) || pageUrl;
  const add = (url, source, score) => { if (url) candidates.push({url:absolute(url,base), source, score}); };
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const a = attrs(match[0]), rel=(a.rel || '').toLowerCase();
    if (rel.split(/\s+/).includes('manifest') && a.href) manifests.push(absolute(a.href,base));
    if (/icon/.test(rel)) add(a.href,rel,rel.includes('apple-touch-icon') ? 6 : 4);
  }
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const a=attrs(match[0]), key=(a.property || a.name || '').toLowerCase();
    if (['og:image','og:image:url','twitter:image','twitter:image:src'].includes(key)) add(a.content,key,3);
  }
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if ((attrs(match[1]).type || '').toLowerCase() !== 'application/ld+json') continue;
    const visit = value => {
      if (!value || typeof value !== 'object') return;
      const logos = Array.isArray(value.logo) ? value.logo : [value.logo];
      for (const logo of logos) add(typeof logo === 'string' ? logo : logo?.contentUrl || logo?.url || logo?.['@id'], 'JSON-LD logo', 9);
      for (const child of Object.values(value)) if (typeof child === 'object') visit(child);
    };
    try { visit(JSON.parse(match[2])); } catch { /* Other sources remain usable. */ }
  }
  for (const header of html.matchAll(/<header\b[^>]*>([\s\S]*?)<\/header\s*>/gi)) {
    for (const match of header[1].matchAll(/<img\b[^>]*>/gi)) {
      const a=attrs(match[0]);
      if (/logo/i.test([a.class,a.id,a.alt,a.src,a['data-src']].join(' '))) add(a['data-src'] || a.src,'header logo',8);
    }
  }
  return {candidates:uniqueCandidates(candidates), manifests:[...new Set(manifests.filter(Boolean))]};
}
export function manifestIconCandidates(manifest, manifestUrl) {
  return uniqueCandidates((Array.isArray(manifest?.icons) ? manifest.icons : []).filter(icon => typeof icon?.src === 'string').map(icon => ({url:absolute(icon.src,manifestUrl),source:'web manifest',score:6})));
}
export async function inspectIcon(buffer) {
  const metadata = await sharp(buffer).metadata();
  const {width,height} = metadata;
  if (!width || !height) throw new Error('Image has no usable dimensions');
  const shortest = Math.min(width,height), ratio = Math.max(width,height)/shortest;
  // Real decoded dimensions take precedence over HTML sizes attributes.
  const quality = Math.min(shortest / 64, 4) + (ratio <= 1.25 ? 3 : ratio <= 2 ? 0 : -5) - (shortest < 64 ? 6 : 0);
  return {width,height,quality};
}
export async function normalizeIcon(buffer) {
  return sharp(buffer).rotate().resize(256,256,{fit:'contain',position:'centre',background:{r:255,g:255,b:255,alpha:0}}).webp({quality:90}).toBuffer();
}
