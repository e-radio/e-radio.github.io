export const artworkUrl = (payload, endpoint = "https://localhost/") => {
      if (!payload || typeof payload !== 'object') return null;

      const candidates = [];
      const addArtworkFields = (source) => {
        if (!source || typeof source !== 'object') return;
        for (const key of ['art', 'art_url', 'artwork', 'artwork_url', 'cover', 'cover_url', 'image', 'image_url', 'imageurl', 'thumb']) {
          const value = source[key];
          if (typeof value === 'string') {
            candidates.push(value);
          } else if (value && typeof value === 'object') {
            for (const nestedKey of ['url', 'src', 'large', 'medium', 'small']) {
              if (typeof value[nestedKey] === 'string') candidates.push(value[nestedKey]);
            }
          }
        }
      };

      addArtworkFields(payload);
      addArtworkFields(payload.song);
      addArtworkFields(payload.track);
      addArtworkFields(payload.now_playing);
      addArtworkFields(payload.now_playing?.song);
      addArtworkFields(payload.current_track);

      if (Array.isArray(payload.now_playing)) {
        payload.now_playing.forEach((entry) => {
          addArtworkFields(entry);
          addArtworkFields(entry?.song);
        });
      }

      if (Array.isArray(payload.data)) {
        payload.data.forEach((entry) => {
          addArtworkFields(entry);
          addArtworkFields(entry?.track);
        });
      }

      if (payload.icestats?.source) {
        const sources = Array.isArray(payload.icestats.source)
          ? payload.icestats.source
          : [payload.icestats.source];
        sources.forEach(addArtworkFields);
      }

      for (const candidate of candidates) {
        const value = candidate.trim();
        if (!value || value.startsWith('data:') || value.startsWith('javascript:')) continue;
        try {
          const resolved = new URL(value, endpoint);
          if (resolved.protocol === 'http:' || resolved.protocol === 'https:') return resolved.href;
        } catch (error) {
          // Ignore malformed artwork values and keep checking candidates.
        }
      }

      return null;
    };


export const gatherSongHistory = (payload) => {
      if (!payload || typeof payload !== 'object') {
        return [];
      }

      const collected = [];
      const pushEntry = (source) => {
        if (!source) return;
        const clone = { ...source };
        const playedAt = clone.played_at ?? clone.playedat ?? clone.playedat_ts ?? clone.played ?? clone.timestamp ?? clone.date;
        if (playedAt && !clone.played_at) {
          clone.played_at = playedAt;
        }
        if (!clone.time && clone.played_at) {
          clone.time = clone.played_at;
        }
        if (clone.song && typeof clone.song === 'string') {
          clone.song = { text: clone.song };
        }
        collected.push(clone);
      };

      const candidates = [
        Array.isArray(payload.song_history) ? payload.song_history : null,
        Array.isArray(payload.songhistory) ? payload.songhistory : null,
        Array.isArray(payload.history) ? payload.history : null,
      ];

      candidates.forEach((items) => {
        if (!items) return;
        items.forEach((entry) => pushEntry(entry));
      });

      return collected;
    };


export const parseTextHistory = (rawText) => {
      if (!rawText) return [];
      const cleanedText = rawText.replace(/\r/g, '');
      const lines = cleanedText.split('\n').map((line) => line.trim()).filter(Boolean);

      const timePattern = /^(\d{2}:\d{2}:\d{2})/;
      const entries = [];

      lines.forEach((line) => {
        const match = line.match(timePattern);
        if (!match) return;
        let title = line.slice(match[0].length).trim();
        title = title.replace(/\*\*Current Song\*\*/gi, '').replace(/Current Song/gi, '').trim();
        title = title.replace(/^[-–—\s]+/, '').trim();
        title = title.replace(/\*{2}/g, '').trim();
        if (!title) return;
        entries.push({ time: match[1], title });
      });

      return entries;
    };

