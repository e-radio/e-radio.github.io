import importlib.util
import unittest
from pathlib import Path
spec = importlib.util.spec_from_file_location('geography', Path(__file__).parents[1] / 'tools/fill-station-geography.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class GeographyTest(unittest.TestCase):
    def test_zagreb_city_and_county(self):
        self.assertEqual(module.location_from_address({'country_code':'hr','ISO3166-2-lvl4':'HR-21','city':'Grad Zagreb','city_district':'Zagreb'},'hr'),('Zagreb','Grad Zagreb'))

    def test_locality_not_street_or_suburb(self):
        self.assertEqual(module.location_from_address({'country_code':'hr','town':'Grad Osijek','state':'Osječko-baranjska županija','road':'Istarska','suburb':'Centar'},'hr'),('Osijek','Osječko-baranjska županija'))

    def test_foreign_coordinates_are_rejected(self):
        with self.assertRaisesRegex(ValueError, 'outside'):
            module.location_from_address({'country_code':'ga','city':'Libreville','state':'Estuaire'},'hr')

    def test_county_not_used_as_city(self):
        with self.assertRaisesRegex(ValueError, 'unambiguous'):
            module.location_from_address({'country_code':'hr','county':'Istarska županija','road':'Street'},'hr')

if __name__ == '__main__':
    unittest.main()
