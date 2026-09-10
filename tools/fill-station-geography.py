#!/usr/bin/env python3
"""One-time, country-scoped coordinate cleanup; see countries/README.md."""
import argparse
import json
import math
import os
import time
from pathlib import Path
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
    if not city or not state:
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
    parser.add_argument('--lang', default='en')
    parser.add_argument('--overwrite', action='store_true')
    parser.add_argument('--write', action='store_true', help='Apply reviewed coordinate results (otherwise report only)')
    parser.add_argument('--endpoint', default=os.environ.get('GEOCODER_URL', 'https://nominatim.openstreetmap.org/reverse'))
    args = parser.parse_args()
    country = args.country.lower()
    if len(country) != 2 or not country.isalpha():
        parser.error('Country must be a two-letter code')
    config = json.loads(Path(f'countries/{country}.json').read_text())
    data_path = Path(config['stationsFile'])
    stations = json.loads(data_path.read_text())
    cache_path = Path(f'tools/cache/geography-{country}-{args.lang}.json')
    cache = json.loads(cache_path.read_text()) if cache_path.exists() else {}
    records = []
    last_request = 0
    for station in stations:
        lat, lon = station.get('geo_lat'), station.get('geo_long')
        if lat is None or lon is None:
            continue
        if not args.overwrite and station.get('city') and station.get('state'):
            continue
        record = {'stationuuid': station['stationuuid'], 'slug': station['slug'], 'coordinates': [lat, lon], 'before': {k: station.get(k) for k in ('city', 'state')}}
        try:
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
            record['after'] = {'city': city if args.overwrite or not station.get('city') else station['city'], 'state': state if args.overwrite or not station.get('state') else station['state']}
            record['status'] = 'changed' if record['before'] != record['after'] else 'unchanged'
        except Exception as error:
            record.update(status='review', reason=str(error))
        records.append(record)
        print(f'{len(records)} {record["status"]}: {station["name"]} -> {record.get("after", record.get("reason"))}', flush=True)
    if args.write:
        latest = json.loads(data_path.read_text())
        by_uuid = {s['stationuuid']: s for s in latest}
        for record in records:
            if record['status'] != 'changed':
                continue
            station = by_uuid.get(record['stationuuid'])
            if not station or [station.get('geo_lat'), station.get('geo_long')] != record['coordinates'] or {k: station.get(k) for k in ('city', 'state')} != record['before']:
                record.update(status='review', reason='Station changed during lookup; not overwritten')
                continue
            station.update(record['after'])
        write_json(data_path, latest)
    report = {'country': country, 'language': args.lang, 'applied': args.write, 'source': 'OpenStreetMap contributors, ODbL 1.0', 'attribution_url': 'https://www.openstreetmap.org/copyright', 'records': records}
    write_json(Path(f'reports/geography-{country}.json'), report)
    print(json.dumps({status: sum(r['status'] == status for r in records) for status in ('changed', 'unchanged', 'review')}))


if __name__ == '__main__':
    main()
