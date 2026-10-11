import importlib.util
import json
from email.message import Message
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'tools' / 'find-https-streams.py'
spec = importlib.util.spec_from_file_location('find_https_streams', SCRIPT)
finder = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = finder
spec.loader.exec_module(finder)


class FindHttpsStreamsTests(unittest.TestCase):
    def test_extracts_player_and_playlist_streams_with_evidence(self):
        pages = {
            'https://radio.test/': ('<script>MRP.insert({"url":"https:\\/\\/cast.test:9006\\/stream1"})</script>'
                                    '<a href="/listen.pls">Listen</a><a href="/player">Player</a>', 'text/html'),
            'https://radio.test/listen.pls': ('[playlist]\nFile1=https://other.test/live.mp3\n', 'audio/x-scpls'),
            'https://radio.test/player': ('<audio src="https://cast.test/live.aac"></audio>', 'text/html'),
        }
        def fetch(url, **_):
            body, kind = pages[url]
            headers = Message()
            headers['Content-Type'] = kind
            return body.encode(), url, headers
        found, errors = finder.discover({'homepage': 'https://radio.test/', 'stream_url': 'http://cast.test:8004/stream1'}, fetcher=fetch)
        self.assertEqual(errors, [])
        self.assertIn('https://cast.test:9006/stream1', found)
        self.assertIn('https://other.test/live.mp3', found)
        self.assertIn('https://cast.test/live.aac', found)
        self.assertEqual(found['https://other.test/live.mp3'][0]['source'], 'playlist')
        self.assertNotIn('http://cast.test:8004/stream1', found)

    def test_verifies_audio_and_rejects_downgrade_or_html(self):
        def fetch(url, **_):
            headers = Message()
            headers['Content-Type'] = 'audio/mpeg'
            return b'audio', url, headers
        calls = []
        def run(command, **_):
            calls.append(command)
            return subprocess.CompletedProcess(command, 0, '{"streams":[{"codec_type":"audio","codec_name":"mp3","bit_rate":"128000"}]}', '')
        checked = finder.verify('https://cast.test/live.mp3', fetcher=fetch, runner=run)
        self.assertTrue(checked['verified'])
        self.assertEqual(checked['codec'], 'MP3')
        self.assertEqual(checked['bitrate'], 128)
        self.assertIn('-tls_verify', calls[0])
        self.assertFalse(finder.verify('https://cast.test/live.mp3', fetcher=lambda url, **_: (b'', 'http://cast.test/live.mp3', Message()), runner=run)['verified'])
        html = Message()
        html['Content-Type'] = 'text/html'
        self.assertFalse(finder.verify('https://cast.test/live.mp3', fetcher=lambda url, **_: (b'', url, html), runner=run)['verified'])

    def test_verified_streams_match_station_format(self):
        candidates = [
            {'url': 'https://cast.test/one', 'verified': True, 'codec': 'MP3', 'bitrate': 128},
            {'url': 'https://cast.test/two', 'verified': True, 'codec': 'MP3', 'bitrate': 128},
            {'url': 'https://cast.test/bad', 'verified': False},
        ]
        self.assertEqual(finder.format_verified_streams(candidates), [
            {'id': 'mp3-128-alternative', 'label': 'Alternative', 'url': 'https://cast.test/one', 'bitrate': 128, 'codec': 'MP3'},
            {'id': 'mp3-128-alternative-2', 'label': 'Alternative', 'url': 'https://cast.test/two', 'bitrate': 128, 'codec': 'MP3'},
        ])

    def test_approved_write_preserves_field_order_and_requires_verification(self):
        original = ('[\n  {\n    "slug": "one",\n    "stationuuid": "uuid-1",\n'
                    '    "stream_url": "http://cast.test/live",\n    "streams": [{"url": "http://backup.test/live"}]\n  }\n]\n')
        report = {'complete': True, 'results': [{'stationuuid': 'uuid-1', 'http_url': 'http://cast.test/live',
                  'candidates': [{'url': 'https://cast.test/live', 'verified': True}]}]}
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            stations = base / 'stations.json'
            review = base / 'review.json'
            approvals = base / 'approvals.json'
            stations.write_text(original)
            review.write_text(json.dumps(report))
            approvals.write_text(json.dumps([{'stationuuid': 'uuid-1', 'https_url': 'https://cast.test/live'}]))
            count = finder.apply_approvals(stations, review, approvals, verifier=lambda _: {'verified': True})
            self.assertEqual(count, 1)
            self.assertEqual(stations.read_text(), original.replace('"http://cast.test/live"', '"https://cast.test/live"'))
            stations.write_text(original)
            with self.assertRaisesRegex(ValueError, 'no longer verifies'):
                finder.apply_approvals(stations, review, approvals, verifier=lambda _: {'verified': False})
            self.assertEqual(stations.read_text(), original)
            report['results'][0]['candidates'][0]['verified'] = False
            review.write_text(json.dumps(report))
            with self.assertRaisesRegex(ValueError, 'not verified'):
                finder.apply_approvals(stations, review, approvals, verifier=lambda _: {'verified': True})

    def test_rejects_private_urls_and_changed_station_data(self):
        self.assertIsNone(finder.public_url('http://127.0.0.1/live'))
        self.assertIsNone(finder.public_url('http://cast.test/live', https_only=True))
        with self.assertRaisesRegex(ValueError, 'changed since report'):
            finder.replace_primary_urls('[{"stationuuid":"uuid-1","stream_url":"http://new.test/live"}]',
                                        {'uuid-1': ('http://old.test/live', 'https://cast.test/live')})


if __name__ == '__main__':
    unittest.main()
