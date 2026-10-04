import copy
import contextlib
import importlib.util
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('merge_stations', ROOT / 'tools/merge-stations.py')
merge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(merge)


def fixture():
    parent = {
        'slug': 'main', 'stationuuid': 'parent', 'name': 'Main', 'state': 'Attica',
        'city': None, 'stream_url': 'https://radio.example/default', 'homepage': 'https://radio.example',
        'favicon': '/station-icons/gr/main.png', 'genres': ['pop'], 'bitrate': 128,
        'codec': 'MP3', 'nowplaying_url': 'https://radio.example/now', 'metadata_server': 'shoutcast',
        'aliases': ['older-main'], 'alternate_stationuuids': ['older-uuid'],
        'streams': [{'id': 'aac-64', 'label': 'AAC', 'url': 'https://radio.example/aac',
                     'bitrate': 64, 'codec': 'AAC'}],
    }
    child = {
        'slug': 'duplicate', 'stationuuid': 'child', 'name': 'Main Radio', 'state': 'Attica',
        'city': 'Athens', 'stream_url': 'https://radio.example/other',
        'homepage': 'https://radio.example', 'favicon': '/station-icons/gr/duplicate.png',
        'genres': ['rock'], 'formats': ['hits'], 'bitrate': 192, 'codec': 'MP3',
        'nowplaying_url': 'https://other.example/now', 'metadata_server': 'icecast',
        'history_url': 'https://other.example/history', 'aliases': ['old-duplicate'],
        'alternate_stationuuids': ['old-child-uuid'],
        'streams': [
            {'id': 'aac-alt', 'label': 'AAC', 'url': 'https://radio.example/aac',
             'bitrate': 64, 'codec': 'AAC', 'nowplaying_url': 'https://radio.example/aac-now'},
            {'id': 'flac', 'label': 'FLAC', 'url': 'https://radio.example/flac',
             'codec': 'FLAC', 'nowplaying_url': 'https://radio.example/flac-now'},
        ],
        'unavailable_streams': [{'url': 'https://radio.example/retired', 'reason': 'Offline'}],
    }
    unrelated = {'slug': 'other', 'stationuuid': 'unrelated', 'name': 'Other',
                 'stream_url': 'https://other.example/stream', 'genres': []}
    return [parent, child, unrelated]


