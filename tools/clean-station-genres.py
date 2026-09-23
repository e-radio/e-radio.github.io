#!/usr/bin/env python3
"""Normalize station genres using shared and optional country-specific rules."""
import argparse
import importlib.util
from collections import Counter
import html
import json
import os
from pathlib import Path
import re
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location('station_taxonomy', ROOT/'tools/lib/station-taxonomy.py')
_taxonomy = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_taxonomy)

def canonical(value):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFKC', html.unescape(value)).lower()).strip()

def slug(value):
    value = ''.join(c for c in unicodedata.normalize('NFD', value) if not unicodedata.combining(c))
    greek = dict(zip('αβγδεζηθικλμνξοπρσςτυφχψω', ['a','v','g','d','e','z','i','th','i','k','l','m','n','x','o','p','r','s','s','t','y','f','ch','ps','o']))
    value = ''.join(greek.get(c,c) for c in value.lower())
    return re.sub('[^a-z0-9]+', '-', value.lower().strip().replace("'", '').replace('"', '')).strip('-')[:80]

def clean_genres(genres, aliases, remove):
    # Normalize configuration too: this function is also used by stream probing.
    aliases = {canonical(k): [canonical(v) for v in (values if isinstance(values, list) else [values])]
               for k, values in aliases.items()}
    remove = {canonical(v) for v in remove}
    result = []

    def expand(raw, seen=frozenset()):
        if not isinstance(raw, str):
            return
        value = canonical(raw)
        if not value or value in remove or re.fullmatch(r'\d+\s*(kbps|kbit/s|bit)', value):
            return
        if re.fullmatch(r'[0-9]0', value) or re.fullmatch(r'(?:19|20)[0-9]0', value):
            value += 's'
        decade = re.fullmatch(r"(?:19|20)?(\d0)[’'´]?s", value)
        if decade and not value.startswith(('192', '193', '194')):
            value = decade[1] + 's'
        if value in aliases and value not in seen:
            for target in aliases[value]:
                expand(target, seen | {value})
            return
        # Explicit list separators only. Spaces, ampersands, slashes and hyphens
        # can belong to a genre; ambiguous compounds require a reviewed alias.
        parts = re.split(r'[,;|]', value)
        if len(parts) > 1:
            for part in parts:
                expand(part, seen)
            return
        if value not in result:
            result.append(value)

    for raw in genres or []:
        expand(raw)
    return result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--country', default=os.environ.get('COUNTRY', 'gr'))
    parser.add_argument('--write', action='store_true')
    parser.add_argument('--all', action='store_true', help='Process every country station dataset')
    args = parser.parse_args()
    if args.all:
        import subprocess, sys
        for path in sorted((ROOT/'src/data').glob('stations-*.json')):
            code=path.stem.removeprefix('stations-')
            subprocess.run([sys.executable, __file__, '--country', code] + (['--write'] if args.write else []), check=True)
        return
    country = args.country.lower()
    if not re.fullmatch('[a-z]{2}', country):
        parser.error('Country must be a two-letter code')
    config = json.loads((ROOT / f'countries/{country}.json').read_text())
    path = ROOT / config['stationsFile']
    original = path.read_bytes()
    stations = json.loads(original)
    old_routes = {}
    slug_counts = Counter()
    for station in stations:
        for genre in station.get('genres') or ['Other']:
            if genre in old_routes: continue
            base = slug(genre) or 'other'
            slug_counts[base] += 1
            old_routes[genre] = base if slug_counts[base] == 1 else f'{base}-{slug_counts[base]}'
    before = Counter(g for s in stations for g in s.get('genres',[]) if isinstance(g,str))
    changes=[]
    audit=[]
    for station in stations:
        old=station.get('genres',[])
        tags=old + station.get('formats',[]) + station.get('genre_review',[])
        classified=_taxonomy.classify(tags,country)
        new=classified['genres']
        for tag in tags:
            audit.append({'tag':tag,'stationuuid':station['stationuuid'],'slug':station['slug'],**_taxonomy.classify([tag],country)})
        if old != new or station.get('formats',[]) != classified['formats'] or station.get('genre_review',[]) != classified['review']:
            changes.append({'stationuuid':station['stationuuid'],'slug':station['slug'],'before':old,'after':new,
                            'formats_before':station.get('formats',[]),'formats':classified['formats'],
                            'review':classified['review'],'removed':classified['removed']})
            station['genres']=new
            if classified['formats'] or 'formats' in station: station['formats']=classified['formats']
            if classified['review'] or 'genre_review' in station: station['genre_review']=classified['review']
    after=Counter(g for s in stations for g in s.get('genres',[]))
    redirects_path=ROOT/config['redirectsFile']
    redirects=json.loads(redirects_path.read_text())
    live_slugs={slug(g) for g in after}
    added={}
    for old in before:
        old_slug=old_routes[old]
        if old_slug in live_slugs:continue
        category=_taxonomy.classify([old],country)
        targets=category['genres']
        target=f'/genres/{slug(targets[0])}/' if len(targets)==1 and targets[0] in after else '/genres/'
        if not targets and len(category['formats'])==1:
            target=f"/formats/{slug(category['formats'][0])}/"
        route=f'/genres/{old_slug}/'
        if slug(old) and route not in redirects:
            added[route]=target
            for page in range(2, (before[old]+19)//20+1):
                paginated=f'{route}page/{page}/'
                if paginated not in redirects:added[paginated]=target
    if args.write:
        if path.read_bytes()!=original:raise RuntimeError('Dataset changed during cleanup')
        path.write_text(json.dumps(stations,ensure_ascii=False,indent=2)+'\n')
        # Retarget historical genre redirects whose former destination disappeared.
        for source, target in list(redirects.items()):
            if target in added: redirects[source] = added[target]
        # A previously retired category can become live again after vocabulary edits.
        for source in list(redirects):
            if source.rstrip('/') in {f'/genres/{g}' for g in live_slugs}: del redirects[source]
        redirects.update(added)
        redirects_path.write_text(json.dumps(redirects,ensure_ascii=False,indent=2)+'\n')
    report={'country':country,'applied':args.write,'stations_changed':len(changes),'unique_before':len(before),'unique_after':len(after),'changes':changes,'redirects':added,'remaining_genres':dict(sorted(after.items())), 'review_tags':sorted({g for station in stations for g in station.get('genre_review',[])}), 'tag_audit':audit}
    report_path=ROOT/f'reports/genre-cleanup-{country}{"" if args.write else "-preview"}.json'
    report_path.parent.mkdir(exist_ok=True)
    report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(f'{country.upper()}: {len(changes)} stations changed; {len(before)} → {len(after)} unique genres; {"saved" if args.write else "preview only"}. Report: {report_path}')

if __name__=='__main__':main()
