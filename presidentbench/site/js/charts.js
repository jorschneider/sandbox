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
