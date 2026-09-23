import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('audio_info', Path(__file__).parents[1] / 'tools/fill-stream-audio-info.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class StreamGenresTest(unittest.TestCase):
    def test_compound_public_radio_tag(self):
        payload = {'format': {'tags': {'icy-genre': 'Public Radio greek hellas greece laika'}}}
        self.assertEqual(module.stream_genres(payload, {}), ['public radio', 'greek', 'laika'])

    def test_compounds_preserve_multiword_genres_and_deduplicate(self):
        payload = {'format': {'tags': {'genre': '80s rock oldies pop disco classic rock easy listening; classic rock'}}}
        self.assertEqual(module.stream_genres(payload, {}),
                         ['80s', 'rock', 'oldies', 'pop', 'disco', 'classic rock', 'easy listening'])

    def test_shared_aliases_and_unknown_tags(self):
        payload = {'format': {'tags': {'genre': 'top40; Pop Music; niche folk style; R&amp;B Soul'}}}
        self.assertEqual(module.stream_genres(payload, {}), ['top 40', 'pop', 'niche folk style', 'r&b', 'soul'])

    def test_country_rules_are_used(self):
        payload = {'format': {'tags': {'genre': 'local mix; excluded'}}}
        self.assertEqual(module.stream_genres(payload, {}, ({'local mix': ['folk', 'talk']}, {'excluded'})), ['folk', 'talk'])

    def test_format_and_audio_genres_are_normalized_and_deduplicated(self):
        payload = {'format': {'tags': {'icy-genre': ' Rock, Pop; rock '}}}
        audio = {'tags': {'GENRE': 'R&B | Soul'}}
        self.assertEqual(module.stream_genres(payload, audio), ['rock', 'pop', 'r&b', 'soul'])

    def test_titles_and_station_names_are_not_genres(self):
        payload = {'format': {'tags': {'icy-name': 'Rock FM', 'StreamTitle': 'Jazz song'}}}
        self.assertEqual(module.stream_genres(payload, {}), [])

    def test_missing_and_placeholder_values_are_ignored(self):
        self.assertEqual(module.stream_genres({}, {}), [])
        self.assertEqual(module.stream_genres({'format': {'tags': {'genre': 'unknown; N/A; -; default genre; my genre; icecast; unspecified'}}}, {}), [])


if __name__ == '__main__':
    unittest.main()
