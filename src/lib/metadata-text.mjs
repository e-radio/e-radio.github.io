// Repair UTF-8 bytes mistakenly represented as Latin-1 characters by a provider.
// Decode only valid byte sequences; leave normal Unicode and malformed data alone.
export function stripBroadcastLabel(value) {
  return typeof value === 'string'
    ? value.replace(/^(?:\s*(?:now\s+(?:playing|on\s+air)|playing|autodj)\s*:\s*)+/iu, '').trim()
    : value;
}

export function repairMetadataText(value) {
  if (typeof value !== 'string') return value;
  const repairedUtf8 = value.replace(/(?:[\u00c2-\u00f4][\u0080-\u00bf]+)+/g, sequence => {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(
        Uint8Array.from(sequence, character => character.charCodeAt(0))
      );
    } catch {
      return sequence;
    }
  });
  // Some Greek broadcasters send Windows-1253 bytes in Latin-1 JSON strings.
  // Require several high-byte letters so normal names like "Beyoncé" stay intact.
  if ((repairedUtf8.match(/[\u00c0-\u00ff]/g) || []).length < 3
    || /[^\u0000-\u00ff]/u.test(repairedUtf8)) return repairedUtf8;
  try {
    const decoded = new TextDecoder('windows-1253', { fatal: true }).decode(
      Uint8Array.from(repairedUtf8, character => character.charCodeAt(0))
    );
    const nonAscii = decoded.match(/[^\x00-\x7f]/g) || [];
    return nonAscii.length && nonAscii.filter(character => /[\u0370-\u03ff]/u.test(character)).length / nonAscii.length >= 0.7
      ? decoded : repairedUtf8;
  } catch {
    return repairedUtf8;
  }
}
