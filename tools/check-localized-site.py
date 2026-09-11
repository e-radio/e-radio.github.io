#!/usr/bin/env python3
"""Validate the built English/Croatian site: python3 tools/check-localized-site.py dist."""
import json
import sys
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import xml.etree.ElementTree as ET

class Page(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.links=[]; self.lang=None; self.redirect=False; self.redirect_target=None; self.scripts=[]; self.script=None; self.meta={}
        self.feed(source)
    def handle_starttag(self, tag, attributes):
        a=dict(attributes)
        if tag=='html': self.lang=a.get('lang')
        if tag in ('link','a'): self.links.append((tag,a))
        if tag=='meta':
            if a.get('http-equiv','').lower()=='refresh':
                self.redirect=True
                self.redirect_target=a.get('content','').split('url=',1)[-1].strip('"\' ')
            self.meta[a.get('name',a.get('property',''))]=a.get('content')
        if tag=='script' and a.get('type')=='application/ld+json': self.script=''
    def handle_data(self, data):
        if self.script is not None:self.script+=data
    def handle_endtag(self, tag):
        if tag=='script' and self.script is not None:
            self.scripts.append(json.loads(self.script)); self.script=None

def check(root):
    pages={'/'+str(p.relative_to(root)).replace('index.html',''):Page(p.read_text()) for p in root.rglob('*.html')}
    count=0
    for path,page in pages.items():
        if page.redirect:
            target=urlsplit(page.redirect_target).path
            assert target in pages and not pages[target].redirect,(path,'invalid redirect target',target)
            continue
        assert page.lang in ('en','hr'),path
        expected='hr' if path.startswith('/hr/') else 'en'
        assert page.lang==expected,(path,page.lang)
        canonical=[a['href'] for tag,a in page.links if tag=='link' and a.get('rel')=='canonical']
        assert len(canonical)==1,(path,'canonical count',canonical)
        origin=urlsplit(canonical[0]).scheme+'://'+urlsplit(canonical[0]).netloc
        assert urlsplit(canonical[0]).path==path,(path,canonical)
        base=path[3:] if expected=='hr' else path
        expected_alternates={'en':origin+base,'hr':origin+'/hr'+base,'x-default':origin+base}
        alternates={a['hreflang']:a['href'] for tag,a in page.links if tag=='link' and a.get('rel')=='alternate' and a.get('hreflang')}
        assert alternates==expected_alternates,(path,alternates,expected_alternates)
        for href in alternates.values():
            target=urlsplit(href).path
            assert target in pages and not pages[target].redirect,(path,'alternate missing',target)
        for tag,a in page.links:
            if tag!='a' or not a.get('href','').startswith('/'):continue
            target=urlsplit(a['href']).path
            if target.endswith('/'):
                assert target in pages,(path,'missing internal page',target)
                if not a.get('hreflang'):
                    assert target.startswith('/hr/')==(expected=='hr'),(path,'language leak',target)
        assert page.meta.get('description'),(path,'missing description')
        assert page.meta.get('google-site-verification'),(path,'missing verification tag')
        if page.meta.get('og:url'):assert page.meta['og:url']==canonical[0],path
        count+=1
    ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
    tree=ET.fromstring((root/'sitemap.xml').read_text())
    urls=[entry.text for entry in tree.findall('s:url/s:loc',ns)]
    assert len(urls)==len(set(urls)),'Duplicate sitemap URLs'
    for url in urls:
        path=unquote(urlsplit(url).path)
        assert path in pages and not pages[path].redirect,('sitemap missing/redirect URL',path)
        pair=path[3:] if path.startswith('/hr/') else '/hr'+path
        assert urlsplit(url)._replace(path=pair).geturl() in urls,('sitemap missing translation',url)
    for language in ('en','hr'):
        manifest=json.loads((root/('hr/site.webmanifest' if language=='hr' else 'site.webmanifest')).read_text())
        assert manifest['lang']==language
    print(f'Validated {count} pages and {len(urls)} sitemap entries: language, canonicals, reciprocal alternates, internal links, JSON-LD, manifests.')

if __name__=='__main__':check(Path(sys.argv[1] if len(sys.argv)>1 else 'dist'))
