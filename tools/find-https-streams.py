#!/usr/bin/env python3
"""Find HTTPS streams on station websites; review a report before approved writes.

Scan:  python3 tools/find-https-streams.py --country gr
Apply: python3 tools/find-https-streams.py --country gr --write --approved approvals.json
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from html import unescape
from html.parser import HTMLParser
import ipaddress
import json
from pathlib import Path
import re
import subprocess
from urllib.parse import urljoin, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

ROOT = Path(__file__).resolve().parents[1]
USER_AGENT = 'RadioDirectory-HTTPS-Discovery/1.0'
URL_PATTERN = re.compile(r'https?:\\?/\\?/[^\s\"\'<>`]+', re.I)
STREAM_PATTERN = re.compile(r'(?:\.(?:mp3|aac|ogg|opus|flac|m3u8?|pls)(?:[?#]|$)|/(?:stream|live|listen|radio|mount)(?:[/?;._-]|$)|/;(?:[?#]|$)|:[6-9]\d{3}/)', re.I)
PLAYER_PATTERN = re.compile(r'(?:player|listen|stream|onair|on-air|live)', re.I)
PLAYLIST_PATTERN = re.compile(r'\.(?:pls|m3u)(?:[?#]|$)', re.I)
STATIC_PATTERN = re.compile(r'\.(?:png|jpe?g|gif|webp|svg|css|js|woff2?|ico)(?:[?#]|$)', re.I)
MAX_BYTES = 1_000_000


def public_url(value, *, https_only=False):
    if not isinstance(value, str):
        return None
    value = unescape(value).replace('\\/', '/').strip().rstrip('),\'\"')
    try:
        parsed = urlsplit(value)
        if parsed.scheme not in (('https',) if https_only else ('http', 'https')) or not parsed.hostname or parsed.username or parsed.password:
            return None
        host = parsed.hostname.strip('[]')
        try:
            if not ipaddress.ip_address(host).is_global:
                return None
        except ValueError:
            if host.lower() in ('localhost', 'localhost.localdomain') or host.lower().endswith(('.local', '.internal')):
                return None
        return value
    except ValueError:
        return None


class SafeRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not public_url(newurl):
            raise ValueError('Redirect targets a non-public URL')
        if req.full_url.startswith('https://') and not newurl.startswith('https://'):
            raise ValueError('HTTPS request redirects to HTTP')
        return super().redirect_request(req, fp, code, msg, headers, newurl)


OPENER = build_opener(SafeRedirect())


def fetch(url, timeout=8, max_bytes=MAX_BYTES):
    if not public_url(url):
        raise ValueError('URL is not public HTTP(S)')
    with OPENER.open(Request(url, headers={'User-Agent': USER_AGENT, 'Icy-MetaData': '0'}), timeout=timeout) as response:
        body = response.read(max_bytes)
        return body, response.url, response.headers


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.sources = []
        self.links = []
        self.scripts = []
        self.inline = []
        self.in_script = False
        self.in_audio = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'script':
            self.in_script = True
            if attrs.get('src'):
                self.scripts.append(attrs['src'])
        if tag == 'audio':
            self.in_audio = True
        if (tag in ('audio', 'iframe') or (tag == 'source' and self.in_audio)) and attrs.get('src'):
            self.sources.append((tag, attrs['src']))
        if tag == 'a' and attrs.get('href'):
            self.links.append((attrs['href'], ''))
        for key in ('data-src', 'data-stream', 'data-url', 'data-audio'):
            if attrs.get(key):
                self.sources.append((key, attrs[key]))

    def handle_data(self, data):
        if self.in_script:
            self.inline.append(data)

    def handle_endtag(self, tag):
        if tag == 'script':
            self.in_script = False
        if tag == 'audio':
            self.in_audio = False


def urls_in_text(text):
    for match in URL_PATTERN.finditer(text.replace('\\u0026', '&')):
        url = public_url(match.group().rstrip(']}'))
        if url:
            yield url


def same_site(a, b):
    def host(url):
        return (urlsplit(url).hostname or '').lower().removeprefix('www.')
    return host(a) == host(b)


def discover(station, *, fetcher=fetch, max_pages=3):
    homepage = station['homepage']
    old = station['stream_url']
    candidates = {}
    errors = []
    def add(url, evidence, page):
        url = public_url(urljoin(page, url))
        if not url or STATIC_PATTERN.search(url) or (urlsplit(url).hostname or '').endswith('fbcdn.net'):
            return
        if PLAYLIST_PATTERN.search(url):
            try:
                body, final, _ = fetcher(url)
                for line in body.decode('utf-8', errors='replace').splitlines():
                    line = line.strip()
                    if line.lower().startswith('file') and '=' in line:
                        line = line.split('=', 1)[1].strip()
                    if line.startswith(('http://', 'https://')):
                        nested = public_url(line)
                        if nested and nested.startswith('https://'):
                            candidates.setdefault(nested, []).append({'page': final, 'source': 'playlist'})
            except Exception as exc:
                errors.append({'url': url, 'error': str(exc)[:180]})
        elif url.startswith('https://') and (STREAM_PATTERN.search(url) or evidence in ('audio', 'source', 'data-stream')):
            candidates.setdefault(url, []).append({'page': page, 'source': evidence})

    direct = 'https://' + old[len('http://'):]
    if public_url(direct, https_only=True):
        candidates[direct] = [{'page': old, 'source': 'same-url-upgrade'}]
    queue = [homepage]
    seen = set()
    while queue and len(seen) < max_pages:
        page_url = queue.pop(0)
        if page_url in seen:
            continue
        seen.add(page_url)
        try:
            body, final, headers = fetcher(page_url)
            if 'html' not in headers.get('Content-Type', '').lower():
                raise ValueError('Page did not return HTML')
            html = body.decode(headers.get_content_charset() or 'utf-8', errors='replace')
            page = Page()
            page.feed(html)
            for kind, value in page.sources:
                add(value, kind, final)
            for url in urls_in_text(' '.join(page.inline)):
                add(url, 'inline-script', final)
            for href, _ in page.links:
                url = urljoin(final, href)
                if PLAYLIST_PATTERN.search(url) or STREAM_PATTERN.search(url):
                    add(url, 'link', final)
                if same_site(homepage, url) and not PLAYLIST_PATTERN.search(url) and PLAYER_PATTERN.search(urlsplit(url).path) and url not in seen and url not in queue:
                    queue.append(url)
            # A few sites keep their player URL in a local script rather than inline HTML.
            for src in page.scripts[:3]:
                script_url = urljoin(final, src)
                if not same_site(homepage, script_url):
                    continue
                try:
                    script, _, _ = fetcher(script_url)
                    for url in urls_in_text(script.decode('utf-8', errors='replace')):
                        add(url, 'site-script', script_url)
                except Exception as exc:
                    errors.append({'url': script_url, 'error': str(exc)[:180]})
        except Exception as exc:
            errors.append({'url': page_url, 'error': str(exc)[:180]})
    return candidates, errors


def verify(url, *, fetcher=fetch, runner=subprocess.run):
    result = {'url': url, 'verified': False}
    try:
        _, final, headers = fetcher(url, max_bytes=32768)
        if not public_url(final, https_only=True):
            raise ValueError('Final URL is not HTTPS')
        result.update(final_url=final, content_type=headers.get('Content-Type', ''), icy_name=headers.get('icy-name'))
        if 'html' in result['content_type'].lower():
            raise ValueError('Response is HTML, not audio')
        probe = runner(['ffprobe', '-v', 'error', '-tls_verify', '1', '-rw_timeout', '5000000',
                        '-analyzeduration', '3000000', '-probesize', '262144', '-show_entries',
                        'stream=codec_type,codec_name,bit_rate:format=bit_rate', '-of', 'json', final],
                       capture_output=True, text=True, timeout=12)
        probe_data = json.loads(probe.stdout or '{}')
        streams = probe_data.get('streams', [])
        result['codecs'] = [stream.get('codec_name') for stream in streams if stream.get('codec_type') == 'audio']
        result['verified'] = bool(result['codecs'])
        if result['verified']:
            audio = next(stream for stream in streams if stream.get('codec_type') == 'audio')
            result['codec'] = {'mp3': 'MP3', 'aac': 'AAC', 'aac_latm': 'AAC', 'flac': 'FLAC',
                               'opus': 'Opus', 'vorbis': 'Ogg Vorbis'}.get(audio.get('codec_name'), audio.get('codec_name', '').upper())
            raw_bitrate = audio.get('bit_rate') or probe_data.get('format', {}).get('bit_rate')
            if raw_bitrate and str(raw_bitrate).isdigit():
                result['bitrate'] = round(int(raw_bitrate) / 1000)
        if not result['verified']:
            result['reason'] = (probe.stderr or 'No audio stream detected')[:180]
    except Exception as exc:
        result['reason'] = str(exc)[:180]
    return result


def format_verified_streams(checked):
    streams = []
    used_ids = set()
    for candidate in checked:
        if not candidate['verified']:
            continue
        codec = candidate.get('codec') or 'Audio'
        bitrate = candidate.get('bitrate')
        stem = f"{codec.lower().replace(' ', '-')}-{bitrate}-alternative" if bitrate else f"{codec.lower().replace(' ', '-')}-alternative"
        stream_id = stem
        suffix = 2
        while stream_id in used_ids:
            stream_id = f'{stem}-{suffix}'
            suffix += 1
        used_ids.add(stream_id)
        stream = {'id': stream_id, 'label': 'Alternative', 'url': candidate['url']}
        if bitrate:
            stream['bitrate'] = bitrate
        stream['codec'] = codec
        streams.append(stream)
    return streams


def inspect(station, *, fetcher=fetch, verifier=verify):
    found, errors = discover(station, fetcher=fetcher)
    checked = []
    for url, evidence in list(found.items())[:15]:
        result = verifier(url)
        result['evidence'] = evidence
        result['same_host'] = urlsplit(url).hostname == urlsplit(station['stream_url']).hostname
        checked.append(result)
    checked.sort(key=lambda item: (not item['verified'], not item['same_host'], -len(item['evidence']), item['url']))
    return {'stationuuid': station['stationuuid'], 'name': station['name'], 'homepage': station['homepage'],
            'http_url': station['stream_url'], 'streams': format_verified_streams(checked), 'candidates': checked, 'errors': errors}


def station_spans(text):
    start = None
    depth = 0
    quoted = escaped = False
    for index, char in enumerate(text):
        if quoted:
            if escaped:
                escaped = False
            elif char == '\\':
                escaped = True
            elif char == '"':
                quoted = False
            continue
        if char == '"':
            quoted = True
        elif char == '{':
            if depth == 0:
                start = index
            depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0 and start is not None:
                yield start, index + 1


def replace_primary_urls(original, approved):
    field = re.compile(r'("stream_url"\s*:\s*)("(?:\\.|[^"\\])*")')
    pieces = []
    cursor = 0
    updated = set()
    for start, end in station_spans(original):
        item = original[start:end]
        station = json.loads(item)
        selection = approved.get(station.get('stationuuid'))
        if not selection:
            continue
        old, new = selection
        if station.get('stream_url') != old:
            raise ValueError(f"{station['stationuuid']}: stream_url changed since report")
        def change(match):
            if json.loads(match.group(2)) != old:
                raise ValueError(f"{station['stationuuid']}: stream_url mismatch")
            return match.group(1) + json.dumps(new, ensure_ascii=False)
        replacement, count = field.subn(change, item, count=1)
        if count != 1:
            raise ValueError(f"{station['stationuuid']}: missing stream_url field")
        pieces.extend((original[cursor:start], replacement))
        cursor = end
        updated.add(station['stationuuid'])
    if updated != set(approved):
        raise ValueError(f'Approved station UUIDs not found: {sorted(set(approved) - updated)}')
    pieces.append(original[cursor:])
    result = ''.join(pieces)
    json.loads(result)
    return result


def apply_approvals(path, report_path, approved_path, *, verifier=verify, country=None):
    report = json.loads(report_path.read_text())
    if country and report.get('country') != country:
        raise ValueError('Review report country does not match the selected country')
    if not report.get('complete'):
        raise ValueError('Review report is incomplete')
    selections = json.loads(approved_path.read_text())
    if not isinstance(selections, list) or not selections:
        raise ValueError('Approval file must be a nonempty array of stationuuid/https_url objects')
    by_uuid = {entry['stationuuid']: entry for entry in report['results']}
    approved = {}
    for selection in selections:
        uuid, url = selection['stationuuid'], selection['https_url']
        if uuid in approved or uuid not in by_uuid or not public_url(url, https_only=True):
            raise ValueError(f'Invalid or duplicate approval: {uuid}')
        record = by_uuid[uuid]
        if not any(candidate['url'] == url and candidate['verified'] for candidate in record['candidates']):
            raise ValueError(f'{uuid}: HTTPS URL was not verified in the review report')
        if not verifier(url)['verified']:
            raise ValueError(f'{uuid}: HTTPS URL no longer verifies')
        approved[uuid] = (record['http_url'], url)
    original = path.read_text()
    updated = replace_primary_urls(original, approved)
    if path.read_text() != original:
        raise RuntimeError('Station data changed during approval; no changes written')
    path.write_text(updated)
    return len(approved)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--country', default='gr', help='Two-letter country code')
    parser.add_argument('--workers', type=int, default=4)
    parser.add_argument('--max', type=int, default=0, help='Limit stations for a preview (0 = all)')
    parser.add_argument('--report', type=Path, help='Review report path')
    parser.add_argument('--write', action='store_true', help='Apply only explicitly approved, reverified candidates')
    parser.add_argument('--approved', type=Path, help='JSON array of {stationuuid, https_url} approvals')
    args = parser.parse_args()
    if not re.fullmatch(r'[a-z]{2}', args.country) or args.workers < 1 or args.max < 0:
        parser.error('Use a two-letter country, positive workers, and nonnegative --max')
    config = json.loads((ROOT / 'countries' / f'{args.country}.json').read_text())
    path = ROOT / config['stationsFile']
    report_path = args.report or ROOT / 'reports' / f'https-homepage-candidates-{args.country}.json'
    if args.write:
        if not args.approved:
            parser.error('--write requires --approved FILE')
        print(f'Updated {apply_approvals(path, report_path, args.approved, country=args.country)} approved station stream URLs')
        return
    stations = [station for station in json.loads(path.read_text())
                if isinstance(station.get('stream_url'), str) and station['stream_url'].startswith('http://') and station.get('homepage')]
    if args.max:
        stations = stations[:args.max]
    results = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(inspect, station): station for station in stations}
        for future in as_completed(futures):
            try:
                results.append(future.result())
            except Exception as exc:
                station = futures[future]
                results.append({'stationuuid': station['stationuuid'], 'name': station['name'],
                                'homepage': station['homepage'], 'http_url': station['stream_url'],
                                'candidates': [], 'errors': [{'error': str(exc)[:180]}]})
            if len(results) % 20 == 0:
                print(f'Checked {len(results)}/{len(stations)} stations', flush=True)
    report = {'country': args.country, 'generated_at': datetime.now(timezone.utc).isoformat(),
              'complete': True, 'checked_stations': len(stations),
              'verified_stations': sum(any(c['verified'] for c in r['candidates']) for r in results),
              'results': sorted(results, key=lambda result: result['name'].casefold())}
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(f"{report['verified_stations']}/{len(stations)} stations have verified HTTPS candidates; review {report_path}")


if __name__ == '__main__':
    main()
