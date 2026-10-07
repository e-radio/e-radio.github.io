#!/usr/bin/env python3
"""Preview or apply a UUID-based station merge for one country.

Usage: python3 tools/merge-stations.py --country gr merge.json [--write]
       python3 tools/merge-stations.py --country gr --parent UUID CHILD [CHILD ...] [--write]
"""

import argparse
import copy
import importlib.util
import json
import os
import re
import sys
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
LIST_FIELDS = ('genres', 'formats', 'genre_review', 'aliases', 'alternate_stationuuids', 'alternate_urls')
STREAM_FIELDS = ('bitrate', 'codec', 'hls', 'lastcheckok', 'nowplaying_url',
                 'metadata_server', 'metadata_mode', 'metadata_direct', 'history_url')
PARENT_FIELDS = ('state', 'city', 'language', 'homepage', 'favicon', 'geo_lat', 'geo_long', 'locationNames')
SKIP_FIELDS = set(LIST_FIELDS) | set(STREAM_FIELDS) | {
    'slug', 'stationuuid', 'name', 'stream_url', 'streams', 'favicon',
    'clickcount', 'votes', 'ssl_error', 'unavailable_streams',
}
GUIDE_DIRS = (ROOT / 'src/lib', ROOT / 'src/components/guides')


def unique(values):
    result = []
    for value in values:
        if value not in result:
            result.append(value)
    return result


def has_value(value):
    return value is not None and value != '' and value != []


def is_playlist(url):
    return bool(re.search(r'\.(?:pls|asx|m3u)(?:[?#]|$)', url, re.I))


def useful_stream_field(key, value):
    # Keep an HLS indication, but omit non-HLS defaults and temporary check results.
    return key != 'lastcheckok' and (key != 'hls' or value == 1)


def stream_from_station(station):
    stream = {'url': station.get('stream_url')}
    for key in STREAM_FIELDS:
        if key in station and useful_stream_field(key, station[key]):
            stream[key] = station[key]
    return stream


def merge_stream_fields(destination, incoming, conflicts, url):
    for key, value in incoming.items():
        if key in ('url', 'id', 'label') or not has_value(value) or not useful_stream_field(key, value):
            continue
        if not has_value(destination.get(key)):
            destination[key] = copy.deepcopy(value)
        elif destination[key] != value:
            conflicts.append({'field': f'stream:{url}:{key}', 'parent': destination[key], 'incoming': value})