class MergeStationsTests(unittest.TestCase):
    def test_merge_file_reads_parent_and_childs(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'merge.json'
            path.write_text(json.dumps({'parent': ' parent ', 'childs': [' child ', 'second']}))
            self.assertEqual(merge.load_merge_file(path), ('parent', ['child', 'second']))

    def test_merge_file_rejects_invalid_shapes_and_json(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'merge.json'
            for value in ({'parent': 'parent', 'childs': []},
                          {'parent': 'parent', 'childs': 'child'},
                          {'parent': 'parent', 'children': ['child']},
                          {'parent': '', 'childs': ['child']},
                          {'parent': 'parent', 'childs': [None]}):
                path.write_text(json.dumps(value))
                with self.assertRaises(ValueError):
                    merge.load_merge_file(path)
            path.write_text('{not json')
            with self.assertRaisesRegex(ValueError, 'Invalid JSON'):
                merge.load_merge_file(path)

    def test_cli_accepts_json_preview_and_write_and_direct_uuid_mode(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'merge.json'
            path.write_text(json.dumps({'parent': 'parent', 'childs': ['child', 'second']}))
            with patch.object(merge, 'plan', return_value=({}, [], {'parent': {'stationuuid': 'parent'}})) as planned, \
                 patch.object(merge, 'apply_changes') as applied, contextlib.redirect_stdout(io.StringIO()):
                merge.main(['--country', 'gr', str(path)])
                planned.assert_called_with('gr', 'parent', ['child', 'second'])
                applied.assert_not_called()
                merge.main(['--country', 'gr', str(path), '--write'])
                applied.assert_called_once_with({}, [])
                merge.main(['--country', 'gr', '--parent', 'parent', 'child'])
                planned.assert_called_with('gr', 'parent', ['child'])

    def test_preserves_stream_metadata_aliases_field_order_and_unrelated_record(self):
        original = fixture()
        baseline = copy.deepcopy(original)
        result, report, children = merge.merge_records(original, 'parent', ['child'])
        self.assertEqual(original, baseline)
        self.assertEqual(result[1], baseline[2])
        self.assertEqual(len(result), 2)
        station = result[0]
        self.assertEqual(list(station)[:len(baseline[0])], list(baseline[0]))
        self.assertEqual(station['city'], 'Athens')
        self.assertEqual(station['genres'], ['pop', 'rock'])
        self.assertEqual(station['formats'], ['hits'])
        self.assertEqual(station['aliases'], ['older-main', 'duplicate', 'old-duplicate'])
        self.assertEqual(station['alternate_stationuuids'], ['older-uuid', 'child', 'old-child-uuid'])
        self.assertEqual([s['url'] for s in station['streams']], [
            'https://radio.example/aac', 'https://radio.example/other', 'https://radio.example/flac'])
        self.assertEqual(station['streams'][0]['nowplaying_url'], 'https://radio.example/aac-now')
        self.assertEqual(station['streams'][1]['nowplaying_url'], 'https://other.example/now')
        self.assertEqual(station['streams'][1]['history_url'], 'https://other.example/history')
        self.assertEqual(station['streams'][2]['nowplaying_url'], 'https://radio.example/flac-now')
        self.assertEqual(station['unavailable_streams'], baseline[1]['unavailable_streams'])
        self.assertEqual(report['added_stream_urls'], ['https://radio.example/other', 'https://radio.example/flac'])
        self.assertEqual(children, [baseline[1]])

    def test_same_stream_merges_missing_metadata_without_duplicate(self):
        records = fixture()
        records[1]['stream_url'] = records[0]['stream_url']
        del records[0]['nowplaying_url']
        result, report, _ = merge.merge_records(records, 'parent', ['child'])
        self.assertEqual(result[0]['nowplaying_url'], 'https://other.example/now')
        self.assertEqual(report['added_stream_urls'], ['https://radio.example/flac'])
        self.assertEqual(len(result[0]['streams']), 2)

    def test_conflicting_metadata_is_reported_and_parent_value_wins(self):
        records = fixture()
        records[1]['stream_url'] = records[0]['stream_url']
        result, report, _ = merge.merge_records(records, 'parent', ['child'])
        self.assertEqual(result[0]['nowplaying_url'], 'https://radio.example/now')
        self.assertTrue(any(item['field'] == 'stream:https://radio.example/default:nowplaying_url'
                            for item in report['conflicts']))

    def test_playlist_is_import_alias_not_playable_stream(self):
        records = fixture()
        records[1]['stream_url'] = 'https://radio.example/listen.pls?sid=1'
        records[1]['streams'] = []
        result, report, _ = merge.merge_records(records, 'parent', ['child'])
        self.assertEqual(result[0]['alternate_urls'], [records[1]['stream_url']])
        self.assertNotIn(records[1]['stream_url'], report['stream_urls'])
        self.assertEqual(report['playlist_aliases'], [records[1]['stream_url']])

    def test_redirects_retarget_chains_and_remove_slash_collisions(self):
        result, _, children = merge.merge_records(fixture(), 'parent', ['child'])
        redirects = {
            '/stations/duplicate': '/stations/main/',
            '/stations/old-duplicate/': '/stations/duplicate/',
            '/stations/very-old/': '/stations/old-duplicate/',
        }
        updated = merge.merge_redirects(redirects, result[0], children)
        self.assertNotIn('/stations/duplicate', updated)
        for slug in ('duplicate', 'old-duplicate', 'older-main', 'very-old'):
            self.assertEqual(updated[f'/stations/{slug}/'], '/stations/main/')

    def test_uuid_and_slug_collisions_fail_before_write(self):
        records = fixture()
        records[2]['aliases'] = ['duplicate']
        with self.assertRaisesRegex(ValueError, 'Slug duplicate'):
            merge.merge_records(records, 'parent', ['child'])
        records = fixture()
        records[2]['alternate_stationuuids'] = ['child']
        with self.assertRaisesRegex(ValueError, 'UUID child'):
            merge.merge_records(records, 'parent', ['child'])
        with self.assertRaisesRegex(ValueError, 'already merged'):
            merge.merge_records([records[0], records[2]], 'parent', ['older-uuid'])

    def test_duplicate_primary_uuids_fail_before_write(self):
        records = fixture()
        records[2]['stationuuid'] = 'child'
        with self.assertRaisesRegex(ValueError, 'duplicate primary UUIDs'):
            merge.merge_records(records, 'parent', ['child'])

    def test_multiple_children_keep_distinct_streams_and_direct_redirects(self):
        records = fixture()
        second = copy.deepcopy(records[1])
        second.update({'slug': 'second-duplicate', 'stationuuid': 'second-child',
                       'stream_url': 'https://radio.example/second', 'streams': [],
                       'aliases': ['second-old'], 'alternate_stationuuids': ['second-older']})
        records.append(second)
        result, report, children = merge.merge_records(records, 'parent', ['child', 'second-child'])
        self.assertEqual([station['stationuuid'] for station in result], ['parent', 'unrelated'])
        self.assertEqual(report['added_stream_urls'], [
            'https://radio.example/other', 'https://radio.example/flac',
            'https://radio.example/second'])
        self.assertEqual(result[0]['alternate_stationuuids'], [
            'older-uuid', 'child', 'old-child-uuid', 'second-child', 'second-older'])
        redirects = merge.merge_redirects({}, result[0], children)
        for slug in ('duplicate', 'old-duplicate', 'second-duplicate', 'second-old'):
            self.assertEqual(redirects[f'/stations/{slug}/'], '/stations/main/')
        self.assertEqual(report['merged_station'], result[0])

    def test_preview_plans_files_without_writing_then_apply(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'countries').mkdir()
            (root / 'src/data').mkdir(parents=True)
            (root / 'countries/xx.json').write_text(json.dumps({
                'countryCode': 'XX', 'stationsFile': 'src/data/stations-xx.json',
                'redirectsFile': 'countries/xx.redirects.json'}))
            station_path = root / 'src/data/stations-xx.json'
            redirect_path = root / 'countries/xx.redirects.json'
            station_path.write_text(merge.json_text(fixture()))
            redirect_path.write_text('{}\n')
            before = station_path.read_text()
            changes, images, report = merge.plan('xx', 'parent', ['child'], root)
            self.assertEqual(station_path.read_text(), before)
            self.assertEqual(images, [])
            self.assertEqual(report['parent']['slug'], 'main')
            self.assertEqual(report['merged_station']['city'], 'Athens')
            merge.apply_changes(changes, images)
            self.assertEqual(len(json.loads(station_path.read_text())), 2)
            self.assertEqual(json.loads(redirect_path.read_text())['/stations/duplicate/'], '/stations/main/')
            changes, images, report = merge.plan('xx', 'parent', ['child'], root)
            self.assertEqual(changes, {})
            self.assertEqual(images, [])
            self.assertEqual(report['already_merged'], ['child'])

    def test_guide_slug_references_follow_retained_station(self):
        with tempfile.TemporaryDirectory() as directory:
            guide = Path(directory) / 'station-guide.ts'
            guide.write_text('const stations = [{slug: "duplicate"}, {slug: "other"}];')
            original_dirs = merge.GUIDE_DIRS
            try:
                merge.GUIDE_DIRS = (Path(directory),)
                edits = merge.guide_replacements({'duplicate'}, 'main')
            finally:
                merge.GUIDE_DIRS = original_dirs
            self.assertEqual(guide.read_text(), 'const stations = [{slug: "duplicate"}, {slug: "other"}];')
            self.assertIn('slug: "main"', edits[guide.resolve()])
            self.assertIn('slug: "other"', edits[guide.resolve()])

    def test_image_audit_checks_other_countries_and_proposed_station_data(self):
        spec = importlib.util.spec_from_file_location('clean_images', ROOT / 'tools/clean-unused-images.py')
        cleanup = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cleanup)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'src/data').mkdir(parents=True)
            (root / 'public/station-icons/gr').mkdir(parents=True)
            gr = root / 'src/data/stations-gr.json'
            hr = root / 'src/data/stations-hr.json'
            shared = root / 'public/station-icons/gr/shared.png'
            orphan = root / 'public/station-icons/gr/orphan.png'
            gr.write_text(json.dumps([{'favicon': '/station-icons/gr/shared.png'},
                                      {'favicon': '/station-icons/gr/orphan.png'}]))
            hr.write_text(json.dumps([{'favicon': '/station-icons/gr/shared.png'}]))
            shared.write_bytes(b'image')
            orphan.write_bytes(b'image')
            old_root = cleanup.ROOT
            try:
                cleanup.ROOT = root
                unused = cleanup.audit({gr.resolve(): '[]'})
            finally:
                cleanup.ROOT = old_root
            self.assertEqual(unused, [orphan])


if __name__ == '__main__':
    unittest.main()
