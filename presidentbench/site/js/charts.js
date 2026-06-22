/* Hand-rolled SVG charts -- zero dependencies, works from file://. */

const SVGNS = "http://www.w3.org/2000/svg";

function el(tag, attrs = {}, kids = []) {
  const n = document.createElementNS(SVGNS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  for (const c of [].concat(kids)) n.appendChild(typeof c === "string"
    ? document.createTextNode(c) : c);
  return n;
}

const PALETTE = ["#5b8cff", "#46c08a", "#e0a23f", "#e0596b", "#c0a6d8",
                 "#4fc7d4", "#e0833f", "#9bd45b"];

/* ---- competence radar (values 0..100) ---- */
function radarChart(labels, series, opts = {}) {
  const size = opts.size || 320, cx = size / 2, cy = size / 2;
  const R = size / 2 - 46, n = labels.length;
  const svg = el("svg", { viewBox: `0 0 ${size} ${size}`, width: size, height: size });
  const ang = i => -Math.PI / 2 + i * 2 * Math.PI / n;
  const pt = (i, r) => [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))];

  for (const frac of [0.25, 0.5, 0.75, 1]) {
    let d = "";
    for (let i = 0; i < n; i++) { const [x, y] = pt(i, R * frac); d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1); }
    svg.appendChild(el("path", { d: d + "Z", fill: "none", stroke: "#273046", "stroke-width": 1 }));
  }
  for (let i = 0; i < n; i++) {
    const [x, y] = pt(i, R);
    svg.appendChild(el("line", { x1: cx, y1: cy, x2: x, y2: y, stroke: "#273046", "stroke-width": 1 }));
    const [lx, ly] = pt(i, R + 22);
    svg.appendChild(el("text", {
      x: lx, y: ly, fill: "#93a0b8", "font-size": 11, "text-anchor":
        Math.abs(lx - cx) < 8 ? "middle" : (lx > cx ? "start" : "end"),
      "dominant-baseline": "middle", "font-family": "ui-monospace, monospace"
    }, labels[i]));
  }
  series.forEach((s, si) => {
    const col = s.color || PALETTE[si % PALETTE.length];
    let d = "";
    for (let i = 0; i < n; i++) {
      const v = Math.max(0, Math.min(100, s.values[i])) / 100;
      const [x, y] = pt(i, R * v); d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
    }
    svg.appendChild(el("path", { d: d + "Z", fill: col, "fill-opacity": 0.14, stroke: col, "stroke-width": 2 }));
    for (let i = 0; i < n; i++) {
      const v = Math.max(0, Math.min(100, s.values[i])) / 100;
      const [x, y] = pt(i, R * v);
      svg.appendChild(el("circle", { cx: x, cy: y, r: 3, fill: col }));
    }
  });
  return svg;
}

/* ---- diverging bias bars into a container (DOM, not SVG) ---- */
function biasBars(container, axes, lean, opts = {}) {
  container.innerHTML = "";
  axes.forEach(ax => {
    const v = Math.max(-1, Math.min(1, lean[ax.key] || 0));
    const row = document.createElement("div"); row.className = "axis-row";
    const l = document.createElement("div"); l.className = "lbl"; l.textContent = ax.neg;
    const track = document.createElement("div"); track.className = "axis-track";
    const mid = document.createElement("div"); mid.className = "mid"; track.appendChild(mid);
    const fill = document.createElement("div");
    fill.className = "fill " + (v >= 0 ? "pos" : "neg");
    fill.style.width = (Math.abs(v) * 50) + "%";
    track.appendChild(fill);
    const dot = document.createElement("div"); dot.className = "dot";
    dot.style.left = (50 + v * 50) + "%";
    dot.style.background = v >= 0 ? "#5b8cff" : "#e0833f";
    track.appendChild(dot);
    const r = document.createElement("div"); r.className = "lbl r"; r.textContent = ax.pos;
    row.appendChild(l); row.appendChild(track); row.appendChild(r);
    row.title = `${ax.neg} (-1)  <->  ${ax.pos} (+1):  ${v >= 0 ? "+" : ""}${v.toFixed(2)}  -- ${ax.blurb}`;
    container.appendChild(row);
  });
}

