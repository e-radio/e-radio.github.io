#!/usr/bin/env node
// Verify saved URLs without changing station records.
import { radiojarHistoryTracks } from '../src/lib/radiojar.mjs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { centovaHistoryTracks } from '../src/lib/centovacast-history.mjs';
const root = new URL('../', import.meta.url);
const stations = JSON.parse(await readFile(new URL('src/data/stations-gr.json', root), 'utf8'))
  .filter(s => s.nowplaying_url);
const cache = new Map();
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
function fetchJson(url) {
  if (!cache.has(url)) cache.set(url, (async () => {
    try {
      const response = await fetch(url, {signal: AbortSignal.timeout(10000), headers: {Accept: 'application/json'}});
      if (!response.ok) return {error: `HTTP ${response.status}`};
      const reader = response.body.getReader();
      const chunks = []; let size = 0;
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 2000000) { await reader.cancel(); return {error: 'Response exceeds 2 MB'}; }
        chunks.push(value);
      }
      return {payload: JSON.parse(Buffer.concat(chunks).toString('utf8')), final_url: response.url};
    } catch (error) { return {error: error.cause?.message || error.message}; }
  })());
  return cache.get(url);
}
function currentText(payload, station) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  switch (station.metadata_server) {
    case 'radiojar': return [payload.title].find(nonempty);
    case 'azuracast': return [payload.now_playing?.song?.text, payload.now_playing?.song?.title].find(nonempty);
    case 'shoutcast': return [payload.songtitle].find(nonempty);
    case 'centovacast': return (Array.isArray(payload.data) ? payload.data : []).flatMap(e => [e.song, e.track?.title]).find(nonempty);
    case 'icecast': {
      const stream = new URL(station.stream_url);
      const mount = stream.searchParams.get('mp') || stream.searchParams.get('mount') || stream.pathname;
      const sources = [payload.icestats?.source].flat().filter(Boolean);
      return sources.filter(source => {
        try { return new URL(source.listenurl).pathname.replace(/\/+$/, '') === mount.replace(/\/+$/, ''); }
        catch { return source.mount === mount; }
      }).flatMap(s => [s.title, s.yp_currently_playing]).find(nonempty);
    }
    default: return null;
  }
}
function historyCount(payload, server) {
  if (server === 'radiojar') return radiojarHistoryTracks(payload).length;
  if (server === 'centovacast') return centovaHistoryTracks(payload).length;
  if (server === 'azuracast') return (payload?.song_history || []).filter(e => nonempty(e.song?.text) || nonempty(e.song?.title)).length;
  if (server === 'shoutcast') return (Array.isArray(payload) ? payload : []).filter(e => nonempty(e.title)).length;
  return 0;
}
let cursor = 0;
const results = [];
async function worker() {
  while (cursor < stations.length) {
    const station = stations[cursor++];
    const result = {slug: station.slug, nowplaying_url: station.nowplaying_url, metadata_server: station.metadata_server};
    const response = await fetchJson(station.nowplaying_url);
    const title = currentText(response.payload, station);
    result.nowplaying_status = response.error ? 'request_failed' : title ? 'verified' : 'no_matching_track';
    if (response.error) result.error = response.error;
    if (title) result.track = title;
    if (response.payload?.now_playing?.played_at) result.played_at = response.payload.now_playing.played_at;
    if (station.history_url) {
      result.history_url = station.history_url;
      const history = await fetchJson(station.history_url);
      result.history_count = historyCount(history.payload, station.metadata_server);
      result.history_status = history.error ? 'request_failed' : result.history_count ? 'verified' : 'no_tracks';
      if (history.error) result.history_error = history.error;
    }
    results.push(result);
    if (results.length % 100 === 0) console.log(`Verified ${results.length}/${stations.length} station configurations`);
  }
}
await Promise.all(Array.from({length: 16}, worker));
const count = field => Object.fromEntries([...new Set(results.map(r => r[field]).filter(Boolean))].map(status => [status, results.filter(r => r[field] === status).length]));
const report = {checked_at: new Date().toISOString(), checked: results.length,
  scope: 'Saved endpoints; current response and matching Icecast mount. Does not establish browser/CORS compatibility, track freshness, or independent station identity for every server.',
  nowplaying: count('nowplaying_status'), history: count('history_status'), results: results.sort((a,b) => a.slug.localeCompare(b.slug))};
await mkdir(new URL('reports/', root), {recursive: true});
await writeFile(new URL('reports/metadata-verification.json', root), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({checked: report.checked, nowplaying: report.nowplaying, history: report.history}, null, 2));
