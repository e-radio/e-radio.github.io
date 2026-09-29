#!/usr/bin/env python3
"""Find unused site images across all countries; preview unless --write is given."""
import argparse
import collections
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
IMAGES = {'.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico', '.gif', '.avif'}
TEXT = {'.json', '.astro', '.ts', '.tsx', '.js', '.mjs', '.css', '.html', '.md', '.mdx', '.webmanifest', '.svg'}
# These two guide covers are selected using a template literal at runtime.
DYNAMIC = {'/images/guides/croatian-radio-en.jpg', '/images/guides/croatian-radio-hr.jpg'}

def audit():
    sources = []
    for folder in ['src', 'countries', 'public']:
        for path in (ROOT / folder).rglob('*'):
            if not path.is_file() or path.suffix not in TEXT:
                continue
            if path.parent == ROOT / 'src/data' and not path.name.startswith('stations-'):
                continue  # Historical import/review reports are not site inputs.
            if folder == 'public' and (path.suffix in IMAGES or 'prompt' in path.name):
                continue
            sources.append(path.read_text())
    content = '\n'.join(sources)
    unused = []
    for folder in ['public', 'src/assets']:
        for path in (ROOT / folder).rglob('*'):
            if not path.is_file() or path.suffix.lower() not in IMAGES:
                continue
            url = '/' + str(path.relative_to(ROOT / 'public')) if folder == 'public' else str(path.relative_to(ROOT))
            if url in DYNAMIC or url in content or path.name in content:
                continue
            unused.append(path)
    return unused

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    unused = audit()
    report = {'deleted': args.write, 'count': len(unused), 'bytes': sum(p.stat().st_size for p in unused),
              'files': [str(p.relative_to(ROOT)) for p in unused]}
    output = ROOT / ('reports/unused-images.json' if args.write else 'reports/unused-images-preview.json')
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    if args.write:
        for path in unused:
            path.unlink()
    print(json.dumps({k: v for k, v in report.items() if k != 'files'}))
    print(dict(collections.Counter(str(p.relative_to(ROOT).parent) for p in unused)))
if __name__ == '__main__':
    main()
