export function decode(response) {
  const text = response.includes('Markdown Content:')
    ? response.slice(response.indexOf('Markdown Content:') + 'Markdown Content:'.length).trim()
    : response.trim();
  if (!text || /<[^>]+>/u.test(text) || text.includes('\n')) throw new Error('Invalid Rcast track response');
  return { songtitle: text };
}

export function parse(payload) {
  const text = typeof payload?.songtitle === 'string' ? payload.songtitle.trim() : '';
  const separator = /\s+-\s+/u.exec(text);
  if (!separator) return { song: { title: text } };
  const artist = text.slice(0, separator.index).trim();
  const title = text.slice(separator.index + separator[0].length).trim();
  return { song: artist && title ? { artist, title } : { title: text } };
}
