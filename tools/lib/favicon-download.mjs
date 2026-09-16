const MAX_BYTES = 10 * 1024 * 1024;
export function faviconUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Invalid favicon URL'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Expected an HTTP(S) URL without credentials');
  }
  return url.href;
}

export async function downloadFavicon(value, { userAgent, fetchImpl = fetch, retries = 2, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  const url = faviconUrl(value);
  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let permanent = false;
    try {
      const response = await fetchImpl(url, {
        redirect: 'follow', signal: controller.signal,
        headers: { Accept: 'image/*,*/*;q=0.1', 'User-Agent': userAgent || 'RadioDirectory favicon cache' },
      });
      if (!response.ok) {
        permanent = response.status < 500 && ![408, 429].includes(response.status);
        await response.body?.cancel();
        throw new Error(`HTTP ${response.status}`);
      }
      const type = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (type && !type.startsWith('image/') && !['application/octet-stream', 'binary/octet-stream', 'application/svg+xml'].includes(type)) {
        permanent = true;
        await response.body?.cancel();
        throw new Error(`Expected an image but received ${type}`);
      }
      if (Number(response.headers.get('content-length')) > MAX_BYTES) {
        permanent = true;
        await response.body?.cancel();
        throw new Error('Image exceeds 10 MB limit');
      }
      const chunks = [];
      let size = 0;
      const reader = response.body?.getReader();
      if (!reader) { permanent = true; throw new Error('Empty image response'); }
      while (true) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        size += chunk.length;
        if (size > MAX_BYTES) {
          permanent = true;
          await reader.cancel();
          throw new Error('Image exceeds 10 MB limit');
        }
        chunks.push(Buffer.from(chunk));
      }
      if (!size) { permanent = true; throw new Error('Empty image response'); }
      return Buffer.concat(chunks);
    } catch (error) {
      if (permanent || attempt >= retries) throw error;
    } finally {
      clearTimeout(timeout);
    }
    await sleep(500 * (attempt + 1));
  }
}
