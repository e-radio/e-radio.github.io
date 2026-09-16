"""Bounded website address discovery; never infer a province from a city."""
import json
import re
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links = []
        self.addresses = []
        self.blocks = []
        self.script = None
        self.field = None
        self.fields = {}
        self.address_depth = 0
        self.address_text = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'br' and self.address_depth:
            self.address_text.append('\n')
        if tag == 'a' and attrs.get('href'):
            self.links.append(attrs['href'])
        if tag == 'script':
            self.script = [] if attrs.get('type', '').lower() == 'application/ld+json' else None
        if tag == 'address':
            self.address_depth += 1
        if attrs.get('itemprop') in ('addressLocality', 'addressRegion', 'addressCountry'):
            self.field = (tag, attrs['itemprop'])
            self.fields[attrs['itemprop']] = attrs.get('content', '')
            if tag == 'meta':
                self.field = None

    def handle_data(self, data):
        if self.script is not None:
            self.script.append(data)
        if self.field:
            self.fields[self.field[1]] += data
        if self.address_depth:
            self.address_text.append(data)

    def handle_endtag(self, tag):
        if tag == 'script' and self.script is not None:
            try:
                self.blocks.append(json.loads(''.join(self.script)))
            except ValueError:
                pass
            self.script = None
        if self.field and tag == self.field[0]:
            self.field = None
        if tag == 'address':
            self.address_depth = max(0, self.address_depth - 1)
            self.addresses.append(' '.join(self.address_text))
            self.address_text = []


def walk(value):
    if isinstance(value, list):
        for child in value:
            yield from walk(child)
    elif isinstance(value, dict):
        if value.get('@type') == 'PostalAddress' or 'addressLocality' in value or 'addressRegion' in value:
            yield value
        # Do not use event venues, coverage areas, or unrelated article addresses.
        for key in ('@graph', 'address', 'location'):
            if key in value:
                yield from walk(value[key])


def extract(html, country, country_name):
    page = Page()
    page.feed(html)
    found = []
    for address in [*walk(page.blocks), page.fields]:
        ac = address.get('addressCountry')
        if isinstance(ac, dict):
            ac = ac.get('name') or ac.get('alternateName')
        if ac and str(ac).strip().casefold() not in (country.casefold(), country_name.casefold()):
            continue
        clean = lambda key: address.get(key, '').strip() if isinstance(address.get(key), str) else None
        city, state = clean('addressLocality'), clean('addressRegion')
        if city or state:
            found.append({'city': city or None, 'state': state or None})
    # Dutch postcode + town in explicit address blocks only; street text is excluded.
    if not found and country == 'nl':
        for address in page.addresses:
            match = re.search(r'\b\d{4}\s?[A-Z]{2}\s+([A-Za-zÀ-ž][A-Za-zÀ-ž .’\'-]*?)(?=\s{2,}|[,;\n]|$)', address)
            if match:
                found.append({'city': match[1].strip(), 'state': None})
    unique = {tuple(item.items()) for item in found}
    if len(unique) > 1:
        raise ValueError('Multiple website addresses; manual review required')
    return (found[0] if found else {}), page.links


def fetch_page(url, user_agent):
    if urlsplit(url).scheme not in ('http', 'https'):
        raise ValueError('Unsupported website URL')
    with urlopen(Request(url, headers={'User-Agent': user_agent}), timeout=15) as response:
        if 'html' not in response.headers.get('Content-Type', ''):
            raise ValueError('Website did not return HTML')
        return response.read(1024 * 1024).decode(response.headers.get_content_charset() or 'utf-8', errors='replace'), response.url


def discover(homepage, country, country_name, user_agent, fetch=fetch_page):
    queue = [homepage]
    visited = set()
    evidence = []
    result = {}
    errors = []
    while queue and len(visited) < 4:
        url = queue.pop(0)
        if url in visited:
            continue
        visited.add(url)
        try:
            html, final = fetch(url, user_agent)
            values, links = extract(html, country, country_name)
            if values:
                for key, value in values.items():
                    if value and result.get(key) and result[key] != value:
                        raise ValueError('Conflicting website addresses; manual review required')
                    if value:
                        result[key] = value
                evidence.append({'url': final, 'location': values})
            if len(visited) == 1:
                origin = urlsplit(final).netloc
                for link in links:
                    target = urljoin(final, link).split('#')[0]
                    if urlsplit(target).netloc == origin and re.search(r'contact|kontakt|over-ons|about|impressum', urlsplit(target).path, re.I):
                        if target not in queue and target not in visited:
                            queue.append(target)
        except ValueError as exc:
            if 'addresses' in str(exc):
                raise
            errors.append({'url': url, 'error': str(exc)})
        except Exception as exc:
            errors.append({'url': url, 'error': str(exc)})
    return result, evidence, errors
