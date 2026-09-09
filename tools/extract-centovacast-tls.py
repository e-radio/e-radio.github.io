#!/usr/bin/env python3
"""Extract proxytuneinurltls; --write saves fields and verified HTTP default upgrades."""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
from pathlib import Path
import subprocess
import urllib.request
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]


def check(station):
    result = {'slug': station['slug'], 'endpoint': station['nowplaying_url']}
    try:
        with urllib.request.urlopen(result['endpoint'], timeout=10) as response:
            payload = json.loads(response.read(2_000_001))
        data = payload.get('data', [])
        if payload.get('type') != 'result' or not isinstance(data, list) or len(data) != 1 or not isinstance(data[0], dict):
            raise ValueError('Expected one CentovaCast station response')
        raw = data[0].get('proxytuneinurltls')
        if not isinstance(raw, str) or not raw.strip():
            result['status'] = 'not_available'
            return result
        url = raw.strip()
        parsed = urlsplit(url)
        if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password:
            raise ValueError('Proxy URL is not a valid HTTPS URL')
        result.update(status='extracted', proxytuneinurltls=url)
        if station['stream_url'].startswith('http://'):
            probe = subprocess.run(['ffprobe', '-v', 'error', '-tls_verify', '1', '-rw_timeout', '5000000',
                                    '-analyzeduration', '3000000', '-probesize', '262144',
                                    '-show_entries', 'stream=codec_type,codec_name', '-of', 'json', url],
                                   capture_output=True, text=True, timeout=15)
            streams = json.loads(probe.stdout or '{}').get('streams', [])
            result['upgrade_verified'] = probe.returncode == 0 and any(s.get('codec_type') == 'audio' for s in streams)
            if not result['upgrade_verified']:
                result['upgrade_error'] = probe.stderr.strip() or 'No audio identified'
    except Exception as exc:
        result['error'] = str(exc)
        result.setdefault('status', 'failed')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    path = ROOT / 'src/data/stations-gr.json'
    original = path.read_text()
    stations = json.loads(original)
    targets = [s for s in stations if s.get('metadata_server') == 'centovacast' and s.get('nowplaying_url')]
    results = []
    with ThreadPoolExecutor(max_workers=12) as pool:
        futures = [pool.submit(check, s) for s in targets]
        for future in as_completed(futures):
            results.append(future.result())
    by_slug = {r['slug']: r for r in results}
    upgraded = 0
    for station in stations:
        result = by_slug.get(station['slug'], {})
        if result.get('proxytuneinurltls'):
            station['proxytuneinurltls'] = result['proxytuneinurltls']
        if result.get('upgrade_verified'):
            old = station['stream_url']
            station['stream_url'] = result['proxytuneinurltls']
            for stream in station.get('streams', []):
                if stream['url'] == old:
                    stream['url'] = station['stream_url']
                    stream['alternate_urls'] = list(dict.fromkeys(stream.get('alternate_urls', []) + [old]))
            upgraded += 1
    report = {'checked': len(targets), 'extracted': sum(r.get('status') == 'extracted' for r in results),
              'verified_upgrades': upgraded, 'written': args.write, 'results': sorted(results, key=lambda r:r['slug'])}
    (ROOT / 'reports/centovacast-tls.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    if args.write:
        if path.read_text() != original:
            raise RuntimeError('Station data changed during extraction; report saved, data not overwritten')
        path.write_text(json.dumps(stations, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k:v for k,v in report.items() if k != 'results'}))


if __name__ == '__main__':
    main()
