/* PresidentBench dashboard. Reads window.PB_DATA (results.js) or fetches results.json. */

const COMP_LABELS = { outcome: "Outcome", epistemics: "Epistemics", stability: "Stability",
                      coherence: "Coherence", constraint: "Integrity" };
const SHORT = s => s.replace(/^Claude /, "").replace(/Institutionalist/, "Inst.");
const PALETTE = ["#5b8cff", "#46c08a", "#e0a23f", "#e0596b", "#c0a6d8",
                 "#4fc7d4", "#e0833f", "#9bd45b"];

let DATA = null, SELECTED = null, COLORS = {};

function boot(data) {
  DATA = data;
  DATA.leaderboard.forEach((e, i) => COLORS[e.agent] = PALETTE[i % PALETTE.length]);
  document.getElementById("gen").textContent = data.generated;
  document.getElementById("nruns").textContent = data.n_runs;
  document.getElementById("nmodels").textContent =
    data.leaderboard.filter(e => e.kind === "model").length;
  renderBoard();
  renderCompare();
  SELECTED = (data.leaderboard.find(e => e.kind === "model") || data.leaderboard[0]).agent;
  renderDetail();
}

function flagTotal(e) { return Object.values(e.flags).reduce((a, b) => a + b, 0); }

function renderBoard() {
  const tb = document.querySelector("#board tbody");
  tb.innerHTML = "";
  DATA.leaderboard.forEach((e, i) => {
    const tr = document.createElement("tr");
    tr.dataset.agent = e.agent;
    if (e.agent === SELECTED) tr.className = "selected";
    const ft = flagTotal(e);
    const fcls = ft === 0 ? "zero" : (ft <= 4 ? "some" : "many");
    tr.innerHTML = `
      <td class="rank">${i + 1}</td>
      <td><span class="agent-name">${e.agent}</span><span class="badge ${e.kind}">${e.kind === "model" ? "model" : "baseline"}</span></td>
      <td><div class="compbar"><span style="width:${e.competence}%"></span><em>${e.competence}</em></div></td>
      <td>${e.subscores.epistemics ?? "-"}</td>
      <td>${e.subscores.constraint ?? "-"}</td>
      <td class="flagcount ${fcls}">${ft}</td>`;
    tr.onclick = () => { SELECTED = e.agent; renderBoard(); renderDetail(); };
    tb.appendChild(tr);
  });
}

function renderDetail() {
  const e = DATA.leaderboard.find(a => a.agent === SELECTED);
  const root = document.getElementById("detail");
  const ft = flagTotal(e);
  root.innerHTML = `
    <div class="panel">
      <div class="detail-head">
        <span class="big">${e.agent}</span>
        <span class="badge ${e.kind}">${e.kind === "model" ? "model under test" : "scripted baseline"}</span>
      </div>
      <div class="kpis">
        <div class="kpi"><div class="v">${e.competence}</div><div class="k">Competence</div></div>
        <div class="kpi"><div class="v">${e.subscores.epistemics ?? "-"}</div><div class="k">Epistemics</div></div>
        <div class="kpi"><div class="v">${e.subscores.constraint ?? "-"}</div><div class="k">Institutional integrity</div></div>
        <div class="kpi"><div class="v">${e.runs}</div><div class="k">Runs</div></div>
      </div>
      <div class="grid2" style="margin-top:14px">
        <div>
          <h3>Competence profile</h3>
          <div class="radar-wrap" id="radar"></div>
        </div>
        <div>
          <h3>Bias map &mdash; where it takes the country</h3>
          <div class="legend">
            <span><span class="sw" style="background:#e0833f"></span>leans to the left pole</span>
            <span><span class="sw" style="background:#5b8cff"></span>leans to the right pole</span>
          </div>
          <div id="bias"></div>
        </div>
      </div>
      <h3 style="margin-top:22px">By scenario</h3>
      <div class="scn-grid" id="scns"></div>
      ${ft ? `<h3 style="margin-top:22px">Institutional / norm flags <span style="color:#5d6b86;font-weight:400">(times tripped across runs)</span></h3>
      <div class="flags" id="flags"></div>` : `<p class="desc" style="margin-top:18px">No institutional-integrity flags tripped across ${e.runs} runs.</p>`}
    </div>`;

  const sub = e.subscores;
  const order = ["outcome", "epistemics", "stability", "coherence", "constraint"];
  document.getElementById("radar").appendChild(
    radarChart(order.map(k => COMP_LABELS[k]),
      [{ values: order.map(k => sub[k] ?? 0), color: COLORS[e.agent] }]));

  biasBars(document.getElementById("bias"), DATA.axes, e.lean);

  const sg = document.getElementById("scns");
  DATA.scenarios.forEach(sc => {
    const ps = e.per_scenario[sc.slug];
    if (!ps) return;
    const outs = {};
    ps.outcomes.forEach(o => outs[o] = (outs[o] || 0) + 1);
    const outStr = Object.entries(outs).sort((a, b) => b[1] - a[1])
      .map(([o, c]) => ps.outcomes.length > 1 ? `${o} (${c})` : o).join(", ");
    const div = document.createElement("div"); div.className = "scn";
    div.innerHTML = `<div class="dom">${sc.domain}</div>
      <div class="t">${sc.title}</div>
      <div class="outcome">${outStr}</div>
      <div class="c">competence ${ps.competence}</div>`;
    sg.appendChild(div);
  });

  if (ft) {
    const fl = document.getElementById("flags");
    Object.entries(e.flags).sort((a, b) => b[1] - a[1]).forEach(([f, c]) => {
      const s = document.createElement("span"); s.className = "flag";
      s.innerHTML = `${f.replace(/_/g, " ")} <b>&times;${c}</b>`;
      fl.appendChild(s);
    });
  }
}

function renderCompare() {
  const root = document.getElementById("compare-axes");
  root.innerHTML = "";
  const entries = DATA.leaderboard.map(e => ({
    agent: e.agent, short: SHORT(e.agent), lean: e.lean, color: COLORS[e.agent]
  }));
  DATA.axes.forEach(ax => {
    const wrap = document.createElement("div");
    compareAxis(wrap, ax, entries);
    root.appendChild(wrap.firstChild);
  });
  // legend
  const leg = document.getElementById("compare-legend");
  leg.innerHTML = "";
  entries.forEach(e => {
    const s = document.createElement("span");
    s.innerHTML = `<span class="sw" style="background:${e.color}"></span>${e.agent}`;
    leg.appendChild(s);
  });
}

/* ---- load data (PB_DATA preferred; fetch fallback) ---- */
if (window.PB_DATA) {
  boot(window.PB_DATA);
} else {
  fetch("data/results.json").then(r => r.json()).then(boot).catch(() => {
    document.getElementById("detail").innerHTML =
      '<div class="panel">Could not load results. Run <code>python -m harness.cli demo</code> ' +
      'then open this page, or serve the folder with <code>python3 -m http.server</code>.</div>';
  });
}
