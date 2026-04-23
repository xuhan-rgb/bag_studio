#!/usr/bin/env python3
import tempfile
import time
import unittest
from pathlib import Path

from scripts.dataset_utils import (
    atomic_write_json,
    compute_dataset_id,
    compute_bag_fingerprint,
    merge_dataset_index,
    read_json_file,
    sanitize_dataset_id,
)


class SanitizeDatasetIdTests(unittest.TestCase):
    def test_replaces_unsafe_chars(self) -> None:
        self.assertEqual(sanitize_dataset_id('bag 01/alpha?'), 'bag_01_alpha')

    def test_fallback_for_empty_result(self) -> None:
        self.assertEqual(sanitize_dataset_id('...'), 'bag_studio_dataset')


class ComputeDatasetIdTests(unittest.TestCase):
    def test_adds_path_hash_for_same_name_isolation(self) -> None:
        first = compute_dataset_id(Path('/tmp/demo/run_01'))
        second = compute_dataset_id(Path('/var/tmp/demo/run_01'))
        self.assertNotEqual(first, second)
        self.assertTrue(first.startswith('run_01_'))


class AtomicJsonTests(unittest.TestCase):
    def test_round_trip(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            target = Path(tmp_dir) / 'state.json'
            payload = {'status': 'done', 'pct': 100}
            atomic_write_json(target, payload, ensure_ascii=False, indent=2)
            self.assertEqual(read_json_file(target), payload)


class BagFingerprintTests(unittest.TestCase):
    def test_uses_all_bag_fragments(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            bag_dir = Path(tmp_dir)
            (bag_dir / 'metadata.yaml').write_text('name: demo\n', encoding='utf-8')
            (bag_dir / 'demo_0.db3').write_bytes(b'part-0')
            (bag_dir / 'demo_1.db3').write_bytes(b'part-1')

            first = compute_bag_fingerprint(bag_dir)
            time.sleep(0.01)
            (bag_dir / 'demo_1.db3').write_bytes(b'part-1-updated')
            second = compute_bag_fingerprint(bag_dir)

            self.assertNotEqual(first, second)


class MergeDatasetIndexTests(unittest.TestCase):
    def test_keeps_same_name_different_paths(self) -> None:
        older = merge_dataset_index(
            None,
            dataset_id='demo_old',
            manifest={
                'generated_at': '2026-04-20T10:00:00+08:00',
                'bag': {'name': 'demo', 'path': '/bags/A/demo', 'duration_sec': 1, 'total_messages': 10},
                'topics': {'/foo': {}},
            },
        )
        merged = merge_dataset_index(
            older,
            dataset_id='demo_new',
            manifest={
                'generated_at': '2026-04-20T11:00:00+08:00',
                'bag': {'name': 'demo', 'path': '/bags/B/demo', 'duration_sec': 2, 'total_messages': 20},
                'topics': {'/bar': {}, '/baz': {}},
            },
        )

        self.assertEqual([item['id'] for item in merged['datasets']], ['demo_new', 'demo_old'])

    def test_replaces_same_path_latest_export(self) -> None:
        older = merge_dataset_index(
            None,
            dataset_id='demo_old',
            manifest={
                'generated_at': '2026-04-20T10:00:00+08:00',
                'bag': {'name': 'demo', 'path': '/bags/A/demo', 'duration_sec': 1, 'total_messages': 10},
                'topics': {'/foo': {}},
            },
        )
        merged = merge_dataset_index(
            older,
            dataset_id='demo_new',
            manifest={
                'generated_at': '2026-04-20T11:00:00+08:00',
                'bag': {'name': 'demo', 'path': '/bags/A/demo', 'duration_sec': 2, 'total_messages': 20},
                'topics': {'/bar': {}},
            },
        )

        self.assertEqual([item['id'] for item in merged['datasets']], ['demo_new'])
        self.assertEqual(merged['datasets'][0]['source_bag_path'], '/bags/A/demo')


if __name__ == '__main__':
    unittest.main()
