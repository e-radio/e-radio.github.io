export function parsePlsPlaylist(text) {
  if (typeof text !== 'string') return [];
  const fields = new Map();
  let inPlaylist = false;
  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (/^\[playlist\]$/iu.test(line)) { inPlaylist = true; continue; }
    if (/^\[/u.test(line)) { inPlaylist = false; continue; }
    if (!inPlaylist || !line || /^[;#]/u.test(line)) continue;
    const match = /^(File|Title|Length)(\d+)\s*=\s*(.*)$/iu.exec(line);
    if (!match) continue;
    const index = Number(match[2]);
    if (!Number.isSafeInteger(index) || index < 1) continue;
    const entry = fields.get(index) || {};
    entry[match[1].toLowerCase()] = match[3].trim();
    fields.set(index, entry);
  }
  return [...fields.entries()].sort(([a], [b]) => a - b).flatMap(([index, entry]) => {
    try {
      const url = new URL(entry.file);
      if (!['http:', 'https:'].includes(url.protocol)) return [];
      return [{ index, url: url.href, title: entry.title || '', length: entry.length || '' }];
    } catch { return []; }
  });
}
