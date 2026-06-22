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
  renderPareto();
  renderCompare();
  renderMandates();
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
      <div class="c">competence ${ps.competence}${ps.rep ? ' &middot; <span class="toggle">read transcript &rarr;</span>' : ''}</div>`;
    if (ps.rep) { div.style.cursor = "pointer"; div.onclick = () => openTranscript(e.agent, sc); }
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

function fidColor(v) {
  // 40 -> red, 70 -> amber, 100 -> green
  const t = Math.max(0, Math.min(1, (v - 45) / 45));
  const a = [224, 89, 107], b = [224, 162, 63], c = [70, 192, 138];
  const lerp = (x, y, k) => Math.round(x + (y - x) * k);
  let col = t < 0.5
    ? a.map((x, i) => lerp(x, b[i], t * 2))
    : b.map((x, i) => lerp(x, c[i], (t - 0.5) * 2));
  return `rgb(${col[0]},${col[1]},${col[2]})`;
}

function renderMandates() {
  const M = window.PB_MANDATES;
  if (!M || !M.matrix || !M.matrix.length) return;
  document.getElementById("mandate-section").style.display = "";
  document.getElementById("mandate-disclaimer").textContent = M.disclaimer;
  const models = [...new Set(M.matrix.map(c => c.agent))];
  const cellOf = (ag, mk) => M.matrix.find(c => c.agent === ag && c.mandate === mk);

  // build table: rows = models, cols = mandates
  let html = `<table class="mtx"><thead><tr><th></th>`;
  M.mandates.forEach(m => {
    html += `<th><div class="mh"><span class="pty ${m.party}">${m.party}</span>${m.name}</div>
      <div class="msl">&ldquo;${m.slogan}&rdquo;</div></th>`;
  });
  html += `</tr></thead><tbody>`;
  models.forEach(ag => {
    html += `<tr><td class="rowh">${ag}</td>`;
    M.mandates.forEach(m => {
      const c = cellOf(ag, m.key);
      if (!c) { html += `<td class="mc empty">&mdash;</td>`; return; }
      html += `<td class="mc" style="background:${fidColor(c.fidelity)}22;border-color:${fidColor(c.fidelity)}55"
        data-ag="${ag}" data-mk="${m.key}">
        <div class="fid" style="color:${fidColor(c.fidelity)}">${c.fidelity}</div>
        <div class="sp">s${c.style} &middot; p${c.promise}</div></td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table>
    <div class="legend" style="margin-top:10px">
      <span><b>fidelity</b> = mean(style, promise)</span>
      <span><b>s</b> = style (governed as promised)</span>
      <span><b>p</b> = promise (delivered the pledges)</span>
      <span style="color:#5d6b86">click a cell for the drift detail</span>
    </div>`;
  document.getElementById("mandate-matrix").innerHTML = html;

  // headline insight
  const avgS = avg(M.matrix.map(c => c.style)), avgP = avg(M.matrix.map(c => c.promise));
  const di = document.getElementById("mandate-detail");
  di.innerHTML = `<div class="callout" style="margin-top:16px">Across every model &times; mandate,
    average <b>promise</b> fidelity is ${avgP.toFixed(0)} but average <b>style</b> fidelity is
    only ${avgS.toFixed(0)} &mdash; the models tend to <em>deliver the platform's goals while
    governing in their own disposition</em>. Click a cell to see exactly where a model drifts
    from the mandate it was given.</div>`;

  document.querySelectorAll("td.mc[data-ag]").forEach(td => {
    td.style.cursor = "pointer";
    td.onclick = () => showMandateDrift(td.dataset.ag, td.dataset.mk);
  });
}

function showMandateDrift(ag, mk) {
  const M = window.PB_MANDATES;
  const c = M.matrix.find(x => x.agent === ag && x.mandate === mk);
  const m = M.mandates.find(x => x.key === mk);
  const axName = {}; M.axes.forEach(a => axName[a.key] = a);
  const rows = Object.entries(m.priorities).map(([k, tgt]) => {
    const act = c.lean[k];
    const ax = axName[k];
    const gap = Math.abs(act - tgt);
    const pole = v => v >= 0 ? ax.pos : ax.neg;
    return `<tr><td>${ax.neg} &harr; ${ax.pos}</td>
      <td class="num">${tgt >= 0 ? "+" : ""}${tgt.toFixed(2)} <span class="pl">${pole(tgt)}</span></td>
      <td class="num">${act >= 0 ? "+" : ""}${act.toFixed(2)} <span class="pl">${pole(act)}</span></td>
      <td class="num" style="color:${gap > 0.7 ? "#e0596b" : gap > 0.4 ? "#e0a23f" : "#46c08a"}">${gap.toFixed(2)}</td></tr>`;
  }).join("");
  const broke = Object.keys(c.broken || {}).length
    ? `<div class="flags" style="margin-top:10px">` + Object.entries(c.broken)
        .map(([f, n]) => `<span class="flag">broke: ${f.replace(/_/g, " ")} &times;${n}</span>`).join("") + `</div>`
    : `<p class="desc" style="margin-top:8px">No redlines broken.</p>`;
  const di = document.getElementById("mandate-detail");
  di.innerHTML = `<div class="panel" style="margin-top:16px;background:var(--panel-2)">
    <div class="detail-head"><span class="big" style="font-size:20px">${ag}</span>
      <span class="badge persona">running on ${m.name}'s platform</span></div>
    <p class="desc">&ldquo;${m.slogan}&rdquo; &mdash; fidelity <b>${c.fidelity}</b>
      (style ${c.style} / promise ${c.promise}), n=${c.n}</p>
    <table class="drift"><thead><tr><th>Axis</th><th>Mandate wanted</th><th>Model did</th><th>gap</th></tr></thead>
      <tbody>${rows}</tbody></table>
    ${broke}
  </div>`;
  di.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function avg(a) { const x = a.filter(v => v != null); return x.reduce((s, v) => s + v, 0) / (x.length || 1); }

