#!/usr/bin/env python3
import sys
import types
import unittest
from types import SimpleNamespace

for _name in ("rclpy", "rclpy.serialization", "rosidl_runtime_py", "rosidl_runtime_py.utilities"):
    sys.modules.setdefault(_name, types.ModuleType(_name))
sys.modules["rclpy.serialization"].deserialize_message = lambda *a, **k: None
sys.modules["rosidl_runtime_py.utilities"].get_message = lambda *a, **k: None

from scripts.export_bag_studio_dataset import extract_detection2d_array


def _bbox_new(cx, cy, sx, sy, theta=0.0):
    """vision_msgs 新 schema: center = Pose2D{position, theta}"""
    return SimpleNamespace(
        center=SimpleNamespace(position=SimpleNamespace(x=cx, y=cy), theta=theta),
        size_x=sx,
        size_y=sy,
    )


def _bbox_old(cx, cy, sx, sy, theta=0.0):
    """老 schema: center = geometry_msgs/Pose2D{x, y, theta}"""
    return SimpleNamespace(
        center=SimpleNamespace(x=cx, y=cy, theta=theta),
        size_x=sx,
        size_y=sy,
    )


def _result_new(class_id, score):
    """新 schema: ObjectHypothesisWithPose{hypothesis, pose}"""
    return SimpleNamespace(hypothesis=SimpleNamespace(class_id=class_id, score=score))


def _result_old(class_id, score):
    """老 schema"""
    return SimpleNamespace(id=class_id, score=score)


def _detection(bbox, results, frame_id=""):
    return SimpleNamespace(
        header=SimpleNamespace(frame_id=frame_id),
        bbox=bbox,
        results=results,
    )


def _msg(array_frame_id, detections):
    return SimpleNamespace(
        header=SimpleNamespace(frame_id=array_frame_id),
        detections=detections,
    )


class ExtractDetection2DArrayTests(unittest.TestCase):
    def test_new_schema_single_frame_id(self):
        msg = _msg("", [
            _detection(_bbox_new(100, 200, 50, 80), [_result_new("person", 0.87)], frame_id="front"),
        ])
        samples = extract_detection2d_array(msg)
        self.assertEqual(len(samples), 1)
        self.assertEqual(samples[0]["frame_id"], "front")
        box = samples[0]["boxes"][0]
        self.assertEqual(box["cx"], 100.0)
        self.assertEqual(box["cy"], 200.0)
        self.assertEqual(box["id"], "person")
        self.assertEqual(box["score"], 0.87)

    def test_old_schema_backwards_compat(self):
        msg = _msg("front", [
            _detection(_bbox_old(10, 20, 5, 5), [_result_old("car", 0.5)]),
        ])
        samples = extract_detection2d_array(msg)
        self.assertEqual(len(samples), 1)
        self.assertEqual(samples[0]["frame_id"], "front")  # falls back to array-level
        box = samples[0]["boxes"][0]
        self.assertEqual(box["cx"], 10.0)
        self.assertEqual(box["id"], "car")
        self.assertEqual(box["score"], 0.5)

    def test_multi_frame_id_in_one_message(self):
        msg = _msg("", [
            _detection(_bbox_new(100, 100, 10, 10), [_result_new("a", 0.9)], frame_id="front"),
            _detection(_bbox_new(200, 200, 20, 20), [_result_new("b", 0.8)], frame_id="rear"),
            _detection(_bbox_new(300, 300, 30, 30), [_result_new("c", 0.7)], frame_id="front"),
        ])
        samples = extract_detection2d_array(msg)
        self.assertEqual(len(samples), 2)
        by_fid = {s["frame_id"]: s for s in samples}
        self.assertEqual(len(by_fid["front"]["boxes"]), 2)
        self.assertEqual(len(by_fid["rear"]["boxes"]), 1)
        self.assertEqual(by_fid["rear"]["boxes"][0]["id"], "b")

    def test_detection_frame_id_overrides_array(self):
        msg = _msg("array_fid", [
            _detection(_bbox_new(1, 1, 1, 1), [_result_new("x", 0.1)], frame_id="det_fid"),
        ])
        samples = extract_detection2d_array(msg)
        self.assertEqual(samples[0]["frame_id"], "det_fid")

    def test_empty_detection_frame_id_falls_back_to_array(self):
        msg = _msg("array_fid", [
            _detection(_bbox_new(1, 1, 1, 1), [_result_new("x", 0.1)], frame_id=""),
        ])
        samples = extract_detection2d_array(msg)
        self.assertEqual(samples[0]["frame_id"], "array_fid")

    def test_empty_results(self):
        msg = _msg("", [_detection(_bbox_new(1, 2, 3, 4), [], frame_id="front")])
        samples = extract_detection2d_array(msg)
        box = samples[0]["boxes"][0]
        self.assertEqual(box["id"], "")
        self.assertIsNone(box["score"])

    def test_no_detections_still_returns_placeholder(self):
        msg = _msg("front", [])
        samples = extract_detection2d_array(msg)
        self.assertEqual(len(samples), 1)
        self.assertEqual(samples[0]["frame_id"], "front")
        self.assertEqual(samples[0]["boxes"], [])

    def test_nonzero_theta(self):
        msg = _msg("", [_detection(_bbox_new(10, 20, 5, 5, theta=0.5), [], frame_id="front")])
        self.assertAlmostEqual(extract_detection2d_array(msg)[0]["boxes"][0]["theta"], 0.5)

    def test_only_first_result_used(self):
        msg = _msg("", [_detection(_bbox_new(1, 1, 10, 10), [
            _result_new("first", 0.9),
            _result_new("second", 0.1),
        ], frame_id="front")])
        box = extract_detection2d_array(msg)[0]["boxes"][0]
        self.assertEqual(box["id"], "first")
        self.assertEqual(box["score"], 0.9)


if __name__ == "__main__":
    unittest.main()
