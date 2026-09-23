"""Approved station categories shared with the JavaScript importer via JSON policy."""
import html
import json
import re
import unicodedata
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]

def canonical(value):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFKC', html.unescape(value)).lower()).strip()

def classify(tags, country='gr'):
    policy = load_policy(country)
    genres, formats, aliases, remove = policy
    result = {'genres': [], 'formats': [], 'review': [], 'removed': []}
    def add(key, value):
        if value not in result[key]: result[key].append(value)
    def visit(raw, seen=frozenset()):
        if not isinstance(raw, str): return
        value = canonical(raw)
        if not value or value in remove or re.fullmatch(r'\d+\s*(kbps|kbit/s|bit)', value):
            if value: add('removed', value)
            return
        if re.fullmatch(r'[0-9]0|(?:19|20)[0-9]0', value): value += 's'
        match = re.fullmatch(r"(?:19|20)?(\d0)[’'´]?s", value)
        if match and not value.startswith(('192','193','194')): value = match[1] + 's'
        if value in genres: add('genres', value); return
        if value in formats: add('formats', value); return
        if value in aliases and value not in seen:
            for target in aliases[value]: visit(target, seen | {value})
            return
        parts = re.split(r'[,;|]', value)
        if len(parts)>1:
            for part in parts: visit(part, seen)
            return
        add('review', value)
    for tag in tags or []: visit(tag)
    return result

from functools import lru_cache
@lru_cache(maxsize=None)
def load_policy(country):
    policy=json.loads((ROOT/'tools/config/station-taxonomy.json').read_text())
    shared=json.loads((ROOT/'tools/config/genre-cleanup.json').read_text())
    path=ROOT/f'countries/{country}.genre-cleanup.json'
    custom=json.loads(path.read_text()) if path.exists() else {}
    aliases={canonical(k): [canonical(v) for v in (values if isinstance(values,list) else [values])]
             for k,values in {**shared['aliases'],**policy['aliases'],**custom.get('aliases',{})}.items()}
    remove={canonical(v) for v in shared['remove']+policy['remove']+custom.get('remove',[])}
    return set(policy['genres']),set(policy['formats']),aliases,remove