def merge_records(stations, parent_uuid, child_uuids):
    """Return a merged copy, a detailed preview, and the removed records."""
    if len(set([parent_uuid] + child_uuids)) != 1 + len(child_uuids):
        raise ValueError('Parent and child UUIDs must be distinct and must not repeat')
    if not child_uuids:
        raise ValueError('Provide at least one child station UUID')
    owners = {station['stationuuid']: station for station in stations}
    if len(owners) != len(stations):
        raise ValueError('Station data contains duplicate primary UUIDs')
    for uuid in [parent_uuid] + child_uuids:
        if uuid not in owners:
            alias_owner = next((s['stationuuid'] for s in stations if uuid in s.get('alternate_stationuuids', [])), None)
            hint = f' (already merged into {alias_owner})' if alias_owner else ''
            raise ValueError(f'Station UUID {uuid} is not a current record{hint}')
    parent = copy.deepcopy(owners[parent_uuid])
    children = [owners[uuid] for uuid in child_uuids]
    conflicts = []
    for field in ('name',) + PARENT_FIELDS:
        for child in children:
            value = child.get(field)
            if has_value(parent.get(field)) and has_value(value) and parent[field] != value:
                conflicts.append({'field': field, 'parent': parent[field], 'incoming': value,
                                  'stationuuid': child['stationuuid']})

    for field in PARENT_FIELDS:
        if not has_value(parent.get(field)):
            candidates = unique([copy.deepcopy(s[field]) for s in children if has_value(s.get(field))])
            if candidates:
                parent[field] = candidates[0]
                for value in candidates[1:]:
                    conflicts.append({'field': field, 'parent': candidates[0], 'incoming': value})

    for field in ('genres', 'formats', 'genre_review'):
        values = unique([value for station in [parent] + children for value in station.get(field, [])])
        if values or field in parent:
            parent[field] = values
    parent['aliases'] = [slug for slug in unique(parent.get('aliases', []) +
                         [slug for s in children for slug in [s['slug']] + s.get('aliases', [])])
                         if slug != parent['slug']]
    parent['alternate_stationuuids'] = [uuid for uuid in unique(parent.get('alternate_stationuuids', []) +
        [uuid for s in children for uuid in [s['stationuuid']] + s.get('alternate_stationuuids', [])])
        if uuid != parent_uuid]
    alternate_urls = unique(parent.get('alternate_urls', []) +
                            [url for s in children for url in s.get('alternate_urls', [])])
    if alternate_urls or 'alternate_urls' in parent:
        parent['alternate_urls'] = alternate_urls
    unavailable = copy.deepcopy(parent.get('unavailable_streams', []))
    known_unavailable = {item.get('url') for item in unavailable}
    for child in children:
        for item in child.get('unavailable_streams', []):
            if item.get('url') not in known_unavailable:
                unavailable.append(copy.deepcopy(item))
                known_unavailable.add(item.get('url'))
    if unavailable:
        parent['unavailable_streams'] = unavailable

    streams = [{key: copy.deepcopy(value) for key, value in stream.items()
                if useful_stream_field(key, value)} for stream in parent.get('streams', [])]
    by_url = {parent['stream_url']: parent}
    for stream in streams:
        if stream.get('url'):
            by_url[stream['url']] = stream
    added_streams = []
    playlist_urls = []
    for child in children:
        candidates = [stream_from_station(child)] + copy.deepcopy(child.get('streams', []))
        for candidate in candidates:
            url = candidate.get('url')
            if not isinstance(url, str) or not url:
                continue
            if is_playlist(url):
                parent['alternate_urls'] = unique(parent.get('alternate_urls', []) + [url])
                playlist_urls.append(url)
                continue
            if url in by_url:
                merge_stream_fields(by_url[url], candidate, conflicts, url)
                continue
            stream = {'id': f'alternative-{len(streams) + 1}',
                      'label': candidate.get('label') or 'Alternative', 'url': url}
            for key, value in candidate.items():
                if key not in ('url', 'id', 'label') and useful_stream_field(key, value):
                    stream[key] = copy.deepcopy(value)
            streams.append(stream)
            by_url[url] = stream
            added_streams.append(url)
    if streams:
        used_ids = set()
        for stream in streams:
            stem = str(stream.get('id') or 'alternative')
            candidate = stem
            suffix = 2
            while candidate in used_ids:
                candidate = f'{stem}-{suffix}'
                suffix += 1
            stream['id'] = candidate
            used_ids.add(candidate)
        parent['streams'] = streams

    # Keep extra, nonidentity fields when the parent does not have them.
    for child in children:
        for field, value in child.items():
            if field not in SKIP_FIELDS and field not in PARENT_FIELDS and not has_value(parent.get(field)) and has_value(value):
                parent[field] = copy.deepcopy(value)

    result = [parent if s['stationuuid'] == parent_uuid else s for s in stations
              if s['stationuuid'] not in child_uuids]
    if [s for s in stations if s['stationuuid'] not in [parent_uuid] + child_uuids] != [
        s for s in result if s['stationuuid'] != parent_uuid
    ]:
        raise AssertionError('An unrelated station changed')
    slug_owners = {}
    uuid_owners = {}
    for station in result:
        for slug in [station['slug']] + station.get('aliases', []):
            if slug in slug_owners and slug_owners[slug] != station['stationuuid']:
                raise ValueError(f'Slug {slug} belongs to both {slug_owners[slug]} and {station["stationuuid"]}')
            slug_owners[slug] = station['stationuuid']
        for uuid in [station['stationuuid']] + station.get('alternate_stationuuids', []):
            if uuid in uuid_owners and uuid_owners[uuid] != station['stationuuid']:
                raise ValueError(f'UUID {uuid} belongs to both {uuid_owners[uuid]} and {station["stationuuid"]}')
            uuid_owners[uuid] = station['stationuuid']
    preview = {
        'parent': {'stationuuid': parent_uuid, 'name': parent.get('name'), 'slug': parent['slug']},
        'removed': [{'stationuuid': s['stationuuid'], 'name': s.get('name'), 'slug': s['slug']} for s in children],
        'stream_urls': list(by_url), 'added_stream_urls': added_streams,
        'playlist_aliases': unique(playlist_urls), 'conflicts': conflicts,
        'aliases': parent['aliases'], 'alternate_stationuuids': parent['alternate_stationuuids'],
        'merged_station': parent,
    }
    return result, preview, children


