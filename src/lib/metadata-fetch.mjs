// State lasts for this page load; keep using the last successful transport.
export function createMetadataFetcher({ timeout = 10000, fetchImpl = fetch } = {}) {
  const blocked = new Set();
  const preferred = new Map();
  async function request(endpoint, decode) {
    if (blocked.has(endpoint)) throw new Error('Metadata endpoint disabled until reload');
    const direct = endpoint.replace(/^https:\/\/(?:r\.jina\.ai|a\.tunzilla\.com)\//i, '');
    const first = preferred.get(endpoint) || endpoint;
    const candidates = [...new Set([first, direct, `https://a.tunzilla.com/${direct}`])];
    let failure;
    for (const url of candidates) {
      try {
        const response = await fetchImpl(url, { cache: 'no-store', signal: AbortSignal.timeout(timeout) });
        if (!response.ok) throw new Error(`Metadata HTTP ${response.status}`);
        const data = decode(await response.text());
        preferred.set(endpoint, url);
        return data;
      } catch (error) { failure = error; }
    }
    blocked.add(endpoint);
    throw failure;
  }
  return { request, isBlocked: endpoint => blocked.has(endpoint) };
}