/* ---- Pareto scatter: competence (x) vs a 0..100 measure (y) ---- */
function scatterChart(points, opts = {}) {
  const W = opts.width || 640, H = opts.height || 420;
  const m = { l: 56, r: 24, t: 28, b: 48 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const xmin = opts.xmin ?? 0, xmax = opts.xmax ?? 100;
  const ymin = opts.ymin ?? 0, ymax = opts.ymax ?? 100;
  const X = v => m.l + (v - xmin) / (xmax - xmin) * iw;
  const Y = v => m.t + ih - (v - ymin) / (ymax - ymin) * ih;
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", height: "auto" });

  // quadrant shading (top-right = competent + principled)
  const midX = X((xmin + xmax) / 2), midY = Y((ymin + ymax) / 2);
  svg.appendChild(el("rect", { x: midX, y: m.t, width: m.l + iw - midX, height: midY - m.t,
    fill: "#46c08a", "fill-opacity": 0.05 }));
  svg.appendChild(el("rect", { x: midX, y: midY, width: m.l + iw - midX, height: m.t + ih - midY,
    fill: "#e0596b", "fill-opacity": 0.06 }));

  // grid + axes
  for (let g = 0; g <= 100; g += 25) {
    svg.appendChild(el("line", { x1: X(g), y1: m.t, x2: X(g), y2: m.t + ih, stroke: "#1c2335", "stroke-width": 1 }));
    svg.appendChild(el("line", { x1: m.l, y1: Y(g), x2: m.l + iw, y2: Y(g), stroke: "#1c2335", "stroke-width": 1 }));
    svg.appendChild(el("text", { x: X(g), y: m.t + ih + 18, fill: "#5d6b86", "font-size": 10, "text-anchor": "middle", "font-family": "ui-monospace, monospace" }, "" + g));
    svg.appendChild(el("text", { x: m.l - 10, y: Y(g) + 3, fill: "#5d6b86", "font-size": 10, "text-anchor": "end", "font-family": "ui-monospace, monospace" }, "" + g));
  }
  svg.appendChild(el("text", { x: m.l + iw / 2, y: H - 8, fill: "#93a0b8", "font-size": 12, "text-anchor": "middle" }, opts.xlabel || "Competence"));
  svg.appendChild(el("text", { x: 16, y: m.t + ih / 2, fill: "#93a0b8", "font-size": 12, "text-anchor": "middle", transform: `rotate(-90 16 ${m.t + ih / 2})` }, opts.ylabel || "Integrity"));
  // quadrant caption (bottom-right)
  svg.appendChild(el("text", { x: m.l + iw - 6, y: m.t + ih - 8, fill: "#e0596b", "font-size": 10.5, "text-anchor": "end", "fill-opacity": .8 }, opts.brLabel || "competent, low-integrity"));

  points.forEach(p => {
    const cx = X(p.x), cy = Y(p.y);
    const r = p.kind === "model" ? 7 : 5;
    svg.appendChild(el("circle", { cx, cy, r, fill: p.color,
      stroke: p.kind === "model" ? "#fff" : "none", "stroke-width": p.kind === "model" ? 1.5 : 0,
      "fill-opacity": p.kind === "model" ? 0.95 : 0.6 }));
    const lab = el("text", { x: cx + r + 4, y: cy + 3, fill: "#cdd7ea", "font-size": 11,
      "font-family": "ui-monospace, monospace" }, p.label);
    svg.appendChild(lab);
  });
  return svg;
}

/* ---- multi-agent comparison on a single axis ---- */
function compareAxis(container, ax, entries) {
  container.innerHTML = "";
  const block = document.createElement("div"); block.className = "cmp-axis";
  const head = document.createElement("div"); head.className = "head";
  head.innerHTML = `<span>&#9664; ${ax.neg}</span><span style="color:#5d6b86">${ax.blurb}</span><span>${ax.pos} &#9654;</span>`;
  const track = document.createElement("div"); track.className = "cmp-track";
  const mid = document.createElement("div"); mid.className = "mid"; track.appendChild(mid);
  entries.forEach((e, i) => {
    const v = Math.max(-1, Math.min(1, e.lean[ax.key] || 0));
    const mk = document.createElement("div"); mk.className = "mk";
    mk.style.left = (50 + v * 48) + "%";
    const d = document.createElement("div"); d.className = "d";
    d.style.background = e.color || PALETTE[i % PALETTE.length];
    const nm = document.createElement("div"); nm.className = "nm"; nm.textContent = e.short;
    mk.appendChild(d); mk.appendChild(nm);
    mk.title = `${e.agent}: ${v >= 0 ? "+" : ""}${v.toFixed(2)}`;
    track.appendChild(mk);
  });
  block.appendChild(head); block.appendChild(track);
  container.appendChild(block);
}
