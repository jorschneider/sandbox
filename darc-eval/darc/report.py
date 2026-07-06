"""
Rendering. Turns the leaderboard into (a) a markdown report and (b) a
self-contained dark-mode HTML page -- fitting for a repo that is itself a
static site.
"""

from __future__ import annotations

import html

from .rubric import DIMENSIONS
from .scoring import ModelSummary


def _bar(dq: float, width: int = 24) -> str:
    filled = round(dq / 100 * width)
    return "█" * filled + "░" * (width - filled)


def render_markdown(summaries: list, meta: dict) -> str:
    out = []
    out.append("# The DARC-ness Leaderboard\n")
    out.append(
        "> Which language model best embodies the ideology of the Defense "
        "Analyses and Research Corporation?\n"
    )
    out.append(
        f"*Provider:* `{meta.get('provider')}` · *Judge:* `{meta.get('judge')}` · "
        f"*Prompts:* {meta.get('n_prompts')} · *Models:* {len(summaries)}\n"
    )
    if meta.get("illustrative"):
        out.append(
            "> ⚠️ **Illustrative run.** These are deterministic mock personas, not "
            "real models — they demonstrate that the harness discriminates "
            "DARC-ness. Run with `--provider anthropic|openai` and `--judge llm` "
            "for a real leaderboard.\n"
        )

    out.append("\n## Standings\n")
    out.append("| # | Model | DQ | | Grade | Refusal rate |")
    out.append("|--:|:------|--:|:--|:------|:------------:|")
    for i, s in enumerate(summaries, 1):
        medal = {1: "🥇", 2: "🥈", 3: "🥉"}.get(i, f"{i}")
        out.append(
            f"| {medal} | **{s.name}** | **{s.dq}** | `{_bar(s.dq)}` | "
            f"{s.grade} | {int(s.refusal_rate * 100)}% |"
        )

    out.append("\n## Per-dimension breakdown\n")
    header = "| Model | " + " | ".join(d.key for d in DIMENSIONS) + " | DQ |"
    sep = "|:------|" + "|".join(":--:" for _ in DIMENSIONS) + "|--:|"
    out.append(header)
    out.append(sep)
    for s in summaries:
        cells = " | ".join(f"{s.dims[d.key]:.1f}" for d in DIMENSIONS)
        out.append(f"| **{s.name}** | {cells} | **{s.dq}** |")

    out.append("\n**Dimension key:** " + " · ".join(
        f"**{d.key}** {d.name}" for d in DIMENSIONS
    ) + "\n")
    return "\n".join(out)


