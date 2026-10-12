import { repairMetadataText } from '../../metadata-text.mjs';

export function parse(payload) {
  const text = repairMetadataText(payload?.icestats?.['/kiss2111']?.title)?.trim();
  if (!text) return { song: null };
  const separator = text.indexOf(' - ');
  return { song: separator > 0
    ? { artist: text.slice(0, separator).trim(), title: text.slice(separator + 3).trim() }
    : { title: text } };
}
