// Repair UTF-8 bytes mistakenly represented as Latin-1 characters by a provider.
// Decode only valid byte sequences; leave normal Unicode and malformed data alone.
export function repairMetadataText(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/(?:[\u00c2-\u00f4][\u0080-\u00bf]+)+/g, sequence => {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(
        Uint8Array.from(sequence, character => character.charCodeAt(0))
      );
    } catch {
      return sequence;
    }
  });
}
