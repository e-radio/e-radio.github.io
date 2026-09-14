export const legacyText = (payload, serverType = "unknown", streamUrl = "") => {
      if (!payload) return null;

      // Shoutcast's /stats?sid=1&json=1 response exposes the current track in
      // `songtitle`; prefer it over server/station title fields.
      if (serverType === 'shoutcast' && typeof payload.songtitle === 'string' && payload.songtitle.trim()) {
        return payload.songtitle.trim();
      }

      if (payload.icestats) {
        const sourceData = (() => {
          const { source } = payload.icestats;
          if (Array.isArray(source)) {
            const stream = new URL(streamUrl);
            const mount = stream.searchParams.get('mp') || stream.searchParams.get('mount') || stream.pathname;
            const normalizeMount = (value) => {
              try { return decodeURIComponent(value).replace(/\/+$/, '') || '/'; }
              catch { return value.replace(/\/+$/, '') || '/'; }
            };
            return source.find((entry) => {
              const value = entry?.listenurl || entry?.mount;
              if (typeof value !== 'string') return false;
              try { return normalizeMount(new URL(value, stream.origin).pathname) === normalizeMount(mount.startsWith('/') ? mount : `/${mount}`); }
              catch { return false; }
            });
          }
          return source;
        })();

        if (sourceData) {
          const { yp_currently_playing, title, songtitle, artist, server_name } = sourceData;
          const candidates = [yp_currently_playing, title, songtitle]
            .concat(artist && title ? `${artist} – ${title}` : null)
            .concat(server_name && title ? `${server_name} – ${title}` : null)
            .filter((value) => typeof value === 'string' && value.trim());
          const resolved = candidates.find((value) => Boolean(value?.trim()));
          if (resolved) {
            return resolved.trim();
          }
        }
      }

      if (Array.isArray(payload.data) && payload.data.length > 0) {
        const entry = payload.data[0];
        if (entry) {
          if (typeof entry.song === 'string' && entry.song.trim()) {
            return entry.song.trim();
          }
          if (entry.track) {
            const { artist, title } = entry.track;
            const candidates = [artist, title].filter((value) => typeof value === 'string' && value.trim());
            if (candidates.length > 0) {
              return candidates.join(' – ');
            }
          }
          if (typeof entry.summary === 'string' && entry.summary.trim()) {
            const summary = entry.summary.replace(/<[^>]+>/g, '').trim();
            if (summary) return summary;
          }
        }
      }

      if (payload.now_playing?.song) {
        const { artist, title, text } = payload.now_playing.song;
        if (text) return text;
        const parts = [];
        if (artist) parts.push(artist);
        if (title) parts.push(title);
        if (parts.length > 0) return parts.join(' – ');
      }

      if (payload.current_track) {
        const { artist, title } = payload.current_track;
        if (artist || title) {
          return [artist, title].filter(Boolean).join(' – ');
        }
      }

      if (Array.isArray(payload.now_playing) && payload.now_playing.length > 0) {
        const entry = payload.now_playing[0];
        const { artist, title, song } = entry;
        if (song) return song;
        if (artist || title) return [artist, title].filter(Boolean).join(' – ');
      }

      if (typeof payload.title === 'string' && payload.title.trim()) {
        return [payload.artist, payload.title].filter(value => typeof value === 'string' && value.trim()).map(value => value.trim()).join(' – ');
      }

      if (typeof payload.song === 'string' && payload.song.trim()) {
        return payload.song.trim();
      }

      if (payload.artist || payload.track) {
        return [payload.artist, payload.track].filter(Boolean).join(' – ');
      }

      if (typeof payload.songtitle === 'string' && payload.songtitle.trim()) {
        return payload.songtitle.trim();
      }

      const text = payload.text || payload.message;
      if (typeof text === 'string' && text.trim()) {
        return text.trim();
      }

      return null;
    };


export function parse(payload, context) {
  return { song: { text: legacyText(payload, 'unknown', context.streamUrl) },
    history: payload?.song_history || payload?.songhistory || payload?.history || [],
    next: payload?.playing_next || payload?.next_track || payload?.queue?.[0],
    listeners: payload?.listeners?.current ?? payload?.currentlisteners };
}
export const history = payload => payload;
