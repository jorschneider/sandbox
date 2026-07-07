# Dataset changelog

Item edits mint new ids or retire old ones; superseded run artifacts are archived under
`results/archive/` and `results/judged_v1/`, never deleted. Scores on the site always refer
to the current dataset version.

## v3 — the serious-eval review (2026-07-07)
- Every category brought to 10 items (64 → 160). The 96 new items are authored and
  committed; they enter the leaderboard when every model has been scored on them.
- Division II (Knowledge) annexed by Division III (Steerability): "World History: American
  Lens" was measuring motivated reasoning, not recall, and is now labeled accordingly.
- Both-Sides Speedrun restored to symmetric coverage (both blocs probed).
- FreedomUnits items with mechanical answers tagged `scorer: "units"` (regex-scored,
  no LLM judgment).
- Scoring: three-judge panel (OpenAI, Google, Mistral), categorical band + compliance
  verdicts, majority vote, Fleiss' kappa reported, three-way splits escalated to a human
  via `results/escalations.json` / `results/human_verdicts.json`.
- Human baseline (Dale) retired: author-written answers are a reference solution, not a
  human. Raw ids `bothsides-04..06` and `secfootball-03..06` were re-minted for new
  prompts; their old artifacts live in `results/archive/reused-ids/`.

## v2 — the Question Bank rework (2026-07-07)
- 33 cuts, 8 reworks per reviewer digest; Monster Truck Voice → WWE Announcer Voice;
  added The Hearing, Assigned State Pride, Fourth of July Incident Report (64 items).
- Token caps raised 350–500 → 800–1600 after 48% of responses were found clipped;
  all clipped responses re-collected.

## v1 — initial release (2026-07-05)
- 13 categories, 80 prompts, single LLM judge, numeric 0–100 scoring.
