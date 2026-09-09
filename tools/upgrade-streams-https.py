#!/usr/bin/env python3
"""Audit HTTP streams; --write replaces only verified HTTPS audio URLs."""
import argparse
import concurrent.futures
import json
from pathlib import Path
import subprocess
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def check(url):
    candidate = 'https://' + url[len('http://'):]
    result = {'http_url': url, 'https_url': candidate, 'verified': False}
    try:
        # Default TLS verification remains enabled. Do not follow a downgrade.
        class HttpsRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, req, fp, code, msg, headers, newurl):
                if not newurl.lower().startswith('https://'):
                    raise ValueError('Redirect downgrades to HTTP')
                return super().redirect_request(req, fp, code, msg, headers, newurl)
        opener = urllib.request.build_opener(HttpsRedirect())
        request = urllib.request.Request(candidate, headers={'User-Agent': 'Mozilla/5.0', 'Icy-MetaData': '0'})
        with opener.open(request, timeout=8) as response:
            result['final_url'] = response.url
            result['content_type'] = response.headers.get('Content-Type', '')
            sample = response.read(16384)
        # Decode a bounded sample, rather than trusting status or MIME type.
        with tempfile.NamedTemporaryFile() as audio:
            audio.write(sample)
            audio.flush()
            probe = subprocess.run(['ffprobe', '-v', 'error', '-show_entries',
                                    'stream=codec_type,codec_name', '-of', 'json', audio.name],
                                   capture_output=True, text=True, timeout=8)
        streams = json.loads(probe.stdout or '{}').get('streams', [])
        result['codecs'] = [s['codec_name'] for s in streams if s.get('codec_type') == 'audio' and s.get('codec_name')]
        result['verified'] = bool(result['codecs'])
        if not result['verified']:
            result['reason'] = 'No audio detected in response sample; manual review needed'
    except Exception as exc:
        result['reason'] = str(exc)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--workers', type=int, default=20)
    args = parser.parse_args()
    path = ROOT / 'src/data/stations-gr.json'
    original = path.read_text()
    stations = json.loads(original)
    urls = sorted({s['stream_url'] for s in stations if s.get('stream_url', '').startswith('http://')})
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(check, url) for url in urls]
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result())
            if len(results) % 50 == 0:
                print(f'Checked {len(results)}/{len(urls)} URLs', flush=True)
    upgrades = {r['http_url']: r['https_url'] for r in results if r['verified']}
    changed = sum(s.get('stream_url') in upgrades for s in stations)
    report = {'checked_urls': len(urls), 'verified_urls': len(upgrades), 'eligible_station_entries': changed,
              'results': sorted(results, key=lambda r: r['http_url'])}
    report_path = ROOT / 'reports/https-stream-audit.json'
    report_path.parent.mkdir(exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    if args.write:
        if path.read_text() != original:
            raise RuntimeError('Station data changed during audit; report saved, data not overwritten')
        # Preserve formatting and change only stream_url fields.
        import re
        def replace(match):
            value = json.loads(match.group(2))
            return match.group(1) + json.dumps(upgrades.get(value, value), ensure_ascii=False)
        updated = re.sub(r'("stream_url"\s*:\s*)("(?:[^"\\]|\\.)*")', replace, original)
        path.write_text(updated)
    print(f'{len(upgrades)}/{len(urls)} HTTPS URLs verified; {changed} station entries ' + ('updated.' if args.write else 'eligible.'))
    print(f'Report: {report_path}')


if __name__ == '__main__':
    main()
