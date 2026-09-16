import importlib.util
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('locations', Path(__file__).parents[1] / 'tools/fill-station-locations.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class LocationCliTest(unittest.TestCase):
    def test_country_preview_write_and_preserve_existing_state(self):
        for write in (False, True):
            with self.subTest(write=write), tempfile.TemporaryDirectory() as tmp:
                old=os.getcwd()
                try:
                    os.chdir(tmp)
                    Path('countries').mkdir()
                    Path('countries/nl.json').write_text(json.dumps({'countryName':'Netherlands','stationsFile':'stations.json','siteUrl':'https://example.nl'}))
                    station={'stationuuid':'one','slug':'one','name':'One','city':None,'state':'Utrecht','homepage':'https://radio.test'}
                    Path('stations.json').write_text(json.dumps([station]))
                    argv=['script','--country','nl','--no-coordinates','--sleep','0','--max','1']+(['--write'] if write else [])
                    with patch('sys.argv',argv), patch.object(module,'discover',return_value=({'city':'Houten','state':'Other'},[{'url':'https://radio.test/contact'}],[])):
                        module.main()
                    result=json.loads(Path('stations.json').read_text())[0]
                    self.assertEqual(result['city'],'Houten' if write else None)
                    self.assertEqual(result['state'],'Utrecht')
                    report=json.loads(Path('reports/geography-nl.json').read_text())
                    self.assertEqual(report['records'][0]['status'],'changed')
                    self.assertEqual(report['applied'],write)
                finally:
                    os.chdir(old)