def merge_redirects(redirects, parent, children):
    result = copy.deepcopy(redirects)
    retired = {'/stations/' + slug for slug in parent.get('aliases', [])}
    destination = '/stations/' + parent['slug'] + '/'
    for source, target in list(result.items()):
        if source.rstrip('/') in retired:
            del result[source]
        elif isinstance(target, str) and target.rstrip('/') in retired:
            result[source] = destination
    for source in sorted(retired):
        result[source + '/'] = destination
    canonical = [key.rstrip('/') or '/' for key in result]
    if len(canonical) != len(set(canonical)):
        raise ValueError('Redirects contain routes duplicated by trailing slash')
    return result


def guide_replacements(aliases, retained_slug):
    """Update exact slug values in guides that name a station record."""
    edits = {}
    pattern = re.compile(r'''(\bslug\s*[:=]\s*['"])([^'"]+)(['"])''')
    for directory in GUIDE_DIRS:
        if not directory.exists():
            continue
        for path in directory.rglob('*'):
            if path.suffix not in ('.ts', '.astro', '.json') or not path.is_file():
                continue
            original = path.read_text()
            updated = pattern.sub(lambda match: match[1] + (retained_slug if match[2] in aliases else match[2]) + match[3], original)
            if updated != original:
                edits[path.resolve()] = updated
    return edits


def json_text(value):
    return json.dumps(value, ensure_ascii=False, indent=2) + '\n'


def load_merge_file(path):
    """Read the retained UUID and child UUIDs from a JSON merge request."""
    try:
        request = json.loads(path.read_text())
    except json.JSONDecodeError as error:
        raise ValueError(f'Invalid JSON in {path}: {error.msg}') from error
    if not isinstance(request, dict) or set(request) != {'parent', 'childs'}:
        raise ValueError('Merge file must contain exactly "parent" and "childs"')
    parent = request['parent']
    children = request['childs']
    if not isinstance(parent, str) or not parent.strip():
        raise ValueError('"parent" must be a station UUID string')
    if not isinstance(children, list) or not children or any(
        not isinstance(child, str) or not child.strip() for child in children
    ):
        raise ValueError('"childs" must be a nonempty array of station UUID strings')
    return parent.strip(), [child.strip() for child in children]


