import { parseChannel, historyChannel } from './radiomust.mjs';

export const parse = payload => parseChannel(payload, 'mustcafe');
export const history = payload => historyChannel(payload, 'mustcafe');
