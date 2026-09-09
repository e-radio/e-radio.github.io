#!/usr/bin/env python3
"""Decode three seconds from each unique stream; save a report without changing station data."""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def check(url):
    result = {'url': url, 'checked_at': datetime.now(timezone.utc).isoformat()}
    try:
        command = ['ffmpeg', '-nostdin', '-hide_banner', '-loglevel', 'error',
                   '-rw_timeout', '5000000', '-analyzeduration', '3000000', '-probesize', '262144',
                   '-i', url, '-map', '0:a:0', '-t', '3', '-vn', '-ac', '1', '-ar', '8000',
                   '-c:a', 'pcm_s16le', '-f', 's16le', 'pipe:1']
        process = subprocess.run(command, capture_output=True, timeout=15)
        result['decoded_seconds'] = round(len(process.stdout) / 16000, 3)
        result['exit_code'] = process.returncode
        errors = process.stderr.decode(errors='replace').strip()
        if errors:
            result['error'] = errors[:4000]
        if process.returncode == 0 and result['decoded_seconds'] >= 2.9:
            result['status'] = 'decoded_with_errors' if errors else 'decoded'
        else:
            result['status'] = 'failed'
    except subprocess.TimeoutExpired as exc:
        result['status'] = 'timeout'
        result['decoded_seconds'] = round(len(exc.stdout or b'') / 16000, 3)
        result['error'] = (exc.stderr or b'').decode(errors='replace')[:4000] or 'Exceeded 15-second probe limit'
    except Exception as exc:
        result.update(status='failed', error=str(exc))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workers', type=int, default=20)
    parser.add_argument('--max', type=int, default=0, help='Limit unique URLs; 0 checks all')
    args = parser.parse_args()
    stations = json.loads((ROOT / 'src/data/stations-gr.json').read_text())
    grouped = {}
    for station in stations:
        if station.get('stream_url'):
            grouped.setdefault(station['stream_url'], []).append(station['slug'])
    urls = sorted(grouped)
    if args.max:
        urls = urls[:args.max]
    report_path = ROOT / 'reports/stream-decoding-audit.json'
    report_path.parent.mkdir(exist_ok=True)
    results = []
    def save(complete):
        summary = {status: sum(r['status'] == status for r in results) for status in ['decoded', 'decoded_with_errors', 'failed', 'timeout']}
        report = {'complete': complete, 'expected_urls': len(urls), 'checked_urls': len(results),
                  'summary': summary, 'browser_test': 'Not performed: no connected browser in this session',
                  'scope': 'Stored stream URLs; three seconds of audio decoded to PCM. Not a browser, CORS, TLS-certificate, silence, or sustained-uptime test.',
                  'results': sorted(results, key=lambda r: r['url'])}
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        return summary
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(check, url) for url in urls]
        for future in as_completed(futures):
            result = future.result()
            result['stations'] = grouped[result['url']]
            results.append(result)
            if len(results) % 100 == 0:
                summary = save(False)
                print(f'Checked {len(results)}/{len(urls)}: {summary}', flush=True)
    print(json.dumps(save(True)), flush=True)
    print(report_path)


if __name__ == '__main__':
    main()
