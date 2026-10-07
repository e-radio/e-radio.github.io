const clean = value => typeof value === 'string' ? value.trim() : '';

export function parse(payload) {
  const data = payload?.data?.status === 'success' ? payload.data : null;
  return { song: { artist: clean(data?.artist), title: clean(data?.song) } };
}
