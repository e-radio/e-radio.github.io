import { parseTextHistory } from '../common.mjs';

const clean = value => typeof value === 'string'
  ? value.replace(/^\s*(?:<|&lt;){5}\s*PLANET\s+LAKONIAS\s*:\s*ONAIR\s*/iu, '').trim() : '';
const stationId = value => /^PLANET\s+LAKONIAS\s+102[,.]3\s+FM\s+STEREO$/iu.test(value);

export function parse(payload) {
  const title = clean(payload?.songtitle);
  return { song: { text: stationId(title) ? '' : title }, listeners: payload?.currentlisteners };
}

export const textHistory = raw => parseTextHistory(raw)
  .map(entry => ({ ...entry, title: clean(entry.title) }))
  .filter(entry => entry.title && !stationId(entry.title));
