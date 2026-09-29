#!/usr/bin/env python3
"""Normalize reviewed Polish locations; preview by default, --write to apply."""
import argparse, collections, copy, json, math, re, unicodedata
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
def key(value):
    return (value or '').strip().casefold()
def slug(value):
    value = ''.join(c for c in unicodedata.normalize('NFD', value) if not unicodedata.combining(c))
    return re.sub('[^a-z0-9]+', '-', value.lower().strip().replace("'", '').replace('"', '')).strip('-')[:80] or 'other'
def groups(data, field):
    result = {}; counts = collections.Counter()
    for s in data: result.setdefault(s.get(field) or 'Other', []).append(s)
    output = {}
    for name, stations in result.items():
        base=slug(name); counts[base]+=1
        output[name]=(base if counts[base]==1 else f'{base}-{counts[base]}',stations)
    return output

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--write',action='store_true');args=parser.parse_args()
    policy=json.loads((ROOT/'countries/pl.location-names.json').read_text())
    states={key(k):v for k,v in policy['stateNames'].items()}
    cities={key(k):v for k,v in policy['cityAliases'].items()}
    cities.update({key(k):k for k in policy['cityRegions']})
    path=ROOT/'src/data/stations-pl.json';raw=path.read_text();before=json.loads(raw);data=copy.deepcopy(before)
    changes=[];review=[]
    for s in data:
        old={k:s.get(k) for k in ('state','city','locationNames')}
        state=s.get('state');city=cities.get(key(s.get('city')),s.get('city'))
        state_city=cities.get(key(state)); normalized=states.get(key(state))
        if not city and state_city:city=state_city
        city_region=policy['cityRegions'].get(city)
        if normalized and city_region and normalized!=city_region:
            review.append({'stationuuid':s['stationuuid'],'reason':'City and region conflict; retained explicit region','state':state,'city':city})
        if not normalized:normalized=city_region or policy['cityRegions'].get(state_city)
        if state and not normalized:
            review.append({'stationuuid':s['stationuuid'],'reason':'Unresolved region removed from public grouping','state':state,'city':city})
        s['state']=normalized;s['city']=city
        if normalized or city or s.get('locationNames'):
            names=s.setdefault('locationNames',{})
            names['en']={'city':policy.get('englishCityNames', {}).get(city, city),'state':normalized}
            names['pl']={'city':city,'state':policy['polishNames'].get(normalized)}
        new={k:s.get(k) for k in old}
        if old!=new:changes.append({'stationuuid':s['stationuuid'],'before':old,'after':new})
    redirects_path=ROOT/'countries/pl.redirects.json';redirects=json.loads(redirects_path.read_text());added={}
    for field,route in [('state','region'),('city','city')]:
        oldgroups=groups(before,field);newgroups=groups(data,field)
        live={f'/{route}/{v[0]}/' for v in newgroups.values()}
        byid={s['stationuuid']:s for s in data}
        for name,(oldslug,members) in oldgroups.items():
            oldpath=f'/{route}/{oldslug}/'
            targets={byid[s['stationuuid']].get(field) or 'Other' for s in members}
            target=f'/{route}/{newgroups[next(iter(targets))][0]}/' if len(targets)==1 else f'/{route}/'
            if oldpath not in live:
                added[oldpath]=target
                for page in range(2,math.ceil(len(members)/20)+1):added[f'{oldpath}page/{page}/']=target
        for path in live:redirects.pop(path,None)
    for k,v in list(redirects.items()):
        if v in added:redirects[k]=added[v]
    redirects.update(added)
    report={'changed':len(changes),'regions':sorted({s['state'] for s in data if s['state']}),'review':review,'changes':changes,'redirects':added}
    report_path=ROOT/('reports/location-cleanup-pl.json' if args.write else 'reports/location-cleanup-pl-preview.json')
    report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    if args.write:
        assert (ROOT/'src/data/stations-pl.json').read_text()==raw,'Dataset changed during cleanup'
        (ROOT/'src/data/stations-pl.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
        redirects_path.write_text(json.dumps(redirects,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'changed':len(changes),'regions':len(report['regions']),'review':len(review),'redirects':len(added),'write':args.write}))
if __name__=='__main__':main()
