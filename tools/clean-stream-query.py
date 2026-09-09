#!/usr/bin/env python3
"""Remove verified redundant type=http and nocache parameters; dry run unless --write."""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
from pathlib import Path
import re
import subprocess
import tempfile
from urllib.parse import unquote_plus, urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[1]


def cleaned_url(url):
    parts = urlsplit(url)
    if 'http://' in parts.query or 'https://' in parts.query:
        return url  # Embedded proxy URLs require separate review.
    query = parts.query.replace('&amp;', '&')
    keep = []
    for item in query.split('&'):
        key, _, value = item.partition('=')
        if unquote_plus(key).lower() == 'nocache':
            continue
        if unquote_plus(key).lower() == 'type' and unquote_plus(value).lower() == 'http':
            continue
        keep.append(item)
    return urlunsplit(parts._replace(query='&'.join(keep)))


def probe(url):
    with tempfile.TemporaryDirectory() as directory:
        sample = Path(directory) / 'audio'
        headers = Path(directory) / 'headers'
        fetch = subprocess.run(['curl', '-sS', '-L', '--max-redirs', '5', '--max-time', '5',
                                '--max-filesize', '262144', '-A', 'Mozilla/5.0', '-H', 'Icy-MetaData: 0',
                                '-D', str(headers), '-o', str(sample), '-w', '%{http_code}', url],
                               capture_output=True, text=True, timeout=8)
        if fetch.stdout != '200' or not sample.exists() or sample.stat().st_size == 0:
            return {'ok': False, 'reason': fetch.stderr.strip() or f'HTTP {fetch.stdout}'}
        data = subprocess.run(['ffprobe', '-v', 'error', '-read_intervals', '%+#5',
                               '-show_entries', 'stream=codec_type,codec_name,sample_rate,channels',
                               '-of', 'json', str(sample)], capture_output=True, text=True, timeout=5)
        streams = [s for s in json.loads(data.stdout or '{}').get('streams', []) if s.get('codec_type') == 'audio']
        names = re.findall(r'^icy-name:\s*(.*?)\r?$', headers.read_text(errors='replace'), re.M | re.I)
        return {'ok': bool(streams), 'audio': streams, 'station_name': names[-1] if names else None}


def check(url):
    candidate = cleaned_url(url)
    result = {'original_url': url, 'cleaned_url': candidate, 'verified': False}
    try:
        result['cleaned_probe'] = probe(candidate)
        if result['cleaned_probe']['ok']:
            result['original_probe'] = probe(url)
            a, b = result['original_probe'], result['cleaned_probe']
            result['verified'] = a['ok'] and a['audio'] == b['audio'] and a['station_name'] == b['station_name']
        if not result['verified']:
            result['reason'] = 'Could not verify matching audio format and station header for both URLs'
    except Exception as exc:
        result['reason'] = str(exc)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    path = ROOT / 'src/data/stations-gr.json'
    original = path.read_text()
    stations = json.loads(original)
    urls = sorted({s['stream_url'] for s in stations if cleaned_url(s['stream_url']) != s['stream_url']})
    results = []
    with ThreadPoolExecutor(max_workers=16) as pool:
        futures = [pool.submit(check, url) for url in urls]
        for future in as_completed(futures):
            results.append(future.result())
            if len(results) % 20 == 0:
                print(f'Checked {len(results)}/{len(urls)} URL pairs', flush=True)
    replacements = {r['original_url']: r['cleaned_url'] for r in results if r['verified']}
    count = sum(s['stream_url'] in replacements for s in stations)
    report = {'checked_urls': len(urls), 'verified_urls': len(replacements), 'eligible_entries': count, 'results': sorted(results, key=lambda r:r['original_url'])}
    (ROOT / 'reports/stream-query-audit.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    if args.write:
        if path.read_text() != original:
            raise RuntimeError('Station data changed during audit; report saved, data not overwritten')
        def replace(m):
            url = json.loads(m.group(2))
            return m.group(1) + json.dumps(replacements.get(url, url), ensure_ascii=False)
        path.write_text(re.sub(r'("stream_url"\s*:\s*)("(?:[^"\\]|\\.)*")', replace, original))
    print(f'{len(replacements)}/{len(urls)} URL pairs verified; {count} entries ' + ('updated' if args.write else 'eligible'), flush=True)


if __name__ == '__main__':
    main()
