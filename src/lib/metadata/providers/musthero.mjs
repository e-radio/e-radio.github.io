import { parseChannel, historyChannel } from './radiomust.mjs';

export const parse = payload => parseChannel(payload, 'musthero');
export const history = payload => historyChannel(payload, 'musthero');
