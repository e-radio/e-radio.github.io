import importlib.util
import json
from pathlib import Path
import subprocess
import unittest
ROOT=Path(__file__).parents[1]
spec=importlib.util.spec_from_file_location('taxonomy',ROOT/'tools/lib/station-taxonomy.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class TaxonomyTests(unittest.TestCase):
    def test_separates_formats_unknowns_and_noise(self):
        self.assertEqual(m.classify(['Pop','news','greek','Radio Mystery','128 kbps','ert']), {
            'genres':['pop'],'formats':['news','greek-language music'],
            'review':['radio mystery'],'removed':['128 kbps','ert']})
    def test_polish_compound_and_idempotency(self):
        result=m.classify(["euro & italo disco italo disco new generation spacesynth pop 80's disco fox"],'pl')
        self.assertEqual(result['genres'],['euro disco','italo disco','italo disco new generation','spacesynth','pop','disco fox'])
        self.assertEqual(result['formats'],['80s'])
        self.assertEqual(m.classify(result['genres']+result['formats'],'pl'),result)
    def test_country_translations(self):
        result=m.classify(['nieuws','nederlandstalig','piraten muziek'],'nl')
        self.assertEqual(result['genres'],[])
        self.assertEqual(result['formats'],['news','dutch-language music','dutch pirate music'])
    def test_python_javascript_agree_on_all_dataset_and_policy_tags(self):
        policy=json.loads((ROOT/'tools/config/station-taxonomy.json').read_text())
        cases=[]
        for path in (ROOT/'src/data').glob('stations-*.json'):
            country=path.stem[-2:]
            tags=list(dict.fromkeys([g for s in json.loads(path.read_text()) for key in ('genres','formats','genre_review') for g in s.get(key,[])] + list(policy['aliases'])+policy['genres']+policy['formats']))
            cases.append({'country':country,'tags':tags})
        script="import {classifyTags} from './tools/lib/station-taxonomy.mjs';let s='';for await(const c of process.stdin)s+=c;console.log(JSON.stringify(JSON.parse(s).map(c=>c.tags.map(t=>classifyTags([t],c.country)))));"
        actual=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],input=json.dumps(cases).encode(),cwd=ROOT))
        expected=[[m.classify([tag],case['country']) for tag in case['tags']] for case in cases]
        self.assertEqual(actual,expected)
