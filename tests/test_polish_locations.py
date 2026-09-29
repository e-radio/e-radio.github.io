import importlib.util
import unittest
from pathlib import Path
spec = importlib.util.spec_from_file_location('cleanup', Path(__file__).resolve().parents[1] / 'tools/clean-polish-locations.py')
cleanup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cleanup)

class PolishLocationTests(unittest.TestCase):
    def test_slug_matches_existing_routes(self):
        self.assertEqual(cleanup.slug('Łódź'), 'odz')
        self.assertEqual(cleanup.slug('Kraków'), 'krakow')

    def test_duplicate_spelling_routes_keep_suffix(self):
        groups = cleanup.groups([{'city':'Krakow'}, {'city':'Kraków'}, {'city':None}], 'city')
        self.assertEqual(groups['Krakow'][0], 'krakow')
        self.assertEqual(groups['Kraków'][0], 'krakow-2')
        self.assertEqual(groups['Other'][0], 'other')
