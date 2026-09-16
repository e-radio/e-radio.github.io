import importlib.util
import unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('genres',Path(__file__).parents[1]/'tools/clean-station-genres.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class GenreTest(unittest.TestCase):
    def test_aliases_decades_duplicates_and_technical_tags(self):
        self.assertEqual(m.clean_genres([' POP  Music ','pop','90’s','1990s','1920s','32 kbps','mp3','rock &amp; roll'],{'pop music':['pop']},{'mp3'}),['pop','90s','1920s','rock & roll'])
    def test_preserve_unknown_and_idempotency(self):
        aliases={'chillout+lounge':['chillout','lounge']}
        once=m.clean_genres(['chillout+lounge','niche folk style',None],aliases,set())
        self.assertEqual(once,['chillout','lounge','niche folk style'])
        self.assertEqual(m.clean_genres(once,aliases,set()),once)
    def test_compound_classic_hits_uses_shared_rules(self):
        import json
        rules=json.loads((Path(__file__).parents[1]/'tools/config/genre-cleanup.json').read_text())
        self.assertEqual(m.clean_genres(["classic hits 80's 90's", '80s'], rules['aliases'], set(rules['remove'])), ['classic hits','80s','90s'])

    def test_bare_decades_and_existing_forms_deduplicate(self):
        self.assertEqual(m.clean_genres(['70', '70s', '80', '90', '00', '10', '20', '30', '40', '50', '60', '1980', '1930'], {}, set()), ['70s','80s','90s','00s','10s','20s','30s','40s','50s','60s','1930s'])
        self.assertEqual(m.clean_genres(['top 40', '103.5', '78-rpm', '1920s'], {}, set()), ['top 40','103.5','78-rpm','1920s'])

    def test_holiday_and_dutch_compound_rules(self):
        import json
        root=Path(__file__).parents[1]
        shared=json.loads((root/'tools/config/genre-cleanup.json').read_text())
        dutch=json.loads((root/'countries/nl.genre-cleanup.json').read_text())
        aliases={k: v if isinstance(v,list) else [v] for k,v in {**shared['aliases'],**dutch['aliases']}.items()}
        self.assertEqual(m.clean_genres(['holiday music (nov-dec)', 'seasonal/holiday', "instrumentaal en de beste oldie's"], aliases, set()), ['holiday music','instrumental','oldies'])

    def test_dutch_rules_translate_in_one_pass(self):
        import json
        root=Path(__file__).parents[1]
        shared=json.loads((root/'tools/config/genre-cleanup.json').read_text())
        local=json.loads((root/'countries/nl.genre-cleanup.json').read_text())
        aliases={k:v if isinstance(v,list) else [v] for k,v in {**shared['aliases'],**local['aliases']}.items()}
        removed=set(shared['remove']+local['remove'])
        result=m.clean_genres(['piraten muziek','nederlandstalig','kerk- en koormuziek','duits','salsa','schlager'],aliases,removed)
        self.assertEqual(result,['dutch pirate music','dutch-language music','church music','choral music','german','salsa','schlager'])
        self.assertEqual(m.clean_genres(result,aliases,removed),result)

    def test_slug_matches_site_conventions(self):
        self.assertEqual(m.slug("80's"),'80s')
        self.assertEqual(m.slug('R&B'),'r-b')
