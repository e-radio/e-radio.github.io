#!/usr/bin/env python3
"""Fill country-scoped city/state from coordinates and website addresses."""
import argparse
import json
import math
import os
import time
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from website_geography import discover
from urllib.parse import urlencode
from urllib.request import Request, urlopen


def location_from_address(address, country):
    if address.get('country_code', '').lower() != country.lower():
        raise ValueError('Coordinates resolve outside the selected country')
    if country.lower() == 'hr' and address.get('ISO3166-2-lvl4') == 'HR-21':
        return 'Zagreb', 'Grad Zagreb'
    city = next((address[k].strip() for k in ('city', 'town', 'village', 'municipality', 'hamlet') if isinstance(address.get(k), str) and address[k].strip()), None)
    state = next((address[k].strip() for k in ('state', 'county', 'region', 'province') if isinstance(address.get(k), str) and address[k].strip()), None)
    if city and country.lower() == 'hr':
        for prefix in ('Grad ', 'Općina '):
            if city.startswith(prefix):
                city = city[len(prefix):]
                break
    if not city and not state:
        raise ValueError('No unambiguous city and region in geocoder result')
    return city, state


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--country', default=os.environ.get('COUNTRY', 'gr'))
    parser.add_argument('--no-coordinates', action='store_true', help='Use station websites only')
    parser.add_argument('--sleep', type=float, default=1.0, help='Seconds between station lookups')
    parser.add_argument('--no-websites', action='store_true', help='Use coordinates only')
    parser.add_argument('--max', type=int, default=0, help='Maximum stations checked (0 = all)')
    parser.add_argument('--lang', default='en')
    parser.add_argument('--overwrite', action='store_true')
    parser.add_argument('--write', action='store_true', help='Save discovered locations (otherwise report only)')
    parser.add_argument('--endpoint', default=os.environ.get('GEOCODER_URL', 'https://nominatim.openstreetmap.org/reverse'))
    args = parser.parse_args()
    if args.max < 0 or args.sleep < 0 or (args.no_coordinates and args.no_websites):
        parser.error('Use nonnegative limits and enable at least one lookup source')
    country = args.country.lower()
    if len(country) != 2 or not country.isalpha():
        parser.error('Country must be a two-letter code')
    config = json.loads(Path(f'countries/{country}.json').read_text())
    names_path = Path(f'countries/{country}.location-names.json')
    state_names = json.loads(names_path.read_text()).get('stateNames', {}) if names_path.exists() else {}
    data_path = Path(config['stationsFile'])
    stations = json.loads(data_path.read_text())
    cache_path = Path(f'tools/cache/geography-{country}-{args.lang}.json')
    cache = json.loads(cache_path.read_text()) if cache_path.exists() else {}
    records = []
    last_request = 0
    for station in stations:
        lat, lon = station.get('geo_lat'), station.get('geo_long')
        if args.no_coordinates and not station.get('homepage'):
            continue
        if (lat is None or lon is None) and (args.no_websites or not station.get('homepage')):
            continue
        if args.max > 0 and len(records) >= args.max:
            break
        if not args.overwrite and station.get('city') and station.get('state'):
            continue
        record = {'stationuuid': station['stationuuid'], 'slug': station['slug'], 'coordinates': [lat, lon], 'homepage': station.get('homepage'), 'before': {k: station.get(k) for k in ('city', 'state')}}
        if records and args.sleep:
            time.sleep(args.sleep)
        try:
            if args.no_coordinates:
                raise ValueError('Coordinate lookup disabled')
            if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in (lat, lon)) or not (-90 <= lat <= 90 and -180 <= lon <= 180):
                raise ValueError('Invalid coordinates')
            key = f'{args.endpoint}|{lat:.6f},{lon:.6f}'
            if key not in cache:
                time.sleep(max(0, 1.1 - (time.monotonic() - last_request)))
                last_request = time.monotonic()
                query = urlencode({'format': 'jsonv2', 'lat': f'{lat:.6f}', 'lon': f'{lon:.6f}', 'addressdetails': 1, 'accept-language': args.lang})
                request = Request(args.endpoint + '?' + query, headers={'User-Agent': f'RadioDirectory-GeographyCleanup/1.0 ({config["siteUrl"]})'})
                with urlopen(request, timeout=20) as response:
                    cache[key] = json.loads(response.read(2 * 1024 * 1024))
                write_json(cache_path, cache)
            payload = cache[key]
            record['address'] = payload.get('address', {})
            city, state = location_from_address(record['address'], country)
            if args.lang.split('-')[0] == 'en':
                state = state_names.get(state, state)
            record['after'] = {'city': city if city and (args.overwrite or not station.get('city')) else station.get('city'), 'state': state if state and (args.overwrite or not station.get('state')) else station.get('state')}
            record['status'] = 'changed' if record['before'] != record['after'] else 'unchanged'
        except Exception as error:
            record.update(status='review', reason=str(error))
        after = record.get('after', record['before']).copy()
        if not args.no_websites and station.get('homepage') and (not after.get('city') or not after.get('state')):
            try:
                website, evidence, errors = discover(station['homepage'], country, config['countryName'], f'RadioDirectory-Geography/1.0 ({config["siteUrl"]})')
                record['website_sources'] = evidence
                record['website_errors'] = errors
                for field in ('city', 'state'):
                    value = website.get(field)
                    if field == 'state' and args.lang.split('-')[0] == 'en':
                        value = state_names.get(value, value)
                    if not after.get(field) and value:
                        after[field] = value
                if after != record['before']:
                    record.update(after=after, status='changed')
            except Exception as error:
                record['website_error'] = str(error)
        records.append(record)
        print(f'{len(records)} {record["status"]}: {station["name"]} -> {record.get("after", record.get("reason"))}', flush=True)
    if args.write:
        latest = json.loads(data_path.read_text())
        by_uuid = {s['stationuuid']: s for s in latest}
        for record in records:
            if record['status'] != 'changed':
                continue
            station = by_uuid.get(record['stationuuid'])
            if not station or station.get('homepage') != record['homepage'] or [station.get('geo_lat'), station.get('geo_long')] != record['coordinates'] or {k: station.get(k) for k in ('city', 'state')} != record['before']:
                record.update(status='review', reason='Station changed during lookup; not overwritten')
                continue
            names = station.setdefault('locationNames', {})
            names.setdefault(config.get('language', 'en'), record['before'])
            names[args.lang] = record['after'].copy()
            station.update(record['after'])
        write_json(data_path, latest)
    report = {'country': country, 'language': args.lang, 'applied': args.write, 'source': 'OpenStreetMap contributors, ODbL 1.0', 'attribution_url': 'https://www.openstreetmap.org/copyright', 'records': records}
    write_json(Path(f'reports/geography-{country}.json'), report)
    print('Stations checked:', len(records))
    print('Cities filled:', sum(not r['before'].get('city') and bool(r.get('after', {}).get('city')) and r['status'] == 'changed' for r in records))
    print('States filled:', sum(not r['before'].get('state') and bool(r.get('after', {}).get('state')) and r['status'] == 'changed' for r in records))
    print('Mode:', 'saved' if args.write else 'preview only')
    print(json.dumps({status: sum(r['status'] == status for r in records) for status in ('changed', 'unchanged', 'review')}))


if __name__ == '__main__':
    main()
