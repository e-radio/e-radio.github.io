export function decode(response) {
  const raw = response.includes('Markdown Content:')
    ? response.slice(response.indexOf('Markdown Content:') + 'Markdown Content:'.length).trim()
    : response.trim();
  const title = JSON.parse(raw);
  if (typeof title !== 'string') throw new Error('Invalid ERT Echo now-playing response');
  return title;
}

export function parse(payload) {
  const text = typeof payload === 'string' ? payload.trim() : '';
  const separator = /\s+[-–—]\s+/u.exec(text);
  if (!separator) return { song: text ? { title: text } : null };
  const artist = text.slice(0, separator.index).trim();
  const title = text.slice(separator.index + separator[0].length).trim();
  return { song: artist && title ? { artist, title } : { title: text } };
}
