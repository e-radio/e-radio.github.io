#!/usr/bin/env python3
"""Normalize station genres using shared and optional country-specific rules."""
import argparse
from collections import Counter
import html
import json
import os
from pathlib import Path
import re
import unicodedata

ROOT = Path(__file__).resolve().parents[1]

def canonical(value):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFKC', html.unescape(value)).lower()).strip()

def slug(value):
    value = ''.join(c for c in unicodedata.normalize('NFD', value) if not unicodedata.combining(c))
    return re.sub('[^a-z0-9]+', '-', value.lower().strip().replace("'", '').replace('"', '')).strip('-')[:80]

def clean_genres(genres, aliases, remove):
    result = []
    for raw in genres or []:
        if not isinstance(raw, str):
            continue
        value = canonical(raw)
        if not value or value in remove or re.fullmatch(r'\d+\s*(kbps|kbit/s|bit)', value):
            continue
        # Standalone decade numbers are decade tags, not frequencies or chart sizes.
        if re.fullmatch(r'[0-9]0', value) or re.fullmatch(r'(?:19|20)[0-9]0', value):
            value += 's'
        decade = re.fullmatch(r'(?:19|20)?(\d0)[’\x27´]?s', value)
        if decade and not value.startswith(('192', '193', '194')):
            value = decade[1] + 's'
        targets = aliases.get(value, [value])
        for target in targets:
            if target not in result and target not in remove:
                result.append(target)
    return result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--country', default=os.environ.get('COUNTRY', 'gr'))
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    country = args.country.lower()
    if not re.fullmatch('[a-z]{2}', country):
        parser.error('Country must be a two-letter code')
    config = json.loads((ROOT / f'countries/{country}.json').read_text())
    rules = json.loads((ROOT / 'tools/config/genre-cleanup.json').read_text())
    custom = ROOT / f'countries/{country}.genre-cleanup.json'
    extra = json.loads(custom.read_text()) if custom.exists() else {}
    aliases = {canonical(k): [canonical(v) for v in (values if isinstance(values,list) else [values])] for k,values in {**rules['aliases'],**extra.get('aliases',{})}.items()}
    remove = {canonical(v) for v in rules['remove'] + extra.get('remove',[])}
    path = ROOT / config['stationsFile']
    original = path.read_bytes()
    stations = json.loads(original)
    before = Counter(g for s in stations for g in s.get('genres',[]) if isinstance(g,str))
    changes=[]
    for station in stations:
        old=station.get('genres',[])
        new=clean_genres(old,aliases,remove)
        if old != new:
            changes.append({'stationuuid':station['stationuuid'],'slug':station['slug'],'before':old,'after':new})
            station['genres']=new
    after=Counter(g for s in stations for g in s.get('genres',[]))
    redirects_path=ROOT/config['redirectsFile']
    redirects=json.loads(redirects_path.read_text())
    live_slugs={slug(g) for g in after}
    added={}
    for old in before:
        if slug(old) in live_slugs:continue
        targets=clean_genres([old],aliases,remove)
        target=f'/genres/{slug(targets[0])}/' if len(targets)==1 and targets[0] in after else '/genres/'
        route=f'/genres/{slug(old)}/'
        if slug(old) and route not in redirects:
            added[route]=target
            for page in range(2, (before[old]+19)//20+1):
                paginated=f'{route}page/{page}/'
                if paginated not in redirects:added[paginated]=target
    if args.write:
        if path.read_bytes()!=original:raise RuntimeError('Dataset changed during cleanup')
        path.write_text(json.dumps(stations,ensure_ascii=False,indent=2)+'\n')
        redirects.update(added)
        redirects_path.write_text(json.dumps(redirects,ensure_ascii=False,indent=2)+'\n')
    report={'country':country,'applied':args.write,'stations_changed':len(changes),'unique_before':len(before),'unique_after':len(after),'changes':changes,'redirects':added,'remaining_genres':dict(sorted(after.items())), 'review_tags':[g for g in sorted(after) if len(g)>35 or any(c in g for c in '/+;')]}
    report_path=ROOT/f'reports/genre-cleanup-{country}{"" if args.write else "-preview"}.json'
    report_path.parent.mkdir(exist_ok=True)
    report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(f'{country.upper()}: {len(changes)} stations changed; {len(before)} → {len(after)} unique genres; {"saved" if args.write else "preview only"}. Report: {report_path}')

if __name__=='__main__':main()
