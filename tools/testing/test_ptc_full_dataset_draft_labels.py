"""Offline PTC draft labeling tests; no raw factory media or real weights."""
from __future__ import annotations

import io
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from contextlib import redirect_stderr

from ptc_full_dataset_draft_labels import collect_images, model_mapping, proposals, process, review_set


class Scalar:
    def __init__(self, val): self.val = val
    def item(self): return self.val
    def tolist(self): return list(self.val)
    def __getitem__(self, _): return self

class Box:
    def __init__(self, cls, conf, xyxy):
        self.cls, self.conf, self.xyxy = Scalar(cls), Scalar(conf), Scalar(xyxy)

class FakeDetector:
    names = {0: 'bale', 1: 'person'}
    def __init__(self, weights): self.weights = weights
    def predict(self, **kwargs):
        # Three distinct bale instances on one conveyor + unrelated person.
        return [SimpleNamespace(names=self.names, boxes=[
            Box(0, 0.9, [0, 5, 20, 50]),
            Box(0, 0.8, [25, 15, 46, 63]),
            Box(0, 0.7, [51, 26, 80, 75]),
            Box(1, 0.8, [5, 6, 10, 25]),
        ])]


def fixtures(root: Path, bale: int = 3, inspection: int = 2):
    for role, n in (('bale', bale), ('inspection', inspection)):
        (root / role).mkdir(parents=True)
        for i in range(n):
            (root / role / f'cam{1 if role == "bale" else 4}_101_023_frame_{i:06d}.jpg').write_bytes(b'FAKEJPEG' + bytes([i]))