function renderPareto() {
  const root = document.getElementById("pareto");
  root.innerHTML = "";
  const pts = DATA.leaderboard.map(e => ({
    x: e.competence,
    y: e.subscores.constraint ?? 50,
    label: SHORT(e.agent),
    color: COLORS[e.agent],
    kind: e.kind,
  }));
  root.appendChild(scatterChart(pts, {
    xlabel: "Competence (composite)", ylabel: "Institutional integrity",
    brLabel: "effective, low-integrity", width: 660, height: 430,
  }));
}

function openTranscript(agent, sc) {
  const e = DATA.leaderboard.find(a => a.agent === agent);
  const rep = e.per_scenario[sc.slug].rep;
  if (!rep) return;
  const hid = Object.entries(rep.hidden)
    .filter(([k]) => !["volatility", "invasion_turn", "vax_eta"].includes(k))
    .map(([k, v]) => `${k}=<b>${v}</b>`).join(" &middot; ");
  const turns = rep.turns.map(t => {
    const acts = t.actions.length
      ? t.actions.map(a => `<li><span class="an">${a.name}</span>${a.rationale ? ` &mdash; <span class="ar">${esc(a.rationale)}</span>` : ""}</li>`).join("")
      : "<li><em>(no action)</em></li>";
    return `<div class="tr-turn">
      <div class="tr-h">Turn ${t.turn}</div>
      <div class="tr-sit">${esc(t.sitrep).replace(/\n/g, "<br>")}</div>
      <ul class="tr-acts">${acts}</ul>
      <div class="tr-nar">&rarr; ${esc(t.narrative)}</div>
    </div>`;
  }).join("");
  const ov = document.createElement("div"); ov.className = "overlay";
  ov.innerHTML = `<div class="modal">
    <div class="modal-head">
      <div><div class="modal-title">${agent} &middot; ${sc.title}</div>
        <div class="modal-sub">outcome: <b>${rep.outcome}</b> &middot; competence ${rep.competence} &middot; seed ${rep.seed}</div></div>
      <span class="x">&times;</span>
    </div>
    <div class="modal-hidden"><b>Hidden truth this run</b> (the President had to infer this): ${hid}</div>
    <div class="modal-body">${turns}</div>
  </div>`;
  ov.onclick = ev => { if (ev.target === ov || ev.target.className === "x") document.body.removeChild(ov); };
  document.addEventListener("keydown", function esc2(ev) {
    if (ev.key === "Escape" && ov.parentNode) { document.body.removeChild(ov); document.removeEventListener("keydown", esc2); }
  });
  document.body.appendChild(ov);
}

function esc(s) { return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

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
