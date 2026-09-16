import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parents[1] / 'tools'))
from website_geography import extract, discover

class WebsiteGeographyTest(unittest.TestCase):
    def test_structured_city_is_not_state(self):
        result, _ = extract('<script type="application/ld+json">{"@type":"Organization","address":{"addressLocality":"Houten","addressCountry":"NL"}}</script>', 'nl', 'Netherlands')
        self.assertEqual(result, {'city':'Houten','state':None})

    def test_contact_links_and_conflicts(self):
        pages={'https://radio.test/':'<a href="/contact">Contact</a><a href="https://other.test/contact">Other</a>', 'https://radio.test/contact':'<div itemprop="addressLocality">Houten</div><div itemprop="addressRegion">Utrecht</div>'}
        calls=[]
        def fetch(url, agent):
            calls.append(url)
            return pages[url], url
        values, evidence, errors=discover('https://radio.test/', 'nl','Netherlands','test',fetch)
        self.assertEqual(values, {'city':'Houten','state':'Utrecht'})
        self.assertEqual(len(calls),2)
        self.assertEqual(evidence[0]['url'],'https://radio.test/contact')
        self.assertEqual(errors,[])

    def test_ambiguous_and_foreign_addresses(self):
        with self.assertRaisesRegex(ValueError,'Multiple'):
            extract('<script type="application/ld+json">[{"addressLocality":"A"},{"addressLocality":"B"}]</script>','nl','Netherlands')
        self.assertEqual(extract('<meta itemprop="addressCountry" content="DE"><meta itemprop="addressLocality" content="Berlin">','nl','Netherlands')[0],{})

    def test_address_block_not_arbitrary_text(self):
        self.assertEqual(extract('<p>1234 AB Amsterdam</p>','nl','Netherlands')[0],{})
        self.assertEqual(extract('<address>Street 2<br>1234 AB Amsterdam<br>Phone: 123</address>','nl','Netherlands')[0],{'city':'Amsterdam','state':None})
