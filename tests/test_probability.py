import unittest

from xi_succession import probability
from xi_succession.models import Scenario, ScenarioSet


def scenario(sid, trigger, prob, indicators=None, assumptions=None):
    return Scenario(
        id=sid,
        name=sid,
        trigger=trigger,
        summary="x",
        probability=prob,
        indicators=indicators or ["absence"],
        assumptions=assumptions or [],
    )


def coherent_set():
    return ScenarioSet(
        title="T",
        horizon="h",
        scenarios=[
            scenario("a", "continuity", 0.6),
            scenario("b", "death", 0.4),
        ],
    )


class CoherenceTests(unittest.TestCase):
    def test_coherent_set_has_no_findings(self):
        self.assertEqual(probability.coherence_findings(coherent_set()), [])

    def test_sum_violation_flagged(self):
        sset = coherent_set()
        sset.scenarios[0].probability = 0.9  # total 1.3
        findings = probability.coherence_findings(sset)
        self.assertTrue(any("sum to 1.300" in f for f in findings))

    def test_missing_probability_flagged(self):
        sset = coherent_set()
        sset.scenarios[1].probability = None
        findings = probability.coherence_findings(sset)
        self.assertTrue(any("No probability assigned" in f for f in findings))

    def test_missing_continuity_flagged(self):
        sset = ScenarioSet(
            title="T",
            horizon="h",
            scenarios=[scenario("a", "death", 1.0)],
        )
        findings = probability.coherence_findings(sset)
        self.assertTrue(any("continuity" in f for f in findings))

    def test_partial_set_not_held_to_sum_or_continuity(self):
        sset = ScenarioSet(
            title="T",
            horizon="h",
            exhaustive=False,
            scenarios=[scenario("a", "death", 0.1)],
        )
        self.assertEqual(probability.coherence_findings(sset), [])

    def test_material_scenario_without_indicators_flagged(self):
        sset = coherent_set()
        sset.scenarios[0].indicators = []
        findings = probability.coherence_findings(sset)
        self.assertTrue(any("no indicators" in f for f in findings))

    def test_load_bearing_assumption_flagged(self):
        sset = coherent_set()
        sset.scenarios[0].assumptions = [
            {"text": "fragile", "confidence": "low", "impact_if_wrong": "high"}
        ]
        sset = ScenarioSet.from_dict(sset.to_dict())
        findings = probability.coherence_findings(sset)
        self.assertTrue(any("Load-bearing" in f for f in findings))

    def test_duplicate_trigger_noted(self):
        sset = ScenarioSet(
            title="T",
            horizon="h",
            scenarios=[
                scenario("a", "continuity", 0.5),
                scenario("b", "death", 0.25),
                scenario("c", "death", 0.25),
            ],
        )
        findings = probability.coherence_findings(sset)
        self.assertTrue(any("share trigger" in f for f in findings))


class NormalizeTests(unittest.TestCase):
    def test_normalized(self):
        sset = coherent_set()
        sset.scenarios[0].probability = 0.9
        result = probability.normalized(sset)
        self.assertAlmostEqual(sum(result.values()), 1.0)
        self.assertAlmostEqual(result["a"], 0.9 / 1.3)

    def test_no_probs_raises(self):
        sset = coherent_set()
        for s in sset.scenarios:
            s.probability = None
        with self.assertRaises(ValueError):
            probability.normalized(sset)


class AggregateTests(unittest.TestCase):
    estimates = {
        "a": {"x": 0.6, "y": 0.4},
        "b": {"x": 0.4, "y": 0.6},
    }

    def test_mean_renormalized(self):
        result = probability.aggregate(self.estimates, method="mean")
        self.assertAlmostEqual(result["a"], 0.5)
        self.assertAlmostEqual(result["b"], 0.5)
        self.assertAlmostEqual(sum(result.values()), 1.0)

    def test_median(self):
        est = {"a": {"x": 0.1, "y": 0.2, "z": 0.9}}
        result = probability.aggregate(est, method="median", renormalize=False)
        self.assertAlmostEqual(result["a"], 0.2)

    def test_geomean_odds_between_min_and_max(self):
        est = {"a": {"x": 0.2, "y": 0.8}}
        result = probability.aggregate(est, method="geomean_odds", renormalize=False)
        self.assertGreater(result["a"], 0.2)
        self.assertLess(result["a"], 0.8)

    def test_geomean_odds_survives_extreme_inputs(self):
        est = {"a": {"x": 0.0, "y": 1.0}}
        result = probability.aggregate(est, method="geomean_odds", renormalize=False)
        self.assertTrue(0.0 < result["a"] < 1.0)

    def test_unknown_method_rejected(self):
        with self.assertRaises(ValueError):
            probability.aggregate(self.estimates, method="vibes")

    def test_out_of_range_estimate_rejected(self):
        with self.assertRaises(ValueError):
            probability.aggregate({"a": {"x": 1.2}})

    def test_empty_estimates_for_scenario_rejected(self):
        with self.assertRaises(ValueError):
            probability.aggregate({"a": {}})

    def test_disagreement(self):
        spread = probability.disagreement(
            {"a": {"x": 0.1, "y": 0.5}, "b": {"x": 0.3}}
        )
        self.assertAlmostEqual(spread["a"], 0.4)
        self.assertEqual(spread["b"], 0.0)


if __name__ == "__main__":
    unittest.main()
