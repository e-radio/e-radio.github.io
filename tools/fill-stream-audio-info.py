#!/usr/bin/env python3
"""Probe missing station bitrate/codec; use --write to apply identified values."""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def missing_codec(value):
    return not value or str(value).upper() == 'UNKNOWN'


def probe(url):
    result = {'url': url}
    try:
        process = subprocess.run(['ffprobe', '-v', 'error', '-rw_timeout', '8000000',
                                  '-analyzeduration', '5000000', '-probesize', '262144',
                                  '-show_entries', 'stream=codec_type,codec_name,profile,bit_rate',
                                  '-of', 'json', url], capture_output=True, text=True, timeout=20)
        payload = json.loads(process.stdout or '{}')
        audio = next((s for s in payload.get('streams', []) if s.get('codec_type') == 'audio'), None)
        if not audio:
            result['error'] = process.stderr.strip() or 'No audio stream identified'
            return result
        result['ffprobe_audio'] = audio
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
    args = parser.parse_args()
    path = ROOT / 'src/data/stations-gr.json'
    original = path.read_text()
    stations = json.loads(original)
    targets = [s for s in stations if not s.get('bitrate') or missing_codec(s.get('codec'))]
    urls = sorted({s['stream_url'] for s in targets if s.get('stream_url')})
    results = {}
    with ThreadPoolExecutor(max_workers=16) as pool:
        futures = [pool.submit(probe, url) for url in urls]
        for future in as_completed(futures):
            result = future.result()
            results[result['url']] = result
            if len(results) % 25 == 0:
                print(f'Probed {len(results)}/{len(urls)} streams', flush=True)
    changes = {}
    for station in targets:
        result = results.get(station['stream_url'], {})
        fields = {}
        if not station.get('bitrate') and result.get('bitrate'):
            fields['bitrate'] = result['bitrate']
        if missing_codec(station.get('codec')) and result.get('codec'):
            fields['codec'] = result['codec']
        if fields:
            changes[station['slug']] = fields
    report = {'checked_urls': len(urls), 'target_entries': len(targets), 'changes': changes,
              'results': [results[url] for url in urls]}
    (ROOT / 'reports/stream-audio-info.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
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
                    block, count = re.subn(r'("' + key + r'"\s*:\s*)(null|"[^"\\]*"|\d+)',
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
    print('Bitrates:', sum('bitrate' in c for c in changes.values()), 'Codecs:', sum('codec' in c for c in changes.values()))


if __name__ == '__main__':
    main()
