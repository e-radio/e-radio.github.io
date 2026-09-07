export function cleanStreamUrl(value) {
  if (typeof value !== 'string') return value;
  try {
    const { hostname, pathname } = new URL(value);
    if (hostname === 'radiojar.com' || hostname.endsWith('.radiojar.com')) {
      return `https://stream.radiojar.com${pathname}`;
    }
  } catch { /* Preserve unrecognized URLs for review. */ }
  return value;
}
