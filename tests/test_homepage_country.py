import io
import contextlib
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

class HomepageSummaryTest(unittest.TestCase):
    def test_summary_on_exhaustion_limit_and_interrupt(self):
        for mode in ('exhaustion', 'limit', 'interrupt'):
            with self.subTest(mode=mode), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                data = root/'stations.json'
                progress = root/'progress.json'
                records = [
                    {'stationuuid':'existing','state':'Stockholm'},
                    {'stationuuid':'previous','state':None},
                    {'stationuuid':'missing','state':None},
                    {'stationuuid':'error','state':None,'homepage':'https://error.test'},
                    {'stationuuid':'empty','state':None,'homepage':'https://empty.test'},
                    {'stationuuid':'filled','state':None,'homepage':'https://filled.test'},
                    {'stationuuid':'last','state':None,'homepage':'https://last.test'},
                ]
                data.write_text(json.dumps(records))
                progress.write_text(json.dumps(['previous']))
                def fetch(url, agent):
                    if 'error.test' in url: raise OSError('Unavailable')
                    if 'empty.test' in url: return '<html></html>'
                    if 'last.test' in url and mode == 'interrupt': raise KeyboardInterrupt()
                    return '<script type="application/ld+json">{"address":{"addressRegion":"Stockholm county"}}</script>'
                output = io.StringIO()
                argv = ['script','--country','se','--max','1' if mode == 'limit' else '0']
                with patch.object(module,'country_settings',return_value=(data,progress,'test')), patch('sys.argv',argv), patch.object(module,'fetch_html',side_effect=fetch), contextlib.redirect_stdout(output):
                    self.assertEqual(module.main(),130 if mode == 'interrupt' else 0)
                text = output.getvalue()
                self.assertIn('States filled and saved: '+('2' if mode == 'exhaustion' else '1'), text)
                self.assertIn('Missing homepage: 1', text)
                self.assertIn('Homepage fetch errors: 1', text)
                self.assertIn('No state found: 1', text)
                self.assertIn('already had state: 1; previously recorded: 1', text)
                self.assertIn('eligible next run: '+('0' if mode == 'exhaustion' else '1'), text)
                self.assertEqual(json.loads(data.read_text())[5]['state'],'Stockholm county')

if __name__ == '__main__':
    unittest.main()
