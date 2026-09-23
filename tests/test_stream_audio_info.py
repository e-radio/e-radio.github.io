import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('audio_info', Path(__file__).parents[1] / 'tools/fill-stream-audio-info.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class StreamGenresTest(unittest.TestCase):
    def test_probe_filters_public_genres_and_preserves_format_and_review_evidence(self):
        from unittest.mock import patch
        from types import SimpleNamespace
        import json
        payload = {'streams': [{'codec_type': 'audio', 'codec_name': 'mp3', 'bit_rate': '128000'}],
                   'format': {'tags': {'icy-genre': 'Public Radio greek hellas greece laika; My Brand'}}}
        with patch.object(module.subprocess, 'run', return_value=SimpleNamespace(stdout=json.dumps(payload), stderr='')):
            result = module.probe('https://example.com/stream')
        self.assertEqual(result['genres'], ['laika'])
        self.assertEqual(result['formats'], ['public radio', 'greek-language music'])
        self.assertEqual(result['review'], ['my brand'])
        self.assertEqual(result['ffprobe_format_tags'], payload['format']['tags'])
        self.assertEqual(result['bitrate'], 128)

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
