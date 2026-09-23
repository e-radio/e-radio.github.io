#!/usr/bin/env python3
"""Probe missing bitrate, codec and empty genres; use --write to apply identified values."""
import argparse
import importlib.util
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location('genre_cleanup', ROOT / 'tools/clean-station-genres.py')
_cleanup = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_cleanup)


def genre_rules(country=None):
    rules = json.loads((ROOT / 'tools/config/genre-cleanup.json').read_text())
    custom = ROOT / f'countries/{country}.genre-cleanup.json'
    extra = json.loads(custom.read_text()) if country and custom.exists() else {}
    aliases = {_cleanup.canonical(k): [_cleanup.canonical(v) for v in (values if isinstance(values, list) else [values])]
               for k, values in {**rules['aliases'], **extra.get('aliases', {})}.items()}
    remove = {_cleanup.canonical(v) for v in rules['remove'] + extra.get('remove', [])}
    return aliases, remove


DEFAULT_GENRE_RULES = genre_rules()


def missing_codec(value):
    return not value or str(value).upper() == 'UNKNOWN'


def stream_genres(payload, audio, rules=None):
    """Use explicit genre tags only, never station names or current song titles."""
    genres = []
    for tags in [payload.get('format', {}).get('tags', {}), audio.get('tags', {})]:
        for key, value in tags.items():
            if key.lower().replace('_', '-') not in ('genre', 'icy-genre') or not isinstance(value, str):
                continue
            for part in re.split(r'[,;|]', _cleanup.canonical(value)):
                genre = ' '.join(part.split()).lower()
                if genre and genre not in ('unknown', 'undefined', 'unspecified', 'none', 'null', 'n/a', '-',
                                           'default genre', 'my genre', 'icecast') and genre not in genres:
                    genres.append(genre)
    aliases, remove = rules if rules is not None else DEFAULT_GENRE_RULES
    return _cleanup.clean_genres(genres, aliases, remove)


def probe(url, rules=None):
    result = {'url': url}
    try:
        process = subprocess.run(['ffprobe', '-v', 'error', '-rw_timeout', '8000000',
                                  '-analyzeduration', '5000000', '-probesize', '262144',
                                  '-show_entries', 'stream=codec_type,codec_name,profile,bit_rate:stream_tags:format_tags',
                                  '-of', 'json', url], capture_output=True, text=True, timeout=20)
        payload = json.loads(process.stdout or '{}')
        audio = next((s for s in payload.get('streams', []) if s.get('codec_type') == 'audio'), None)
        if not audio:
            result['error'] = process.stderr.strip() or 'No audio stream identified'
            return result
        result['ffprobe_audio'] = audio
        genres = stream_genres(payload, audio, rules)
        if genres:
            result['genres'] = genres
        codec = audio.get('codec_name')
        if codec:
            result['codec'] = {'mp3': 'MP3', 'aac': 'AAC+' if 'HE-AAC' in audio.get('profile', '') else 'AAC',
                               'vorbis': 'OGG', 'opus': 'OPUS', 'flac': 'FLAC'}.get(codec, codec.upper())
        bitrate = int(audio.get('bit_rate', 0))
        if bitrate > 0:
            result['bitrate'] = max(1, round(bitrate / 1000))
    except Exception as exc:
        result['error'] = str(exc)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--country', default=os.environ.get('COUNTRY', 'gr'), help='Country code (defaults to COUNTRY or gr)')
    args = parser.parse_args()
    country = args.country.lower()
    if not re.fullmatch(r'[a-z]{2}', country):
        parser.error('Country must be a two-letter code')
    config = json.loads((ROOT / f'countries/{country}.json').read_text())
    rules = genre_rules(country)
    path = ROOT / config['stationsFile']
    original = path.read_text()
    stations = json.loads(original)
    targets = [s for s in stations if not s.get('bitrate') or missing_codec(s.get('codec')) or s.get('genres') == []]
    urls = sorted({s['stream_url'] for s in targets if s.get('stream_url')})
    results = {}
    with ThreadPoolExecutor(max_workers=16) as pool:
        futures = [pool.submit(probe, url, rules) for url in urls]
        for future in as_completed(futures):
            result = future.result()
            results[result['url']] = result
            if len(results) % 25 == 0:
                print(f'Probed {len(results)}/{len(urls)} streams', flush=True)
    changes = {}
    for station in targets:
        result = results.get(station.get('stream_url'), {})
        fields = {}
        if not station.get('bitrate') and result.get('bitrate'):
            fields['bitrate'] = result['bitrate']
        if missing_codec(station.get('codec')) and result.get('codec'):
            fields['codec'] = result['codec']
        if station.get('genres') == [] and result.get('genres'):
            fields['genres'] = result['genres']
        if fields:
            changes[station['slug']] = fields
    report = {'country': country, 'checked_urls': len(urls), 'target_entries': len(targets), 'changes': changes,
              'results': [results[url] for url in urls]}
    report_path = ROOT / ('reports/stream-audio-info.json' if country == 'gr' else f'reports/stream-audio-info-{country}.json')
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    if args.write:
        if path.read_text() != original:
            raise RuntimeError('Data changed during scan; report saved without overwriting data')
        # Locate array objects with the JSON decoder to preserve original formatting.
        decoder = json.JSONDecoder()
        offset = original.index('[') + 1
        edits = []
        while True:
            while original[offset].isspace() or original[offset] == ',':
                offset += 1
            if original[offset] == ']':
                break
            station, end = decoder.raw_decode(original, offset)
            fields = changes.get(station['slug'], {})
            if fields:
                block = original[offset:end]
                for key, value in fields.items():
                    block, count = re.subn(r'("' + key + r'"\s*:\s*)(\[\s*\]|null|"[^"\\]*"|\d+)',
                                          lambda m: m.group(1) + json.dumps(value), block, count=1)
                    if count != 1:
                        raise RuntimeError(f'Missing field {key} in {station["slug"]}')
                edits.append((offset, end, block))
            offset = end
        updated = original
        for start, end, block in reversed(edits):
            updated = updated[:start] + block + updated[end:]
        json.loads(updated)
        path.write_text(updated)
    print(f'{len(changes)} station entries ' + ('updated' if args.write else 'eligible'))
    print(f'Report: {report_path}')
    print('Bitrates:', sum('bitrate' in c for c in changes.values()), 'Codecs:', sum('codec' in c for c in changes.values()),
          'Genres:', sum('genres' in c for c in changes.values()))


if __name__ == '__main__':
    main()
