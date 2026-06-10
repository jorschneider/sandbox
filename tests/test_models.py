import unittest

from xi_succession.models import Assumption, Scenario, ScenarioSet


def make_scenario(**overrides):
    base = dict(
        id="s1",
        name="Test scenario",
        trigger="continuity",
        summary="A summary.",
        probability=0.5,
    )
    base.update(overrides)
    return Scenario(**base)


class AssumptionTests(unittest.TestCase):
    def test_load_bearing(self):
        self.assertTrue(
            Assumption("x", confidence="low", impact_if_wrong="high").load_bearing
        )
        self.assertFalse(
            Assumption("x", confidence="high", impact_if_wrong="high").load_bearing
        )

    def test_invalid_levels_rejected(self):
        with self.assertRaises(ValueError):
            Assumption("x", confidence="certain")
        with self.assertRaises(ValueError):
            Assumption("x", impact_if_wrong="huge")


class ScenarioTests(unittest.TestCase):
    def test_unknown_trigger_rejected(self):
        with self.assertRaises(KeyError):
            make_scenario(trigger="alien_invasion")

    def test_unknown_actor_rejected(self):
        with self.assertRaises(KeyError):
            make_scenario(key_actors=["elvis"])

    def test_unknown_indicator_rejected(self):
        with self.assertRaises(KeyError):
            make_scenario(indicators=["vibes"])

    def test_probability_bounds(self):
        with self.assertRaises(ValueError):
            make_scenario(probability=1.5)
        make_scenario(probability=None)  # allowed

    def test_assumption_dicts_coerced(self):
        s = make_scenario(
            assumptions=[{"text": "t", "confidence": "low", "impact_if_wrong": "high"}]
        )
        self.assertIsInstance(s.assumptions[0], Assumption)
        self.assertEqual(len(s.load_bearing_assumptions), 1)


class ScenarioSetTests(unittest.TestCase):
    def test_round_trip(self):
        original = ScenarioSet(
            title="T",
            horizon="through 2030",
            scenarios=[make_scenario(), make_scenario(id="s2", trigger="death")],
        )
        restored = ScenarioSet.from_json(original.to_json())
        self.assertEqual(restored.title, "T")
        self.assertEqual([s.id for s in restored.scenarios], ["s1", "s2"])
        self.assertEqual(restored.to_dict(), original.to_dict())

    def test_duplicate_scenario_ids_rejected(self):
        with self.assertRaises(ValueError):
            ScenarioSet(
                title="T",
                horizon="h",
                scenarios=[make_scenario(), make_scenario()],
            )

    def test_dict_scenarios_coerced(self):
        sset = ScenarioSet(
            title="T",
            horizon="h",
            scenarios=[
                {
                    "id": "s1",
                    "name": "n",
                    "trigger": "managed",
                    "summary": "x",
                }
            ],
        )
        self.assertIsInstance(sset.scenarios[0], Scenario)


if __name__ == "__main__":
    unittest.main()