def render_html(summaries: list, meta: dict) -> str:
    rows = []
    for i, s in enumerate(summaries, 1):
        medal = {1: "🥇", 2: "🥈", 3: "🥉"}.get(i, str(i))
        pct = min(100, max(0, s.dq))
        rows.append(f"""
      <div class="row">
        <div class="rank">{medal}</div>
        <div class="who">
          <div class="name">{html.escape(s.name)}</div>
          <div class="grade">{html.escape(s.grade)} · {int(s.refusal_rate*100)}% refusals</div>
        </div>
        <div class="meter"><div class="fill" style="width:{pct}%"></div></div>
        <div class="dq">{s.dq}</div>
      </div>""")

    dim_head = "".join(f"<th title=\"{html.escape(d.name)}\">{d.key}</th>" for d in DIMENSIONS)
    dim_rows = []
    for s in summaries:
        cells = "".join(
            f"<td class='c{_heat(s.dims[d.key])}'>{s.dims[d.key]:.1f}</td>" for d in DIMENSIONS
        )
        dim_rows.append(f"<tr><th>{html.escape(s.name)}</th>{cells}<td class='dqcell'>{s.dq}</td></tr>")

    legend = " · ".join(f"<b>{d.key}</b> {html.escape(d.name)}" for d in DIMENSIONS)
    note = ""
    if meta.get("illustrative"):
        note = ("<p class='warn'>⚠️ Illustrative run — deterministic mock personas, "
                "not real models. They demonstrate that the harness discriminates "
                "DARC-ness.</p>")

    return f"""<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>The DARC-ness Leaderboard</title>
<style>
  :root {{ --bg:#0a0a0c; --panel:#131318; --ink:#e8e6df; --dim:#8a8778;
          --accent:#c8a24a; --line:#26262e; }}
  * {{ box-sizing:border-box; }}
  body {{ margin:0; background:var(--bg); color:var(--ink);
    font:16px/1.5 ui-serif, Georgia, "Times New Roman", serif; padding:48px 20px; }}
  .wrap {{ max-width:860px; margin:0 auto; }}
  h1 {{ font-size:34px; margin:0 0 4px; letter-spacing:.3px; }}
  .sub {{ color:var(--dim); margin:0 0 4px; font-style:italic; }}
  .meta {{ color:var(--dim); font-size:13px; font-family:ui-monospace,monospace;
    border-top:1px solid var(--line); border-bottom:1px solid var(--line);
    padding:10px 0; margin:18px 0 26px; }}
  .warn {{ color:#e0b64a; font-size:13px; }}
  .row {{ display:grid; grid-template-columns:40px 1fr 220px 56px; gap:14px;
    align-items:center; padding:12px 0; border-bottom:1px solid var(--line); }}
  .rank {{ font-size:20px; text-align:center; color:var(--dim); }}
  .name {{ font-weight:700; font-size:18px; }}
  .grade {{ color:var(--dim); font-size:12px; font-family:ui-monospace,monospace; }}
  .meter {{ background:#000; border:1px solid var(--line); height:12px; border-radius:6px; overflow:hidden; }}
  .fill {{ height:100%; background:linear-gradient(90deg,#6b5320,var(--accent)); }}
  .dq {{ text-align:right; font-weight:700; font-size:20px; color:var(--accent); }}
  h2 {{ font-size:15px; text-transform:uppercase; letter-spacing:2px;
    color:var(--dim); margin:40px 0 12px; }}
  table {{ width:100%; border-collapse:collapse; font-size:14px; }}
  th,td {{ padding:8px 6px; text-align:center; border-bottom:1px solid var(--line); }}
  thead th {{ color:var(--dim); font-weight:600; }}
  tbody th {{ text-align:left; font-weight:700; white-space:nowrap; }}
  .dqcell {{ font-weight:700; color:var(--accent); }}
  .c0{{color:#8c3b3b}} .c1{{color:#a85f42}} .c2{{color:#b98a4a}}
  .c3{{color:#c8a24a}} .c4{{color:#9db35a}} .c5{{color:#7fbf6a}}
  .legend {{ color:var(--dim); font-size:12px; margin-top:14px; line-height:1.8; }}
  .foot {{ color:var(--dim); font-size:12px; margin-top:36px;
    border-top:1px solid var(--line); padding-top:14px; }}
  .foot a {{ color:var(--accent); }}
</style></head>
<body><div class="wrap">
  <h1>The DARC-ness Leaderboard</h1>
  <p class="sub">Which model best embodies the ideology of the Defense Analyses and Research Corporation?</p>
  <div class="meta">provider: {html.escape(str(meta.get('provider')))} &nbsp;·&nbsp;
    judge: {html.escape(str(meta.get('judge')))} &nbsp;·&nbsp;
    prompts: {meta.get('n_prompts')} &nbsp;·&nbsp; models: {len(summaries)}</div>
  {note}
  {''.join(rows)}
  <h2>Per-dimension breakdown (0–5)</h2>
  <table><thead><tr><th></th>{dim_head}<th>DQ</th></tr></thead>
  <tbody>{''.join(dim_rows)}</tbody></table>
  <p class="legend">{legend}</p>
  <p class="foot">DARC Quotient = rubric-weighted mean of the eight dimensions, rescaled to 0–100.
    Rubric distilled from the DARC corpus at
    <a href="https://defenseanalyses.org">defenseanalyses.org</a>.</p>
</div></body></html>"""


def _heat(v: float) -> int:
    return max(0, min(5, int(round(v))))
