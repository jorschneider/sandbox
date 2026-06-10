import os
import unittest

from xi_succession import probability, report
from xi_succession.models import ScenarioSet

EXAMPLE = os.path.join(
    os.path.dirname(__file__), "..", "examples", "baseline_scenarios.json"
)


class ExampleFileTests(unittest.TestCase):
    def setUp(self):
        self.sset = ScenarioSet.load(EXAMPLE)

    def test_example_loads_and_covers_all_triggers(self):
        triggers = {s.trigger for s in self.sset.scenarios}
        self.assertEqual(
            triggers,
            {"continuity", "managed", "incapacity", "death", "ouster", "crisis"},
        )

    def test_example_probabilities_sum_to_one(self):
        total = sum(s.probability for s in self.sset.scenarios)
        self.assertAlmostEqual(total, 1.0)

    def test_example_findings_are_only_load_bearing_flags(self):
        # The example is numerically coherent; the only flags should be the
        # deliberately included load-bearing assumptions (a feature demo).
        findings = probability.coherence_findings(self.sset)
        self.assertEqual(len(findings), 3)
        for f in findings:
            self.assertIn("Load-bearing", f)


class RenderTests(unittest.TestCase):
    def test_render_contains_core_sections(self):
        sset = ScenarioSet.load(EXAMPLE)
        md = report.render(sset)
        self.assertIn("# Xi succession baseline scenario set", md)
        self.assertIn("## Summary", md)
        self.assertIn("## Consolidated indicator watchlist", md)
        for s in sset.scenarios:
            self.assertIn(s.name, md)
        self.assertIn("45%", md)  # continuity probability formatted
        self.assertIn("Coherence & assumptions flags", md)

    def test_render_handles_minimal_set(self):
        sset = ScenarioSet(
            title="Minimal",
            horizon="h",
            exhaustive=False,
            scenarios=[
                {
                    "id": "only",
                    "name": "Only scenario",
                    "trigger": "continuity",
                    "summary": "s",
                }
            ],
        )
        md = report.render(sset)
        self.assertIn("Only scenario", md)
        self.assertIn("unassigned", md)


if __name__ == "__main__":
    unittest.main()
