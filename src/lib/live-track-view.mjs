export function updateTrackText(element, text) {
  if (!element || element.textContent === text) return;
  const node = element.firstChild;
  if (node?.nodeType === 3 && element.childNodes.length === 1) {
    node.nodeValue = text;
  } else {
    element.textContent = text;
  }
}

// Keep failures local to each card for this page visit.
export function trackArtworkController(image, fallback, baseUrl) {
  const failed = new Set();
  const fallbackUrl = new URL(fallback, baseUrl).href;
  image.addEventListener('error', () => {
    failed.add(image.src);
    if (image.src !== fallbackUrl) image.src = fallbackUrl;
  });
  return artwork => {
    let target = fallbackUrl;
    try {
      const url = new URL(artwork);
      if (url.protocol === 'https:' && !failed.has(url.href)) target = url.href;
    } catch { /* Missing or invalid artwork uses the station logo. */ }
    if (image.src !== target && !failed.has(target)) image.src = target;
    return target === fallbackUrl;
  };
}
