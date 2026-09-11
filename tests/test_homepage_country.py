import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('homepage', Path(__file__).parents[1] / 'tools/fill-state-from-homepage.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class HomepageCountryTest(unittest.TestCase):
    def test_greece_default_path_is_preserved(self):
        data, progress, _ = module.country_settings('GR')
        self.assertEqual(data.name, 'stations-gr.json')
        self.assertEqual(progress.name, 'state-fill-progress.json')

    def test_croatia_paths_are_isolated(self):
        data, progress, agent = module.country_settings('hr')
        self.assertEqual(data.name, 'stations-hr.json')
        self.assertEqual(progress.name, 'state-fill-progress-hr.json')
        self.assertIn('radio-hrvatska.github.io', agent)

    def test_invalid_code_is_rejected(self):
        with self.assertRaises(ValueError):
            module.country_settings('../gr')

    def test_environment_country_updates_only_its_dataset(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root/'countries').mkdir()
            (root/'src/data').mkdir(parents=True)
            for code in ('gr','hr'):
                (root/f'countries/{code}.json').write_text(json.dumps({'countryCode':code.upper(),'stationsFile':f'src/data/stations-{code}.json','siteUrl':f'https://{code}.example'}))
                (root/f'src/data/stations-{code}.json').write_text(json.dumps([{'stationuuid':code,'name':code,'state':None,'homepage':'https://station.example'}]))
            original=(root/'src/data/stations-gr.json').read_bytes()
            html='<script type="application/ld+json">{"address":{"addressRegion":"Zadarska županija"}}</script>'
            with patch.object(module,'ROOT',root), patch.dict(os.environ,{'COUNTRY':'hr'}), patch('sys.argv',['script','--max','1']), patch.object(module,'fetch_html',return_value=html):
                self.assertEqual(module.main(),0)
            self.assertEqual((root/'src/data/stations-gr.json').read_bytes(),original)
            self.assertEqual(json.loads((root/'src/data/stations-hr.json').read_text())[0]['state'],'Zadarska županija')

if __name__ == '__main__':
    unittest.main()