class TestFullCorpus(unittest.TestCase):
    def test_discover_role_counts(self):
        with tempfile.TemporaryDirectory() as t:
            root = Path(t) / 'images'; root.mkdir()
            fixtures(root)
            self.assertEqual(len(collect_images(root, {'bale': 3, 'inspection': 2})), 5)

    def test_count_mismatch_fails_closed(self):
        with tempfile.TemporaryDirectory() as t:
            root = Path(t) / 'images'; root.mkdir(); fixtures(root)
            with self.assertRaisesRegex(ValueError, 'count mismatch'):
                collect_images(root, {'bale': 4649, 'inspection': 1902})

    def test_zero_bytes_rejected(self):
        with tempfile.TemporaryDirectory() as t:
            root = Path(t) / 'images'; root.mkdir(); fixtures(root)
            (root / 'bale' / 'cam1_zero.jpg').write_bytes(b'')
            with self.assertRaisesRegex(ValueError, 'Zero-size'):
                collect_images(root, {'bale': 4, 'inspection': 2})

    def test_generic_person_not_inspector(self):
        with self.assertRaisesRegex(ValueError, 'Generic person'):
            model_mapping({'person': 'inspector'}, {'person'})

    def test_generic_bale_not_opened(self):
        with self.assertRaisesRegex(ValueError, 'Generic bale'):
            model_mapping({'bale': 'bale_opened'}, {'bale'})

    def test_exact_model_class_required(self):
        with self.assertRaisesRegex(ValueError, 'exact trained'):
            model_mapping({'opened_bale': 'bale_opened'}, {'opened_bale'})

    def test_generic_bale_candidate_accepted(self):
        self.assertEqual(model_mapping({'bale': 'bale_candidate'}, {'bale'}), {'bale': 'bale_candidate'})

    def test_three_bales_are_three_instances_not_one_conveyor_roi(self):
        prediction = FakeDetector('weights').predict()[0]
        b = proposals(prediction, {'bale': 'bale_candidate'}, 100, 100, .2)
        self.assertEqual(len(b), 3)
        self.assertEqual([x['xyxy_pixels'][0] for x in b], [0, 25, 51])
        self.assertTrue(all(x['human_approved'] is False for x in b))

    def test_clipping_and_invalid_candidates(self):
        pred = SimpleNamespace(names={0:'bale'}, boxes=[Box(0, .8, [-2, 1, 300, 400]),
              Box(0, .1, [0,0,20,20]), Box(0, .5, [30,30,2,2])])
        b = proposals(pred, {'bale':'bale_candidate'}, 100, 100, .2)
        self.assertEqual(len(b), 1)
        self.assertEqual(b[0]['xyxy_pixels'], [0.0, 1.0, 100.0, 100.0])

    def test_double_review_at_least_twenty_percent(self):
        with tempfile.TemporaryDirectory() as t:
            root = Path(t)/'images'; root.mkdir(); fixtures(root, 17, 10)
            items = collect_images(root, {'bale':17, 'inspection':10})
            choices = review_set(items, root, .2, 'seed')
            self.assertGreaterEqual(len(choices), 6)
            self.assertEqual(choices, review_set(items, root, .2, 'seed'))

    def test_refuse_less_than_twenty_percent(self):
        with self.assertRaisesRegex(ValueError, '20%'):
            review_set([], Path('/'), .19, 'seed')

    def test_run_with_mock_all_images_only_drafts(self):
        with tempfile.TemporaryDirectory() as t:
            base = Path(t)
            root = base/'images'; root.mkdir(); fixtures(root)
            (base/'model.pt').write_bytes(b'MOCK')
            (base/'mapping.json').write_text('{"bale":"bale_candidate"}')
            args = SimpleNamespace(images=root, model=base/'model.pt', mapping=base/'mapping.json',
                output=base/'private-output', expected_bale=3, expected_inspection=2, device='cpu',
                imgsz=160, min_conf=.15, independent_rate=.2, seed='abc')
            folder, report = process(args, model_factory=FakeDetector, image_size_fn=lambda _: (100,100))
            self.assertEqual(report['images_total'], 5)
            self.assertEqual(report['separate_box_proposals'], 15)
            self.assertEqual(report['images_requiring_independent_review'], 5)
            self.assertEqual(report['certified_training_labels'], 0)
            self.assertFalse((folder/'INCOMPLETE-DO-NOT-TRAIN').exists())
            self.assertEqual(len((folder/'candidate-bales-RESTRICTED.jsonl').read_text().splitlines()), 5)
            sanitized = (folder/'aggregate-SANITIZED.json').read_text()
            self.assertNotIn('cam1_', sanitized)
            self.assertNotIn('cam4_', sanitized)
            self.assertNotIn('FAKEJPEG', sanitized)
            self.assertIn('DRAFT ONLY', sanitized)

    def test_model_missing_fails_before_output(self):
        with tempfile.TemporaryDirectory() as t:
            base=Path(t);root=base/'images';root.mkdir();fixtures(root)
            (base/'mapping.json').write_text('{"bale":"bale_candidate"}')
            args=SimpleNamespace(images=root,model=base/'no-weights.pt',mapping=base/'mapping.json',
                output=base/'output',expected_bale=3,expected_inspection=2,device='cpu',
                imgsz=160,min_conf=.2,independent_rate=.2,seed='seed')
            with self.assertRaisesRegex(ValueError, 'unavailable'):
                process(args,model_factory=FakeDetector,image_size_fn=lambda _:(100,100))
            self.assertFalse((base/'output').exists())

    def test_failure_keeps_INCOMPLETE_marker(self):
        with tempfile.TemporaryDirectory() as t:
            base=Path(t);root=base/'images';root.mkdir();fixtures(root)
            (base/'weights.pt').write_bytes(b'MOCK')
            (base/'mapping.json').write_text('{"bale":"bale_candidate"}')
            args=SimpleNamespace(images=root,model=base/'weights.pt',mapping=base/'mapping.json',
                output=base/'out',expected_bale=3,expected_inspection=2,device='cpu',
                imgsz=160,min_conf=.15,independent_rate=.2,seed='abc')
            def fail(_):raise RuntimeError('Could not decode image')
            with self.assertRaisesRegex(RuntimeError, 'decode'):
                process(args,model_factory=FakeDetector,image_size_fn=fail)
            runs=list((base/'out').iterdir())
            self.assertEqual(len(runs),1)
            self.assertTrue((runs[0]/'INCOMPLETE-DO-NOT-TRAIN').exists())


if __name__=='__main__': unittest.main()