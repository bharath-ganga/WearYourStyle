"""Run size regressions without loading models: python -m unittest test_size_estimation."""
import ast
from pathlib import Path
from types import SimpleNamespace
import unittest

import numpy as np


source = ast.parse(Path(__file__).with_name("main.py").read_text(encoding="utf-8"))
functions = {"estimate_size", "estimate_size_from_pose", "_run_hq_pipeline"}
namespace = {"np": np}
exec(compile(ast.Module(body=[node for node in source.body if isinstance(node, ast.FunctionDef) and node.name in functions], type_ignores=[]), "main.py", "exec"), namespace)


class SizeEstimationTests(unittest.TestCase):
    def landmarks(self):
        points = [SimpleNamespace(x=0.5, y=0.5, visibility=1.0) for _ in range(33)]
        for i, x, y in ((11, 0.3, 0.2), (12, 0.7, 0.2), (23, 0.35, 0.8), (24, 0.65, 0.8)):
            points[i].x, points[i].y = x, y
        return points

    def test_camera_distance_does_not_change_size(self):
        estimate = namespace["estimate_size"]
        self.assertEqual(estimate(200, 300), "M")
        self.assertEqual(estimate(100, 150), estimate(200, 300))

    def test_invalid_measurements_are_unknown(self):
        estimate = namespace["estimate_size"]
        for values in ((0, 100, 175), (100, 0, 175), (100, 100, -1), (float("nan"), 100, 175), (100, float("inf"), 175)):
            self.assertEqual(estimate(*values), "Unknown")

    def test_visible_body_and_cropped_hips(self):
        estimate = namespace["estimate_size_from_pose"]
        points = self.landmarks()
        self.assertEqual(estimate(points, 500, 500), "M")
        points[23].visibility = 0.2
        self.assertEqual(estimate(points, 500, 500), "Unknown")
        points[23].visibility = 1.0
        points[23].y = 1.1
        self.assertEqual(estimate(points, 500, 500), "Unknown")

    def test_hq_does_not_guess_when_pose_is_missing_or_cropped(self):
        namespace["hrviton"] = SimpleNamespace(available=True, run=lambda frame, garment: frame)
        namespace["cv2"] = SimpleNamespace(COLOR_BGR2RGB=1, cvtColor=lambda frame, code: frame)
        namespace["mp"] = SimpleNamespace(Image=lambda **kwargs: None, ImageFormat=SimpleNamespace(SRGB=1))
        frame = np.zeros((500, 500, 3), dtype=np.uint8)
        garment = {"image": frame}
        points = self.landmarks()
        for landmarks, expected in (([], "Unknown"), ([points], "M")):
            namespace["detector"] = SimpleNamespace(detect=lambda image: SimpleNamespace(pose_landmarks=landmarks))
            self.assertEqual(namespace["_run_hq_pipeline"](frame, garment)[1], expected)
        points[24].y = 1.2
        self.assertEqual(namespace["_run_hq_pipeline"](frame, garment)[1], "Unknown")


if __name__ == "__main__":
    unittest.main()
