import unittest

from xi_succession import data, indicators


class ScoreTests(unittest.TestCase):
    def test_empty_observation_scores_zero(self):
        results = indicators.score([])
        self.assertEqual({r.score for r in results}, {0})
        self.assertEqual(len(results), len(data.TRIGGERS))

    def test_unknown_indicator_raises(self):
        with self.assertRaises(KeyError):
            indicators.score(["not_a_real_indicator"])

    def test_health_pattern_ranks_incapacity_first(self):
        # absence (w3), protocol_delegation (w2), travel_stop (w1),
        # censorship_spike (w2) all signal incapacity -> 8 points.
        results = indicators.score(
            ["absence", "protocol_delegation", "travel_stop", "censorship_spike"]
        )
        self.assertEqual(results[0].trigger_id, "incapacity")
        self.assertEqual(results[0].score, 8)
        self.assertIn("absence", results[0].matched)

    def test_heir_pattern_ranks_managed_first(self):
        results = indicators.score(["heir_elevation", "succession_discourse"])
        self.assertEqual(results[0].trigger_id, "managed")
        self.assertEqual(results[0].score, 5)

    def test_scores_bounded_by_max(self):
        all_ids = [ind["id"] for ind in data.INDICATORS]
        results = indicators.score(all_ids)
        for r in results:
            self.assertEqual(r.score, r.max_score)
            self.assertAlmostEqual(r.fraction, 1.0)

    def test_max_scores_cover_all_triggers(self):
        maxima = indicators.max_scores()
        self.assertEqual(set(maxima), {t["id"] for t in data.TRIGGERS})
        self.assertTrue(all(v > 0 for v in maxima.values()))


class WatchlistTests(unittest.TestCase):
    def test_sorted_by_weight_descending(self):
        entries = indicators.watchlist_for(
            ["travel_stop", "absence", "protocol_delegation"]
        )
        self.assertEqual(
            [e["id"] for e in entries],
            ["absence", "protocol_delegation", "travel_stop"],
        )

    def test_unknown_id_raises(self):
        with self.assertRaises(KeyError):
            indicators.watchlist_for(["nope"])


if __name__ == "__main__":
    unittest.main()
