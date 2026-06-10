import contextlib
import io
import json
import os
import unittest

from xi_succession.cli import main

EXAMPLES = os.path.join(os.path.dirname(__file__), "..", "examples")
SCENARIOS = os.path.join(EXAMPLES, "baseline_scenarios.json")
ESTIMATES = os.path.join(EXAMPLES, "analyst_estimates.json")


def run_cli(*argv):
    stdout, stderr = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
        code = main(list(argv))
    return code, stdout.getvalue(), stderr.getvalue()


class CliTests(unittest.TestCase):
    def test_list_actors(self):
        code, out, _ = run_cli("list", "actors")
        self.assertEqual(code, 0)
        self.assertIn("xi_jinping", out)
        self.assertIn("purged", out)  # status surfaces in listing

    def test_list_drivers_shows_poles(self):
        code, out, _ = run_cli("list", "drivers")
        self.assertEqual(code, 0)
        self.assertIn("<->", out)

    def test_show_round_trips_json(self):
        code, out, _ = run_cli("show", "triggers", "death")
        self.assertEqual(code, 0)
        payload = json.loads(out)
        self.assertEqual(payload["id"], "death")

    def test_show_unknown_id_fails(self):
        code, _, err = run_cli("show", "triggers", "nope")
        self.assertEqual(code, 1)
        self.assertIn("unknown", err)

    def test_matrix_to_stdout(self):
        code, out, _ = run_cli("matrix", "--x", "health", "--y", "cohesion")
        self.assertEqual(code, 0)
        self.assertIn("Alternative futures", out)

    def test_matrix_same_driver_fails(self):
        code, _, err = run_cli("matrix", "--x", "health", "--y", "health")
        self.assertEqual(code, 1)
        self.assertIn("different drivers", err)

    def test_new_template(self):
        code, out, _ = run_cli("new", "--template", "managed")
        self.assertEqual(code, 0)
        payload = json.loads(out)
        self.assertEqual(payload["trigger"], "managed")
        self.assertTrue(payload["pathway"])

    def test_new_template_unknown_trigger_fails(self):
        code, _, err = run_cli("new", "--template", "nope")
        self.assertEqual(code, 1)
        self.assertIn("unknown", err)

    def test_iw_observed(self):
        code, out, _ = run_cli("iw", "--observed", "absence,censorship_spike")
        self.assertEqual(code, 0)
        first_data_line = [
            line for line in out.splitlines() if line.startswith(("incapacity",))
        ]
        self.assertTrue(first_data_line, out)

    def test_iw_unknown_indicator_fails(self):
        code, _, err = run_cli("iw", "--observed", "vibes")
        self.assertEqual(code, 1)
        self.assertIn("unknown", err)

    def test_check_example_flags_load_bearing_assumptions(self):
        code, out, _ = run_cli("check", SCENARIOS)
        self.assertEqual(code, 2)  # flags present by design in the example
        self.assertIn("Load-bearing", out)

    def test_check_missing_file_fails(self):
        code, _, err = run_cli("check", "no_such_file.json")
        self.assertEqual(code, 1)
        self.assertIn("no such file", err)

    def test_aggregate_methods(self):
        for method in ("mean", "median", "geomean_odds"):
            code, out, _ = run_cli(
                "aggregate", ESTIMATES, "--method", method
            )
            self.assertEqual(code, 0, method)
            self.assertIn("continuity_baseline", out)

    def test_report_to_file(self):
        out_path = os.path.join(EXAMPLES, "_tmp_report_test.md")
        try:
            code, out, _ = run_cli("report", SCENARIOS, "-o", out_path)
            self.assertEqual(code, 0)
            with open(out_path, encoding="utf-8") as fh:
                self.assertIn("## Summary", fh.read())
        finally:
            if os.path.exists(out_path):
                os.remove(out_path)


if __name__ == "__main__":
    unittest.main()
