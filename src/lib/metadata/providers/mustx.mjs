import { parseChannel, historyChannel } from './radiomust.mjs';

export const parse = payload => parseChannel(payload, 'mustx');
export const history = payload => historyChannel(payload, 'mustx');
