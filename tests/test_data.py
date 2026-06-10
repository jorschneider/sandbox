import unittest

from xi_succession import data


class DataIntegrityTests(unittest.TestCase):
    def test_unique_ids_per_collection(self):
        for kind, items in data.COLLECTIONS.items():
            ids = [item["id"] for item in items]
            self.assertEqual(len(ids), len(set(ids)), f"duplicate ids in {kind}")

    def test_indicator_signals_reference_valid_triggers(self):
        trigger_ids = {t["id"] for t in data.TRIGGERS}
        for ind in data.INDICATORS:
            self.assertTrue(ind["signals"], f"{ind['id']} signals nothing")
            for trig in ind["signals"]:
                self.assertIn(trig, trigger_ids, f"{ind['id']} -> {trig}")

    def test_indicator_weights_in_range(self):
        for ind in data.INDICATORS:
            self.assertIn(ind["weight"], (1, 2, 3), ind["id"])

    def test_drivers_have_distinct_poles(self):
        for d in data.DRIVERS:
            self.assertNotEqual(d["pole_a"], d["pole_b"], d["id"])

    def test_continuity_trigger_exists(self):
        self.assertIn("continuity", {t["id"] for t in data.TRIGGERS})

    def test_every_trigger_has_key_questions(self):
        for t in data.TRIGGERS:
            self.assertTrue(t["key_questions"], t["id"])

    def test_every_trigger_signaled_by_some_indicator(self):
        signaled = {trig for ind in data.INDICATORS for trig in ind["signals"]}
        for t in data.TRIGGERS:
            self.assertIn(t["id"], signaled, f"no indicator signals {t['id']}")

    def test_get_returns_entry(self):
        self.assertEqual(data.get("actors", "xi_jinping")["name"], "Xi Jinping")

    def test_get_unknown_id_raises_with_options(self):
        with self.assertRaises(KeyError) as ctx:
            data.get("triggers", "nope")
        self.assertIn("continuity", str(ctx.exception))

    def test_get_unknown_collection_raises(self):
        with self.assertRaises(KeyError):
            data.get("nonsense", "xi_jinping")


if __name__ == "__main__":
    unittest.main()
