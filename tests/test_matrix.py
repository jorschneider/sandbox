import unittest

from xi_succession import matrix


class BuildTests(unittest.TestCase):
    def test_builds_four_quadrants(self):
        m = matrix.build("health", "cohesion")
        self.assertEqual(len(m.quadrants), 4)
        self.assertEqual(m.x_driver["id"], "health")
        self.assertEqual(
            [q.label for q in m.quadrants], ["Q1", "Q2", "Q3", "Q4"]
        )
        # Q4 is pole_b x pole_b
        self.assertEqual(m.quadrants[3].x_state, m.x_driver["pole_b"])
        self.assertEqual(m.quadrants[3].y_state, m.y_driver["pole_b"])

    def test_same_driver_rejected(self):
        with self.assertRaises(ValueError):
            matrix.build("health", "health")

    def test_unknown_driver_rejected(self):
        with self.assertRaises(KeyError):
            matrix.build("health", "astrology")


class RenderTests(unittest.TestCase):
    def test_markdown_contains_poles_and_quadrants(self):
        m = matrix.build("health", "pla")
        md = matrix.render_markdown(m)
        for q in m.quadrants:
            self.assertIn(q.heading, md)
        self.assertIn(m.x_driver["pole_a"], md)
        self.assertIn(m.y_driver["pole_b"], md)
        self.assertIn("- [ ]", md)  # worksheet checkboxes


if __name__ == "__main__":
    unittest.main()