def image_cleanup_module():
    spec = importlib.util.spec_from_file_location('clean_unused_images', ROOT / 'tools/clean-unused-images.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def plan(country, parent_uuid, child_uuids, root=ROOT):
    config_path = root / 'countries' / f'{country}.json'
    if not config_path.is_file():
        raise ValueError(f'No country configuration: {config_path}')
    config = json.loads(config_path.read_text())
    if config.get('countryCode', '').lower() != country:
        raise ValueError('Country configuration code mismatch')
    stations_path = (root / config['stationsFile']).resolve()
    redirects_path = (root / config['redirectsFile']).resolve()
    stations = json.loads(stations_path.read_text())
    redirects = json.loads(redirects_path.read_text())
    if len(set([parent_uuid] + child_uuids)) != 1 + len(child_uuids):
        raise ValueError('Parent and child UUIDs must be distinct and must not repeat')
    owners = {station['stationuuid']: station for station in stations}
    if len(owners) != len(stations):
        raise ValueError('Station data contains duplicate primary UUIDs')
    if parent_uuid not in owners:
        raise ValueError(f'Station UUID {parent_uuid} is not a current record')
    already_merged = [uuid for uuid in child_uuids
                      if uuid not in owners and uuid in owners[parent_uuid].get('alternate_stationuuids', [])]
    pending = [uuid for uuid in child_uuids if uuid not in already_merged]
    if not pending:
        return {}, [], {
            'parent': {'stationuuid': parent_uuid, 'name': owners[parent_uuid].get('name'),
                       'slug': owners[parent_uuid]['slug']},
            'removed': [], 'already_merged': already_merged,
            'merged_station': owners[parent_uuid], 'redirects': {}, 'guide_updates': [],
            'unused_images': [],
        }
    merged, report, children = merge_records(stations, parent_uuid, pending)
    report['already_merged'] = already_merged
    parent = next(s for s in merged if s['stationuuid'] == parent_uuid)
    updated_redirects = merge_redirects(redirects, parent, children)
    guides = guide_replacements(set(parent['aliases']), parent['slug']) if root == ROOT else {}
    changes = {stations_path: json_text(merged), redirects_path: json_text(updated_redirects), **guides}
    module = image_cleanup_module() if root == ROOT else None
    unused = set(module.audit(changes)) if module else set()
    icons = sorted({(root / 'public' / s['favicon'].lstrip('/')).resolve() for s in children if s.get('favicon')})
    report['redirects'] = {source: updated_redirects[source] for source in updated_redirects if source not in redirects or redirects.get(source) != updated_redirects[source]}
    report['guide_updates'] = [str(path.relative_to(root)) for path in guides]
    report['unused_images'] = [str(path.relative_to(root)) for path in icons if path in unused]
    report['retained_fields'] = list(parent)
    return changes, [path for path in icons if path in unused], report


def apply_changes(changes, unused_images):
    original = {path: path.read_text() for path in changes}
    written = []
    try:
        for path, content in changes.items():
            temporary = path.with_name(f'.{path.name}.{os.getpid()}.merge-tmp')
            temporary.write_text(content)
            temporary.replace(path)
            written.append(path)
    except Exception:
        for path in written:
            path.write_text(original[path])
        raise
    for path in unused_images:
        path.unlink()


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--country', default=os.getenv('COUNTRY', 'gr').lower())
    parser.add_argument('--parent', help='Station UUID to retain when entering UUIDs on the command line')
    parser.add_argument('input', nargs='+', help='A merge JSON file, or child UUIDs with --parent')
    parser.add_argument('--write', action='store_true', help='Apply the reviewed merge')
    args = parser.parse_args(argv)
    if not re.fullmatch(r'[a-z]{2}', args.country):
        parser.error('--country must be a two-letter code')
    try:
        if args.parent:
            if len(args.input) == 1 and args.input[0].lower().endswith('.json'):
                parser.error('Use either a JSON file or --parent with child UUIDs, not both')
            parent_uuid, child_uuids = args.parent, args.input
        else:
            if len(args.input) != 1:
                parser.error('Provide one merge JSON file, or use --parent with child UUIDs')
            parent_uuid, child_uuids = load_merge_file(Path(args.input[0]))
        changes, unused_images, report = plan(args.country, parent_uuid, child_uuids)
        report['applied'] = args.write
        if args.write:
            apply_changes(changes, unused_images)
        print(json.dumps(report, ensure_ascii=False, indent=2))
    except (ValueError, KeyError, OSError) as error:
        parser.exit(1, f'Cannot merge stations: {error}\n')


if __name__ == '__main__':
    main()
