/* ChinaTalk Analytics — static D3 explorer over the podcast feed +
   chinatalk.media archive. Hash-routed views; all data pre-built by
   tools/build_data.py. */
'use strict';

const S = {}; // loaded datasets
let currentView = null;
let currentArg = undefined;

// ---------------------------------------------------------------- utils

const $ = (sel, root) => (root || document).querySelector(sel);
const fmtInt = d3.format(',');
const fmtSI = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'k' : fmtInt(n);
const fmtPct = n => `${Math.round(n)}%`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}
function fmtDur(secs) {
  const h = Math.floor(secs / 3600), m = Math.round((secs % 3600) / 60);
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}
function qDate(q) { // "2019-Q3" -> Date at quarter start
  const [y, qq] = q.split('-Q').map(Number);
  return new Date(y, (qq - 1) * 3, 1);
}
function isoDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function rollingMedian(values, w) {
  const half = Math.floor(w / 2);
  return values.map((_, i) => {
    const win = values.slice(Math.max(0, i - half), i + half + 1).slice().sort(d3.ascending);
    return d3.median(win);
  });
}

// fixed color slots: identity never depends on how many series are shown
const SLOTS = ['--series-1', '--series-2', '--series-3', '--series-4',
  '--series-5', '--series-6', '--series-7', '--series-8'];
const GROUP_SLOT = {
  'AI': 0, 'Tech & Industry': 1, 'Semiconductors': 2, 'Geopolitics & Defense': 3,
  'US Policy': 4, 'US-China & Trade': 5, 'Culture & History': 6, 'Chinese Politics': 7,
};
const TOPIC_SLOT = { // keyword topics that get their own band in the stack
  'AI': 0, 'US Policy': 4, 'Trade & Economics': 5, 'Society & Culture': 6,
  'Military & War': 3, 'Chinese Politics': 7, 'Semiconductors': 2,
};
const groupColor = g => GROUP_SLOT[g] !== undefined ? cssVar(SLOTS[GROUP_SLOT[g]]) : cssVar('--other');
const topicColor = t => TOPIC_SLOT[t] !== undefined ? cssVar(SLOTS[TOPIC_SLOT[t]]) : cssVar('--other');

// ---------------------------------------------------------------- tooltip

const tip = $('#tooltip');
function showTip(html, ev) {
  tip.innerHTML = html;
  tip.hidden = false;
  moveTip(ev);
}
function moveTip(ev) {
  const pad = 14, w = tip.offsetWidth, h = tip.offsetHeight;
  let x = ev.clientX + pad, y = ev.clientY + pad;
  if (x + w > innerWidth - 8) x = ev.clientX - w - pad;
  if (y + h > innerHeight - 8) y = ev.clientY - h - pad;
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
}
function hideTip() { tip.hidden = true; }
const ttRow = (color, label, val) =>
  `<div class="tt-row"><span class="tt-key" style="background:${color}"></span>` +
  `<span class="tt-label">${esc(label)}</span> <span class="tt-val">${esc(val)}</span></div>`;

// ---------------------------------------------------------------- svg scaffold

function makeSvg(container, height, margin, minWidth) {
  const width = Math.max(minWidth || 320, container.clientWidth || 640);
  const svg = d3.select(container).append('svg')
    .attr('width', width).attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`);
  const m = Object.assign({ top: 12, right: 16, bottom: 26, left: 44 }, margin);
  return { svg, width, height, m, iw: width - m.left - m.right, ih: height - m.top - m.bottom };
}
function axisStyle(g) {
  g.selectAll('path.domain').attr('stroke', cssVar('--axis'));
  g.selectAll('.tick line').attr('stroke', cssVar('--axis'));
  g.selectAll('.tick text').attr('fill', cssVar('--text-muted')).attr('font-size', 11);
  return g;
}
function gridLines(svg, x0, x1, yScale, ticks) {
  svg.append('g').selectAll('line').data(yScale.ticks(ticks || 5)).join('line')
    .attr('x1', x0).attr('x2', x1)
    .attr('y1', d => yScale(d)).attr('y2', d => yScale(d))
    .attr('stroke', cssVar('--grid')).attr('stroke-width', 1);
}
function legend(container, entries, line) {
  const div = document.createElement('div');
  div.className = 'legend';
  div.innerHTML = entries.map(e =>
    `<span class="key"><span class="${line ? 'linekey' : 'swatch'}" style="background:${e.color}"></span>${esc(e.label)}</span>`
  ).join('');
  container.appendChild(div);
  return div;
}
const roundTopRect = (x, y, w, h, r) => {
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
};
const roundRightRect = (x, y, w, h, r) => {
  r = Math.min(r, h / 2, w);
  return `M${x},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} L${x},${y + h} Z`;
};

// ---------------------------------------------------------------- boot

const FILES = ['site', 'episodes', 'timeline', 'topics', 'people', 'language', 'engagement', 'references'];
Promise.all(FILES.map(f => fetch(`data/${f}.json`).then(r => r.json())))
  .then(values => {
    FILES.forEach((f, i) => S[f] = values[i]);
    const t = S.site;
    $('#tagline').innerHTML =
      `Exploring <a href="https://www.chinatalk.media/" target="_blank" rel="noopener">chinatalk.media</a> ` +
      `by Jordan Schneider &middot; ${fmtInt(t.episodes)} episodes &middot; ` +
      `${fmtInt(t.audio_hours)} hours of audio &middot; ${fmtSI(t.words)} words`;
    addEventListener('hashchange', route);
    route();
  })
  .catch(err => {
    $('#main').innerHTML = `<div class="loading">Failed to load data: ${esc(err.message)}</div>`;
  });

// search
const searchInput = $('#global-search');
searchInput.addEventListener('keydown', ev => {
  if (ev.key === 'Enter' && searchInput.value.trim()) {
    location.hash = 'search=' + encodeURIComponent(searchInput.value.trim());
  }
});
addEventListener('keydown', ev => {
  if (ev.key === '/' && document.activeElement !== searchInput &&
      !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) {
    ev.preventDefault();
    searchInput.focus();
    searchInput.select();
  }
});

let resizeTimer = null;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (currentView) render(currentView, currentArg); }, 180);
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (currentView) render(currentView, currentArg);
});

const VIEWS = {
  overview: renderOverview, topics: renderTopics, map: renderMap,
  references: renderReferences, episodes: renderEpisodes, people: renderPeople,
  engagement: renderEngagement, language: renderLanguage,
};

function route() {
  const hash = decodeURIComponent(location.hash.slice(1)) || 'overview';
  if (hash.startsWith('search=')) return render('search', hash.slice(7));
  render(VIEWS[hash.split('/')[0]] ? hash.split('/')[0] : 'overview');
}

function render(view, arg) {
  currentView = view;
  currentArg = arg;
  hideTip();
  document.querySelectorAll('#tabs a').forEach(a =>
    a.classList.toggle('active', a.dataset.view === view));
  const main = $('#main');
  main.innerHTML = '';
  if (view === 'search') renderSearch(main, arg);
  else VIEWS[view](main);
}

// ---------------------------------------------------------------- pieces

function card(main, title, sub) {
  const c = document.createElement('section');
  c.className = 'card';
  c.innerHTML = `<h2>${title}</h2>` + (sub ? `<p class="sub">${sub}</p>` : '');
  main.appendChild(c);
  return c;
}
function kpi(row, label, value, sub) {
  const t = document.createElement('div');
  t.className = 'stat-tile';
  t.innerHTML = `<div class="label">${label}</div><div class="value">${value}</div>` +
    (sub ? `<div class="sub">${sub}</div>` : '');
  row.appendChild(t);
}
function method(main, itemsHtml) {
  const d = document.createElement('details');
  d.className = 'method';
  d.innerHTML = `<summary>How this is computed</summary><ul>${itemsHtml}</ul>`;
  main.appendChild(d);
}
function tableView(cardEl, headers, rows) {
  const d = document.createElement('details');
  d.className = 'table-view';
  d.innerHTML = `<summary>View as table</summary>` +
    `<div class="scroll-x"><table class="data"><thead><tr>` +
    headers.map((h, i) => `<th${i ? ' class="num"' : ''}>${esc(h)}</th>`).join('') +
    `</tr></thead><tbody>` +
    rows.map(r => `<tr>` + r.map((v, i) => `<td${i ? ' class="num"' : ''}>${esc(v)}</td>`).join('') + `</tr>`).join('') +
    `</tbody></table></div>`;
  cardEl.appendChild(d);
}

// ================================================================ OVERVIEW

function renderOverview(main) {
  const t = S.site;
  const row = document.createElement('div');
  row.className = 'kpi-row';
  main.appendChild(row);
  const years = ((isoDate(t.last_episode) - isoDate(t.first_episode)) / 31557600000).toFixed(1);
  kpi(row, 'Podcast episodes', fmtInt(t.episodes), `${fmtDate(t.first_episode)} → ${fmtDate(t.last_episode)}`);
  kpi(row, 'Hours of audio', fmtInt(t.audio_hours), `≈ ${Math.round(t.audio_hours / 24)} days of listening`);
  kpi(row, 'Newsletter posts', fmtInt(t.posts), t.transcripts
    ? `incl. ${fmtInt(t.transcripts)} podcast transcripts` : 'on chinatalk.media');
  kpi(row, 'Words published', fmtSI(t.words), 'newsletter archive');
  kpi(row, 'Years running', years, 'and counting');
  kpi(row, 'Likes received', fmtSI(t.likes), `${fmtSI(t.comments)} comments`);

  // ---- output per quarter (stacked bars)
  const c1 = card(main, 'Output per quarter',
    'Podcast episodes and newsletter posts published each quarter.');
  const colors = { episodes: cssVar('--series-1'), posts: cssVar('--series-2') };
  legend(c1, [{ label: 'Podcast episodes', color: colors.episodes },
              { label: 'Newsletter posts', color: colors.posts }]);
  const box1 = document.createElement('div');
  c1.appendChild(box1);
  {
    const { svg, m, iw, ih } = makeSvg(box1, 240);
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);
    const data = S.timeline;
    const x = d3.scaleBand().domain(data.map(d => d.q)).range([0, iw]).paddingInner(0.25);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.episodes + d.posts)]).nice().range([ih, 0]);
    gridLines(g, 0, iw, y);
    for (const d of data) {
      const bw = x.bandwidth(), bx = x(d.q);
      const hEp = ih - y(d.episodes), hPo = ih - y(d.posts);
      const gap = hEp && hPo ? 2 : 0;
      g.append('rect').attr('x', bx).attr('y', ih - hEp).attr('width', bw).attr('height', hEp)
        .attr('fill', colors.episodes).datum(d);
      g.append('path').attr('d', roundTopRect(bx, ih - hEp - gap - hPo, bw, hPo, 3))
        .attr('fill', colors.posts).datum(d);
      g.append('rect').attr('x', bx - 1).attr('y', 0).attr('width', bw + 2).attr('height', ih)
        .attr('fill', 'transparent').datum(d)
        .on('mousemove', (ev, dd) => showTip(
          `<div class="tt-title">${dd.q.replace('-', ' ')}</div>` +
          ttRow(colors.episodes, 'episodes', dd.episodes) +
          ttRow(colors.posts, 'posts', dd.posts) +
          ttRow('transparent', 'audio', dd.hours + ' h'), ev))
        .on('mouseleave', hideTip);
    }
    const years = data.filter(d => d.q.endsWith('Q1'));
    axisStyle(g.append('g').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(x).tickValues(years.map(d => d.q)).tickFormat(q => q.slice(0, 4)).tickSizeOuter(0)));
    axisStyle(g.append('g').call(d3.axisLeft(y).ticks(5).tickSizeOuter(0)));
  }
  tableView(c1, ['Quarter', 'Episodes', 'Posts', 'Audio hours', 'Words'],
    S.timeline.map(d => [d.q, d.episodes, d.posts, d.hours, fmtInt(d.words)]));

  // ---- episode length over time + cumulative hours
  const wrap = document.createElement('div');
  wrap.className = 'grid-2';
  main.appendChild(wrap);

  const c2 = card(wrap, 'Episode length over time',
    'Each dot is one episode; the line is a 15-episode rolling median.');
  {
    const box = document.createElement('div');
    c2.appendChild(box);
    const { svg, m, iw, ih } = makeSvg(box, 240);
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);
    const eps = S.episodes;
    const x = d3.scaleTime().domain(d3.extent(eps, d => isoDate(d.date))).range([0, iw]);
    const y = d3.scaleLinear().domain([0, d3.max(eps, d => d.duration / 60)]).nice().range([ih, 0]);
    gridLines(g, 0, iw, y);
    g.selectAll('circle').data(eps).join('circle')
      .attr('cx', d => x(isoDate(d.date))).attr('cy', d => y(d.duration / 60))
      .attr('r', 2.5).attr('fill', cssVar('--series-1')).attr('opacity', 0.35)
      .on('mousemove', (ev, d) => showTip(
        `<div class="tt-title">${esc(d.title)}</div>` +
        `<div class="tt-label">${fmtDate(d.date)} · ${fmtDur(d.duration)}</div>`, ev))
      .on('mouseleave', hideTip);
    const med = rollingMedian(eps.map(d => d.duration / 60), 15);
    g.append('path').datum(eps.map((d, i) => ({ d: isoDate(d.date), v: med[i] })))
      .attr('fill', 'none').attr('stroke', cssVar('--seq-600')).attr('stroke-width', 2)
      .attr('d', d3.line().x(p => x(p.d)).y(p => y(p.v)).curve(d3.curveMonotoneX));
    axisStyle(g.append('g').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(x).ticks(6).tickSizeOuter(0)));
    axisStyle(g.append('g').call(d3.axisLeft(y).ticks(5).tickFormat(d => d + 'm').tickSizeOuter(0)));
  }

  const c3 = card(wrap, 'Cumulative hours of conversation',
    'Total published podcast audio, accumulated since 2017.');
  {
    const box = document.createElement('div');
    c3.appendChild(box);
    const { svg, m, iw, ih } = makeSvg(box, 240);
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);
    let acc = 0;
    const pts = S.episodes.map(d => ({ d: isoDate(d.date), v: (acc += d.duration / 3600) }));
    const x = d3.scaleTime().domain(d3.extent(pts, p => p.d)).range([0, iw]);
    const y = d3.scaleLinear().domain([0, acc]).nice().range([ih, 0]);
    gridLines(g, 0, iw, y);
    g.append('path').datum(pts).attr('fill', cssVar('--wash'))
      .attr('d', d3.area().x(p => x(p.d)).y0(ih).y1(p => y(p.v)));
    g.append('path').datum(pts).attr('fill', 'none')
      .attr('stroke', cssVar('--series-1')).attr('stroke-width', 2)
      .attr('d', d3.line().x(p => x(p.d)).y(p => y(p.v)));
    const hover = g.append('g').style('display', 'none');
    hover.append('line').attr('y1', 0).attr('y2', ih).attr('stroke', cssVar('--axis')).attr('stroke-dasharray', '3,3');
    hover.append('circle').attr('r', 4).attr('fill', cssVar('--series-1'))
      .attr('stroke', cssVar('--surface-1')).attr('stroke-width', 2);
    svg.append('rect').attr('x', m.left).attr('y', m.top).attr('width', iw).attr('height', ih)
      .attr('fill', 'transparent')
      .on('mousemove', ev => {
        const mx = d3.pointer(ev)[0] - 0;
        const date = x.invert(d3.pointer(ev, g.node())[0]);
        const i = Math.min(pts.length - 1, Math.max(0, d3.bisector(p => p.d).center(pts, date)));
        const p = pts[i];
        hover.style('display', null)
          .select('line').attr('x1', x(p.d)).attr('x2', x(p.d));
        hover.select('circle').attr('cx', x(p.d)).attr('cy', y(p.v));
        showTip(`<div class="tt-title">${p.d.getFullYear()}</div>` +
          ttRow(cssVar('--series-1'), 'cumulative', Math.round(p.v) + ' hours'), ev);
      })
      .on('mouseleave', () => { hover.style('display', 'none'); hideTip(); });
    axisStyle(g.append('g').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(x).ticks(6).tickSizeOuter(0)));
    axisStyle(g.append('g').call(d3.axisLeft(y).ticks(5).tickSizeOuter(0)));
  }

  method(main,
    `<li>Episode metadata (dates, durations) comes from the public podcast RSS feed.</li>` +
    `<li>Newsletter counts and word counts come from the chinatalk.media archive API.</li>` +
    `<li>Data snapshot: ${esc(t.built)}.</li>`);
}

// ================================================================ TOPICS

function renderTopics(main) {
  const T = S.topics;
  const qs = T.quarters.map(qDate);

  // ---- stacked share area: top 7 keyword topics + Other
  const byTotal = [...T.keyword_topics].sort((a, b) => b.total - a.total);
  const top = byTotal.filter(k => TOPIC_SLOT[k.topic] !== undefined);
  const rest = byTotal.filter(k => TOPIC_SLOT[k.topic] === undefined);
  const series = [...top, {
    topic: 'Other',
    trend: T.quarters.map((_, i) => d3.sum(rest, r => r.trend[i])),
  }];

  const c1 = card(main, 'How coverage shifts over time',
    'Share of each quarter’s output touching each theme, across the full 2017–today archive. ' +
    'An item can touch several themes.');
  let mode = 'share';
  const seg = document.createElement('div');
  seg.className = 'seg-toggle';
  seg.innerHTML = `<button class="on" data-m="share">Share of output</button><button data-m="count">Item count</button>`;
  c1.appendChild(seg);
  legend(c1, series.map(s => ({ label: s.topic, color: topicColor(s.topic) })));
  const box1 = document.createElement('div');
  c1.appendChild(box1);

  function drawStack() {
    box1.innerHTML = '';
    const { svg, m, iw, ih } = makeSvg(box1, 320);
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);
    const totals = T.items_per_quarter;
    // per-quarter matrix; in share mode normalize by the sum of topic hits
    const rows = T.quarters.map((q, i) => {
      const o = { q: qs[i] };
      const denom = mode === 'share' ? d3.sum(series, s => s.trend[i]) || 1 : 1;
      for (const s of series) o[s.topic] = (mode === 'share' ? 100 : 1) * s.trend[i] / denom;
      o._raw = i;
      return o;
    });
    const stack = d3.stack().keys(series.map(s => s.topic))(rows);
    const x = d3.scaleTime().domain(d3.extent(qs)).range([0, iw]);
    const y = d3.scaleLinear()
      .domain([0, mode === 'share' ? 100 : d3.max(rows, r => d3.sum(series, s => r[s.topic]))])
      .nice().range([ih, 0]);
    const area = d3.area().x(d => x(d.data.q)).y0(d => y(d[0])).y1(d => y(d[1]))
      .curve(d3.curveMonotoneX);
    g.selectAll('path.band').data(stack).join('path')
      .attr('class', 'band')
      .attr('d', area)
      .attr('fill', d => topicColor(d.key))
      .attr('stroke', cssVar('--surface-1')).attr('stroke-width', 1.5);
    axisStyle(g.append('g').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(x).ticks(7).tickSizeOuter(0)));
    axisStyle(g.append('g').call(d3.axisLeft(y).ticks(5)
      .tickFormat(mode === 'share' ? d => d + '%' : d3.format('~s')).tickSizeOuter(0)));
    svg.append('rect').attr('x', m.left).attr('y', m.top).attr('width', iw).attr('height', ih)
      .attr('fill', 'transparent')
      .on('mousemove', ev => {
        const date = x.invert(d3.pointer(ev, g.node())[0]);
        const i = Math.min(qs.length - 1, Math.max(0, d3.bisector(d => d).center(qs, date)));
        const items = series.map(s => ({
          label: s.topic,
          v: mode === 'share'
            ? fmtPct(100 * s.trend[i] / (d3.sum(series, ss => ss.trend[i]) || 1))
            : s.trend[i],
          color: topicColor(s.topic),
        }));
        showTip(`<div class="tt-title">${T.quarters[i].replace('-', ' ')} · ${totals[i]} items</div>` +
          items.map(it => ttRow(it.color, it.label, it.v)).join(''), ev);
      })
      .on('mouseleave', hideTip);
  }
  drawStack();
  seg.addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    mode = b.dataset.m;
    seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    drawStack();
  });
  tableView(c1, ['Quarter', ...series.map(s => s.topic)],
    T.quarters.map((q, i) => [q, ...series.map(s => s.trend[i])]));

  // ---- small multiples: every keyword topic
  const c2 = card(main, 'Every theme, one by one',
    'Share of quarterly output touching each theme (same y-scale everywhere, 0–80%).');
  const grid = document.createElement('div');
  grid.className = 'multiples';
  c2.appendChild(grid);
  const totals = T.items_per_quarter;
  for (const k of byTotal) {
    if (k.topic === 'Other') continue;
    const mini = document.createElement('div');
    mini.className = 'mini';
    const shareNow = d3.mean(k.trend.slice(-4).map((v, j) =>
      100 * v / (totals[totals.length - 4 + j] || 1)));
    mini.innerHTML = `<h3>${esc(k.topic)}</h3><div class="now">${fmtPct(shareNow)} of output, last 4 quarters</div>`;
    grid.appendChild(mini);
    const { svg, m, iw, ih } = makeSvg(mini, 84, { top: 6, right: 4, bottom: 14, left: 4 }, 140);
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);
    const x = d3.scaleTime().domain(d3.extent(qs)).range([0, iw]);
    const y = d3.scaleLinear().domain([0, 80]).range([ih, 0]);
    const pts = k.trend.map((v, i) => ({ d: qs[i], v: 100 * v / (totals[i] || 1) }));
    g.append('path').datum(pts).attr('fill', cssVar('--wash'))
      .attr('d', d3.area().x(p => x(p.d)).y0(ih).y1(p => y(Math.min(80, p.v))).curve(d3.curveMonotoneX));
    g.append('path').datum(pts).attr('fill', 'none')
      .attr('stroke', cssVar('--series-1')).attr('stroke-width', 1.6)
      .attr('d', d3.line().x(p => x(p.d)).y(p => y(Math.min(80, p.v))).curve(d3.curveMonotoneX));
    const yrs = d3.range(2018, 2027, 4);
    const ax = g.append('g').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(x).tickValues(yrs.map(yy => new Date(yy, 0, 1)))
        .tickFormat(d3.timeFormat('%Y')).tickSize(3).tickSizeOuter(0));
    axisStyle(ax);
    svg.on('mousemove', ev => {
      const date = x.invert(d3.pointer(ev, g.node())[0]);
      const i = Math.min(qs.length - 1, Math.max(0, d3.bisector(d => d).center(qs, date)));
      showTip(`<div class="tt-title">${esc(k.topic)}</div>` +
        ttRow(cssVar('--series-1'), T.quarters[i].replace('-', ' '),
          `${k.trend[i]} items (${fmtPct(100 * k.trend[i] / (totals[i] || 1))})`), ev);
    }).on('mouseleave', hideTip);
  }

  // ---- editorial tags (2023+)
  const c3 = card(main, 'Editorial tags',
    'The tags the ChinaTalk team applies on chinatalk.media — tagging began in 2023. Color marks the tag family.');
  const groups = [...new Set(T.tags.map(t => t.group))];
  legend(c3, groups.map(gr => ({ label: gr, color: groupColor(gr) })));
  const box3 = document.createElement('div');
  c3.appendChild(box3);
  {
    const tags = T.tags.slice(0, 25);
    const rowH = 21;
    const { svg, m, iw, ih } = makeSvg(box3, tags.length * rowH + 30, { left: 150, right: 46, top: 4, bottom: 22 });
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);
    const x = d3.scaleLinear().domain([0, d3.max(tags, t => t.posts)]).nice().range([0, iw]);
    const y = d3.scaleBand().domain(tags.map(t => t.tag)).range([0, tags.length * rowH]).paddingInner(0.3);
    for (const t of tags) {
      g.append('path').attr('d', roundRightRect(0, y(t.tag), x(t.posts), y.bandwidth(), 3))
        .attr('fill', groupColor(t.group))
        .on('mousemove', ev => showTip(`<div class="tt-title">${esc(t.tag)}</div>` +
          ttRow(groupColor(t.group), 'posts', t.posts) +
          ttRow('transparent', 'likes on those posts', fmtInt(t.likes)), ev))
        .on('mouseleave', hideTip);
      g.append('text').attr('x', -8).attr('y', y(t.tag) + y.bandwidth() / 2)
        .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
        .attr('fill', cssVar('--text-secondary')).attr('font-size', 12).text(t.tag);
      g.append('text').attr('x', x(t.posts) + 6).attr('y', y(t.tag) + y.bandwidth() / 2)
        .attr('dominant-baseline', 'middle')
        .attr('fill', cssVar('--text-muted')).attr('font-size', 11).text(t.posts);
    }
    axisStyle(g.append('g').attr('transform', `translate(0,${tags.length * rowH})`)
      .call(d3.axisBottom(x).ticks(5).tickSizeOuter(0)));
  }

  method(main,
    `<li>Theme classification is keyword-based over each item’s title and description ` +
    `(episodes from the podcast feed; posts from the archive). One item can match several themes; ` +
    `unmatched items count as “Other”.</li>` +
    `<li>Episodes matched to their transcript post are counted once, not twice.</li>` +
    `<li>Editorial tags are curated by the ChinaTalk team and only exist from early 2023, ` +
    `so the long-run trends above rely on the keyword classifier instead.</li>`);
}

// ================================================================ MAP

function renderMap(main) {
  const T = S.topics;
  const c = card(main, 'Tag co-occurrence map',
    'Editorial tags that appear on the same posts, since tagging began in 2023. ' +
    'Node size = posts with that tag; a link means the two tags share at least 3 posts. ' +
    'Click a tag to see its most-liked posts.');
  const groups = [...new Set(T.tags.map(t => t.group))];
  legend(c, groups.map(gr => ({ label: gr, color: groupColor(gr) })));
  const wrap = document.createElement('div');
  wrap.className = 'map-wrap';
  wrap.innerHTML = `<div class="map-hint">drag to move · scroll to zoom</div>`;
  c.appendChild(wrap);

  const nodes = T.tags.slice(0, 40).map(t => ({ id: t.tag, group: t.group, posts: t.posts }));
  const nodeSet = new Set(nodes.map(n => n.id));
  const links = T.links.filter(l => nodeSet.has(l.a) && nodeSet.has(l.b))
    .map(l => ({ source: l.a, target: l.b, w: l.w }));

  const height = Math.min(620, Math.max(440, innerHeight - 320));
  const width = Math.max(320, wrap.clientWidth || 800);
  const svg = d3.select(wrap).append('svg')
    .attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);
  const root = svg.append('g');
  svg.call(d3.zoom().scaleExtent([0.5, 3]).on('zoom', ev => root.attr('transform', ev.transform)));

  const r = d3.scaleSqrt().domain([0, d3.max(nodes, n => n.posts)]).range([4, 26]);
  const lw = d3.scaleLinear().domain(d3.extent(links, l => l.w)).range([1, 5]);

  const sim = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id)
      .distance(l => 90 - 4 * Math.min(10, l.w)).strength(l => Math.min(1, l.w / 12)))
    .force('charge', d3.forceManyBody().strength(-220))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collide', d3.forceCollide().radius(d => r(d.posts) + 12));

  const linkSel = root.append('g').selectAll('line').data(links).join('line')
    .attr('stroke', cssVar('--axis')).attr('stroke-opacity', 0.45)
    .attr('stroke-width', l => lw(l.w));
  const nodeSel = root.append('g').selectAll('circle').data(nodes).join('circle')
    .attr('class', 'net-node')
    .attr('r', d => r(d.posts))
    .attr('fill', d => groupColor(d.group))
    .attr('stroke', cssVar('--surface-1')).attr('stroke-width', 1.5)
    .call(d3.drag()
      .on('start', (ev, d) => { if (!ev.active) sim.alphaTarget(0.25).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
      .on('end', (ev, d) => { if (!ev.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));
  const labelSel = root.append('g').selectAll('text').data(nodes).join('text')
    .attr('class', d => 'net-label' + (d.posts < 12 ? ' dim' : ''))
    .attr('text-anchor', 'middle')
    .attr('font-size', d => d.posts >= 25 ? 12 : 10.5)
    .text(d => d.id);

  sim.on('tick', () => {
    linkSel.attr('x1', l => l.source.x).attr('y1', l => l.source.y)
      .attr('x2', l => l.target.x).attr('y2', l => l.target.y);
    nodeSel.attr('cx', d => d.x).attr('cy', d => d.y);
    labelSel.attr('x', d => d.x).attr('y', d => d.y - r(d.posts) - 4);
  });

  const detail = document.createElement('div');
  main.appendChild(detail);

  nodeSel
    .on('mousemove', (ev, d) => showTip(
      `<div class="tt-title">${esc(d.id)}</div>` +
      ttRow(groupColor(d.group), d.group, `${d.posts} posts`), ev))
    .on('mouseleave', hideTip)
    .on('click', (ev, d) => {
      hideTip();
      const posts = S.engagement.posts
        .filter(p => p.tags && p.tags.includes(d.id))
        .sort((a, b) => b.likes - a.likes).slice(0, 12);
      detail.innerHTML = '';
      const dc = card(detail, `Most-liked posts tagged “${esc(d.id)}”`, `${d.posts} tagged posts in total.`);
      dc.insertAdjacentHTML('beforeend',
        `<div class="scroll-x"><table class="data"><thead><tr><th>Post</th><th>Date</th><th class="num">Likes</th><th class="num">Comments</th></tr></thead><tbody>` +
        posts.map(p =>
          `<tr><td><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title)}</a></td>` +
          `<td>${fmtDate(p.date)}</td><td class="num">${fmtInt(p.likes)}</td><td class="num">${fmtInt(p.comments)}</td></tr>`
        ).join('') + `</tbody></table></div>`);
      detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

  method(main,
    `<li>Only the 40 most-used editorial tags are shown; links require ≥ 3 shared posts.</li>` +
    `<li>Layout is a force simulation — position beyond clustering carries no meaning.</li>`);
}

// ================================================================ EPISODES

function renderEpisodes(main) {
  const topics = [...new Set(S.episodes.flatMap(e => e.topics))].sort();
  const years = [...new Set(S.episodes.map(e => e.date.slice(0, 4)))].sort();

  const bar = document.createElement('div');
  bar.className = 'filter-row';
  bar.innerHTML =
    `<input type="search" id="ep-q" placeholder="Filter episodes…">` +
    `<label>Year <select id="ep-year"><option value="">All</option>${years.map(y => `<option>${y}</option>`).join('')}</select></label>` +
    `<label>Theme <select id="ep-topic"><option value="">All</option>${topics.map(t => `<option>${esc(t)}</option>`).join('')}</select></label>` +
    `<label>Sort <select id="ep-sort"><option value="new">Newest</option><option value="old">Oldest</option><option value="long">Longest</option></select></label>` +
    `<span class="count" id="ep-count"></span>`;
  main.appendChild(bar);

  const listCard = document.createElement('section');
  listCard.className = 'card';
  main.appendChild(listCard);
  const holder = document.createElement('div');
  holder.className = 'scroll-x';
  listCard.appendChild(holder);
  const moreBtn = document.createElement('button');
  moreBtn.className = 'more';
  moreBtn.textContent = 'Show more';
  listCard.appendChild(moreBtn);

  let shown = 100;
  function apply() {
    const q = $('#ep-q').value.trim().toLowerCase();
    const yr = $('#ep-year').value;
    const tp = $('#ep-topic').value;
    const sort = $('#ep-sort').value;
    let rows = S.episodes.filter(e =>
      (!yr || e.date.startsWith(yr)) &&
      (!tp || e.topics.includes(tp)) &&
      (!q || (e.title + ' ' + e.desc + ' ' + e.guests.join(' ')).toLowerCase().includes(q)));
    if (sort === 'new') rows = rows.slice().reverse();
    else if (sort === 'long') rows = rows.slice().sort((a, b) => b.duration - a.duration);
    $('#ep-count').textContent = `${fmtInt(rows.length)} episodes · ${fmtInt(Math.round(d3.sum(rows, r => r.duration) / 3600))} hours`;
    const slice = rows.slice(0, shown);
    holder.innerHTML =
      `<table class="data"><thead><tr><th class="num">#</th><th>Date</th><th>Episode</th><th class="num">Length</th><th>Themes</th></tr></thead><tbody>` +
      slice.map(e => {
        const link = e.post || e.link;
        const title = link ? `<a href="${esc(link)}" target="_blank" rel="noopener">${esc(e.title)}</a>` : esc(e.title);
        const guests = e.guests.length ? `<div class="ep-desc">Guest${e.guests.length > 1 ? 's' : ''}: ${esc(e.guests.join(', '))}</div>` : '';
        const tr = e.tr ? `<span class="chip chip-tr">Transcript</span>`
          : e.gen ? `<span class="chip chip-tr">Auto transcript</span>` : '';
        return `<tr><td class="num">${e.n}</td><td style="white-space:nowrap">${fmtDate(e.date)}</td>` +
          `<td class="ep-title">${title}${guests}</td>` +
          `<td class="num">${fmtDur(e.duration)}</td>` +
          `<td>${tr}${e.topics.filter(t => t !== 'Other').slice(0, 3).map(t => `<span class="chip">${esc(t)}</span>`).join('')}</td></tr>`;
      }).join('') + `</tbody></table>`;
    moreBtn.style.display = rows.length > shown ? '' : 'none';
    moreBtn.textContent = `Show more (${fmtInt(rows.length - shown)} left)`;
  }
  bar.addEventListener('input', () => { shown = 100; apply(); });
  moreBtn.addEventListener('click', () => { shown += 200; apply(); });
  apply();

  method(main,
    `<li>Episode links go to the matching chinatalk.media post when one exists, otherwise to the podcast page.</li>` +
    `<li>“Transcript” marks episodes whose matched post reads as an interview transcript ` +
    `(ten or more speaker turns). Matching is by title, so some published transcripts are missed.</li>` +
    `<li>“Auto transcript” marks episodes transcribed by Whisper speech-to-text for this project — ` +
    `useful for the mention analytics, but expect name misspellings; the published transcripts remain canonical.</li>` +
    `<li>Guests are extracted from episode titles with conservative patterns ` +
    `(“Name on …”, “… with Name”), so co-hosts and unnamed guests are missed.</li>`);
}

// ================================================================ PEOPLE

function renderPeople(main) {
  const P = S.people;
  const row = document.createElement('div');
  row.className = 'kpi-row';
  main.appendChild(row);
  kpi(row, 'Newsletter contributors', fmtInt(P.authors.length), 'with a byline');
  kpi(row, 'Guests identified from titles', fmtInt(P.guests.length), 'a conservative lower bound');
  kpi(row, 'Repeat guests', fmtInt(P.guests.filter(g => g.episodes.length > 1).length), '2+ appearances');

  const wrap = document.createElement('div');
  wrap.className = 'grid-2';
  main.appendChild(wrap);

  const c1 = card(wrap, 'Contributors', 'Posts with each byline on chinatalk.media.');
  {
    const authors = P.authors.slice(0, 15);
    const rowH = 22;
    const box = document.createElement('div');
    c1.appendChild(box);
    const { svg, m, iw } = makeSvg(box, authors.length * rowH + 30, { left: 140, right: 46, top: 4, bottom: 22 });
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);
    const x = d3.scaleLinear().domain([0, d3.max(authors, a => a.posts)]).nice().range([0, iw]);
    const y = d3.scaleBand().domain(authors.map(a => a.name)).range([0, authors.length * rowH]).paddingInner(0.3);
    for (const a of authors) {
      g.append('path').attr('d', roundRightRect(0, y(a.name), x(a.posts), y.bandwidth(), 3))
        .attr('fill', cssVar('--series-1'))
        .on('mousemove', ev => showTip(`<div class="tt-title">${esc(a.name)}</div>` +
          ttRow(cssVar('--series-1'), 'posts', fmtInt(a.posts)) +
          ttRow('transparent', 'likes on those posts', fmtInt(a.likes)), ev))
        .on('mouseleave', hideTip);
      g.append('text').attr('x', -8).attr('y', y(a.name) + y.bandwidth() / 2)
        .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
        .attr('fill', cssVar('--text-secondary')).attr('font-size', 12).text(a.name);
      g.append('text').attr('x', x(a.posts) + 6).attr('y', y(a.name) + y.bandwidth() / 2)
        .attr('dominant-baseline', 'middle')
        .attr('fill', cssVar('--text-muted')).attr('font-size', 11).text(fmtInt(a.posts));
    }
    axisStyle(g.append('g').attr('transform', `translate(0,${authors.length * rowH})`)
      .call(d3.axisBottom(x).ticks(5).tickSizeOuter(0)));
  }

  const c2 = card(wrap, 'Repeat guests',
    'Guests whose names appear in more than one episode title. Click a name to see their episodes.');
  {
    const repeats = P.guests.filter(g => g.episodes.length > 1);
    const epByN = new Map(S.episodes.map(e => [e.n, e]));
    c2.insertAdjacentHTML('beforeend',
      `<table class="data"><thead><tr><th>Guest</th><th class="num">Episodes</th><th>Appearances</th></tr></thead><tbody>` +
      repeats.map(g =>
        `<tr><td><a href="#episodes" class="guest-link" data-name="${esc(g.name)}">${esc(g.name)}</a></td>` +
        `<td class="num">${g.episodes.length}</td>` +
        `<td>${g.episodes.map(n => {
          const e = epByN.get(n);
          return `<span class="chip" title="${esc(e ? e.title : '')}">${e ? e.date.slice(0, 4) : n}</span>`;
        }).join('')}</td></tr>`).join('') +
      `</tbody></table>`);
    c2.addEventListener('click', ev => {
      const a = ev.target.closest('a.guest-link');
      if (!a) return;
      ev.preventDefault();
      location.hash = 'episodes';
      requestAnimationFrame(() => {
        const q = $('#ep-q');
        if (q) { q.value = a.dataset.name; q.dispatchEvent(new Event('input', { bubbles: true })); }
      });
    });
  }

  // most-mentioned public figures, from the full-text corpus
  if (S.language.people && S.language.people.length) {
    const c25 = card(main, 'Most-mentioned figures',
      'Name-drops across the full newsletter corpus, transcripts included. Explore their trends in the Language tab.');
    const figures = S.language.people.filter(p => p.total > 0);
    const rowH = 21;
    const box = document.createElement('div');
    c25.appendChild(box);
    const { svg, m, iw } = makeSvg(box, figures.length * rowH + 30, { left: 150, right: 56, top: 4, bottom: 22 });
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);
    const x = d3.scaleLinear().domain([0, d3.max(figures, f => f.total)]).nice().range([0, iw]);
    const y = d3.scaleBand().domain(figures.map(f => f.term)).range([0, figures.length * rowH]).paddingInner(0.3);
    for (const f of figures) {
      g.append('path').attr('d', roundRightRect(0, y(f.term), x(f.total), y.bandwidth(), 3))
        .attr('fill', cssVar('--series-1'))
        .on('mousemove', ev => showTip(`<div class="tt-title">${esc(f.term)}</div>` +
          ttRow(cssVar('--series-1'), 'mentions', fmtInt(f.total)), ev))
        .on('mouseleave', hideTip);
      g.append('text').attr('x', -8).attr('y', y(f.term) + y.bandwidth() / 2)
        .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
        .attr('fill', cssVar('--text-secondary')).attr('font-size', 12).text(f.term);
      g.append('text').attr('x', x(f.total) + 6).attr('y', y(f.term) + y.bandwidth() / 2)
        .attr('dominant-baseline', 'middle')
        .attr('fill', cssVar('--text-muted')).attr('font-size', 11).text(fmtInt(f.total));
    }
    axisStyle(g.append('g').attr('transform', `translate(0,${figures.length * rowH})`)
      .call(d3.axisBottom(x).ticks(5).tickSizeOuter(0)));
  }

  const c3 = card(main, 'All identified guests', '');
  c3.insertAdjacentHTML('beforeend',
    `<p class="sub">${S.people.guests.map(g => `<span class="chip">${esc(g.name)}</span>`).join(' ')}</p>`);

  method(main,
    `<li>Bylines come from the archive API; the podcast host is not double-counted as a guest.</li>` +
    `<li>Guest names are parsed from episode titles only — a conservative lower bound. ` +
    `Many episodes name no guest in the title and are not counted.</li>` +
    `<li>Figure mentions are counted over the full text of every post, including published transcripts; ` +
    `single-surname patterns (“Xi”, “Trump”, “Deng”) are attributed to the usual bearer.</li>`);
}

// ================================================================ ENGAGEMENT

function renderEngagement(main) {
  const posts = S.engagement.posts.filter(p => p.date >= '2019-01-01');
  const row = document.createElement('div');
  row.className = 'kpi-row';
  main.appendChild(row);
  const t = S.site;
  kpi(row, 'Total likes', fmtSI(t.likes), 'across the newsletter archive');
  kpi(row, 'Total comments', fmtSI(t.comments), '');
  const med = d3.median(posts.filter(p => p.date >= '2025-01-01'), p => p.likes);
  kpi(row, 'Median likes, 2025+', fmtInt(med), 'per post');
  kpi(row, 'Paid-only posts', fmtInt(posts.filter(p => p.paid).length), `of ${fmtInt(posts.length)} posts`);

  const c1 = card(main, 'Likes per post over time',
    'Each dot is one post; the line is a 25-post rolling median. Standout posts are labeled.');
  const box = document.createElement('div');
  c1.appendChild(box);
  {
    const { svg, m, iw, ih } = makeSvg(box, 320, { right: 20 });
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);
    const x = d3.scaleTime().domain(d3.extent(posts, p => isoDate(p.date))).range([0, iw]);
    const y = d3.scaleSqrt().domain([0, d3.max(posts, p => p.likes)]).nice().range([ih, 0]);
    gridLines(g, 0, iw, y);
    g.selectAll('circle').data(posts).join('circle')
      .attr('cx', p => x(isoDate(p.date))).attr('cy', p => y(p.likes))
      .attr('r', 2.5).attr('fill', cssVar('--series-1')).attr('opacity', 0.35)
      .on('mousemove', (ev, p) => showTip(
        `<div class="tt-title">${esc(p.title)}</div>` +
        `<div class="tt-label">${fmtDate(p.date)} · ${fmtInt(p.likes)} likes · ${fmtInt(p.comments)} comments</div>`, ev))
      .on('mouseleave', hideTip)
      .on('click', (ev, p) => window.open(p.url, '_blank', 'noopener'));
    const medv = rollingMedian(posts.map(p => p.likes), 25);
    g.append('path').datum(posts.map((p, i) => ({ d: isoDate(p.date), v: medv[i] })))
      .attr('fill', 'none').attr('stroke', cssVar('--seq-600')).attr('stroke-width', 2)
      .attr('d', d3.line().x(p => x(p.d)).y(p => y(p.v)).curve(d3.curveMonotoneX));
    // label the top three outliers
    for (const p of [...posts].sort((a, b) => b.likes - a.likes).slice(0, 3)) {
      g.append('text').attr('x', Math.min(iw - 4, x(isoDate(p.date)) + 6)).attr('y', y(p.likes) - 6)
        .attr('fill', cssVar('--text-secondary')).attr('font-size', 11)
        .attr('text-anchor', x(isoDate(p.date)) > iw * 0.7 ? 'end' : 'start')
        .text(p.title.length > 42 ? p.title.slice(0, 40) + '…' : p.title);
    }
    axisStyle(g.append('g').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(x).ticks(7).tickSizeOuter(0)));
    axisStyle(g.append('g').call(d3.axisLeft(y).ticks(6).tickSizeOuter(0)));
    g.append('text').attr('x', -m.left + 4).attr('y', -2).attr('fill', cssVar('--text-muted'))
      .attr('font-size', 11).text('likes (√ scale)');
  }

  const c2 = card(main, 'Most-liked posts', '');
  c2.insertAdjacentHTML('beforeend',
    `<div class="scroll-x"><table class="data"><thead><tr><th class="num">#</th><th>Post</th><th>Date</th><th class="num">Likes</th><th class="num">Comments</th></tr></thead><tbody>` +
    S.engagement.top.map((p, i) =>
      `<tr><td class="num">${i + 1}</td>` +
      `<td><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title)}</a></td>` +
      `<td style="white-space:nowrap">${fmtDate(p.date)}</td>` +
      `<td class="num">${fmtInt(p.likes)}</td><td class="num">${fmtInt(p.comments)}</td></tr>`).join('') +
    `</tbody></table></div>`);

  method(main,
    `<li>Likes and comments come from the chinatalk.media archive API and reflect ` +
    `the Substack era; early years pre-date today’s audience size, so the trend mixes ` +
    `audience growth with post appeal.</li>` +
    `<li>The y-axis uses a square-root scale so runaway hits don’t flatten everything else.</li>`);
}

// ================================================================ LANGUAGE

const termState = new Map(); // term -> slot index, survives re-renders
function renderLanguage(main) {
  const L = S.language;
  const qs = L.quarters.map(qDate);
  const ALL = L.terms.concat(L.people || []);

  if (termState.size === 0) {
    ['AI', 'Chips & semis', 'Taiwan', 'Tariffs / trade war']
      .forEach(t => { if (ALL.some(x => x.term === t)) termState.set(t, freeSlot()); });
  }
  function freeSlot() {
    const used = new Set(termState.values());
    for (let i = 0; i < SLOTS.length; i++) if (!used.has(i)) return i;
    return null;
  }

  const c1 = card(main, 'What ChinaTalk talks about, by quarter',
    'Mentions per million words of the full newsletter corpus — including published podcast transcripts. Pick up to 8 topics or people.');
  const chips = document.createElement('div');
  c1.appendChild(chips);
  const box = document.createElement('div');
  c1.appendChild(box);

  function chipGroup(label, list) {
    const head = document.createElement('div');
    head.className = 'sub';
    head.style.margin = '8px 0 2px';
    head.textContent = label;
    chips.appendChild(head);
    for (const t of list) {
      const b = document.createElement('button');
      b.className = 'chip-toggle' + (termState.has(t.term) ? ' on' : '');
      const color = termState.has(t.term) ? cssVar(SLOTS[termState.get(t.term)]) : '';
      b.innerHTML = `<span class="dot"${color ? ` style="background:${color}"` : ''}></span>${esc(t.term)}`;
      b.addEventListener('click', () => {
        if (termState.has(t.term)) termState.delete(t.term);
        else {
          const slot = freeSlot();
          if (slot === null) return; // 8 series max
          termState.set(t.term, slot);
        }
        drawChips();
        drawLines();
      });
      chips.appendChild(b);
    }
  }
  function drawChips() {
    chips.innerHTML = '';
    chipGroup('Topics', L.terms);
    if (L.people && L.people.length) chipGroup('People', L.people);
  }

  function drawLines() {
    box.innerHTML = '';
    const sel = ALL.filter(t => termState.has(t.term));
    if (!sel.length) { box.innerHTML = '<p class="sub">Pick a term above.</p>'; return; }
    // the newsletter corpus only starts in late 2018 — clip empty quarters
    const i0 = Math.max(0, (L.words_per_quarter || []).findIndex(w => w >= 20000));
    const cqs = qs.slice(i0);
    const { svg, m, iw, ih } = makeSvg(box, 320, { right: 130 });
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);
    const x = d3.scaleTime().domain(d3.extent(cqs)).range([0, iw]);
    const maxV = d3.max(sel, t => d3.max(t.trend.slice(i0)));
    const y = d3.scaleLinear().domain([0, maxV]).nice().range([ih, 0]);
    gridLines(g, 0, iw, y);
    // light smoothing: 3-quarter centered mean keeps eras visible without noise
    const smooth = tr => tr.map((v, i) =>
      d3.mean(tr.slice(Math.max(0, i - 1), i + 2)));
    const endLabels = [];
    for (const t of sel) {
      const color = cssVar(SLOTS[termState.get(t.term)]);
      const vals = smooth(t.trend.slice(i0));
      const pts = vals.map((v, i) => ({ d: cqs[i], v }));
      g.append('path').datum(pts).attr('fill', 'none')
        .attr('stroke', color).attr('stroke-width', 2)
        .attr('d', d3.line().x(p => x(p.d)).y(p => y(p.v)).curve(d3.curveMonotoneX));
      endLabels.push({ term: t.term, color, y: y(vals[vals.length - 1]) });
    }
    // collision-relaxed end labels
    endLabels.sort((a, b) => a.y - b.y);
    for (let i = 1; i < endLabels.length; i++)
      if (endLabels[i].y - endLabels[i - 1].y < 14) endLabels[i].y = endLabels[i - 1].y + 14;
    for (const l of endLabels)
      g.append('text').attr('x', iw + 8).attr('y', l.y).attr('dominant-baseline', 'middle')
        .attr('fill', l.color).attr('font-size', 12).attr('font-weight', 600).text(l.term);
    axisStyle(g.append('g').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(x).ticks(7).tickSizeOuter(0)));
    axisStyle(g.append('g').call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('~s')).tickSizeOuter(0)));
    g.append('text').attr('x', -m.left + 4).attr('y', -2).attr('fill', cssVar('--text-muted'))
      .attr('font-size', 11).text('mentions per 1M words');
    svg.append('rect').attr('x', m.left).attr('y', m.top).attr('width', iw).attr('height', ih)
      .attr('fill', 'transparent')
      .on('mousemove', ev => {
        const date = x.invert(d3.pointer(ev, g.node())[0]);
        const ci = Math.min(cqs.length - 1, Math.max(0, d3.bisector(d => d).center(cqs, date)));
        const i = i0 + ci;
        showTip(`<div class="tt-title">${L.quarters[i].replace('-', ' ')}</div>` +
          sel.map(t => ttRow(cssVar(SLOTS[termState.get(t.term)]), t.term, fmtInt(t.trend[i]) + ' /1M')).join(''), ev);
      })
      .on('mouseleave', hideTip);
  }
  drawChips();
  drawLines();
  tableView(c1, ['Quarter', 'Corpus words', ...ALL.map(t => t.term)],
    L.quarters.map((q, i) => [q, fmtInt((L.words_per_quarter || [])[i] || 0),
      ...ALL.map(t => t.trend[i])]));

  const c2 = card(main, 'Most common words in episode titles',
    'Stopwords and the words “China/Chinese” excluded — this is a China show, after all.');
  {
    const words = L.title_words.slice(0, 25);
    const rowH = 21;
    const box2 = document.createElement('div');
    c2.appendChild(box2);
    const { svg, m, iw } = makeSvg(box2, words.length * rowH + 30, { left: 120, right: 46, top: 4, bottom: 22 });
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);
    const x = d3.scaleLinear().domain([0, d3.max(words, w => w.n)]).nice().range([0, iw]);
    const y = d3.scaleBand().domain(words.map(w => w.w)).range([0, words.length * rowH]).paddingInner(0.3);
    for (const w of words) {
      g.append('path').attr('d', roundRightRect(0, y(w.w), x(w.n), y.bandwidth(), 3))
        .attr('fill', cssVar('--series-1'))
        .on('mousemove', ev => showTip(`<div class="tt-title">“${esc(w.w)}”</div>` +
          ttRow(cssVar('--series-1'), 'title mentions', w.n), ev))
        .on('mouseleave', hideTip);
      g.append('text').attr('x', -8).attr('y', y(w.w) + y.bandwidth() / 2)
        .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
        .attr('fill', cssVar('--text-secondary')).attr('font-size', 12).text(w.w);
      g.append('text').attr('x', x(w.n) + 6).attr('y', y(w.w) + y.bandwidth() / 2)
        .attr('dominant-baseline', 'middle')
        .attr('fill', cssVar('--text-muted')).attr('font-size', 11).text(w.n);
    }
    axisStyle(g.append('g').attr('transform', `translate(0,${words.length * rowH})`)
      .call(d3.axisBottom(x).ticks(5).tickSizeOuter(0)));
  }

  method(main,
    `<li>Mentions are counted over the full text of every chinatalk.media post — ` +
    `including the podcast transcripts the team publishes — normalized per million words ` +
    `of that quarter’s corpus. Machine-generated Whisper transcripts of episodes without ` +
    `a published transcript are included where available. Paid-only posts contribute their free preview.</li>` +
    `<li>The corpus starts with the newsletter in late 2018; the podcast-only 2017–18 era ` +
    `has no text to mine, so the chart starts where the corpus does.</li>` +
    `<li>Lines are smoothed with a 3-quarter centered mean; tooltips show the raw quarterly rate.</li>`);
}

// ================================================================ REFERENCES

function renderReferences(main) {
  const R = S.references;
  const row = document.createElement('div');
  row.className = 'kpi-row';
  main.appendChild(row);
  kpi(row, 'Outbound links', fmtSI(R.total_links), `across ${fmtInt(R.posts_with_bodies)} posts`);
  kpi(row, 'Distinct sources shown', fmtInt(R.domains.length), 'most-cited domains');
  const perPost = R.total_links / Math.max(1, R.posts_with_bodies);
  kpi(row, 'Links per post', perPost.toFixed(1), 'on average');

  const c = card(main, 'Where ChinaTalk points its readers',
    'Domains most often linked from post bodies. “Links” counts every citation; “posts” counts how many posts cite the domain at least once.');
  const box = document.createElement('div');
  c.appendChild(box);
  {
    const domains = R.domains.slice(0, 30);
    const rowH = 21;
    const { svg, m, iw } = makeSvg(box, domains.length * rowH + 30, { left: 190, right: 56, top: 4, bottom: 22 });
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);
    const x = d3.scaleLinear().domain([0, d3.max(domains, d => d.links)]).nice().range([0, iw]);
    const y = d3.scaleBand().domain(domains.map(d => d.domain)).range([0, domains.length * rowH]).paddingInner(0.3);
    for (const d of domains) {
      g.append('path').attr('d', roundRightRect(0, y(d.domain), x(d.links), y.bandwidth(), 3))
        .attr('fill', cssVar('--series-1'))
        .on('mousemove', ev => showTip(`<div class="tt-title">${esc(d.domain)}</div>` +
          ttRow(cssVar('--series-1'), 'links', fmtInt(d.links)) +
          ttRow('transparent', 'citing posts', fmtInt(d.posts)), ev))
        .on('mouseleave', hideTip);
      g.append('text').attr('x', -8).attr('y', y(d.domain) + y.bandwidth() / 2)
        .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
        .attr('fill', cssVar('--text-secondary')).attr('font-size', 12).text(d.domain);
      g.append('text').attr('x', x(d.links) + 6).attr('y', y(d.domain) + y.bandwidth() / 2)
        .attr('dominant-baseline', 'middle')
        .attr('fill', cssVar('--text-muted')).attr('font-size', 11).text(fmtInt(d.links));
    }
    axisStyle(g.append('g').attr('transform', `translate(0,${domains.length * rowH})`)
      .call(d3.axisBottom(x).ticks(5).tickSizeOuter(0)));
  }
  tableView(c, ['Domain', 'Links', 'Citing posts'],
    R.domains.map(d => [d.domain, fmtInt(d.links), fmtInt(d.posts)]));

  method(main,
    `<li>Links are extracted from the HTML of every fetched post body; ` +
    `Substack plumbing (images, share links, chinatalk.media self-links) is excluded, ` +
    `but links to other Substack publications count.</li>` +
    `<li>Paid-only posts contribute links from their free preview only.</li>`);
}

// ================================================================ SEARCH

function renderSearch(main, q) {
  searchInput.value = q;
  const needle = q.toLowerCase();
  const snippet = (text) => {
    const i = text.toLowerCase().indexOf(needle);
    if (i < 0) return '';
    const start = Math.max(0, i - 60);
    const chunk = text.slice(start, i + needle.length + 90);
    return (start ? '…' : '') +
      esc(chunk).replace(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), m => `<mark>${m}</mark>`) + '…';
  };

  const eps = S.episodes.filter(e =>
    (e.title + ' ' + e.desc + ' ' + e.guests.join(' ')).toLowerCase().includes(needle));
  const posts = S.engagement.posts.filter(p => p.title.toLowerCase().includes(needle));

  const c = card(main, `Search: “${esc(q)}”`,
    `${fmtInt(eps.length)} episodes and ${fmtInt(posts.length)} posts match.`);

  if (eps.length) {
    c.insertAdjacentHTML('beforeend', `<div class="result-group"><h2>Episodes</h2></div>`);
    for (const e of eps.slice(0, 30)) {
      const link = e.post || e.link;
      c.insertAdjacentHTML('beforeend',
        `<div class="result-row">` +
        (link ? `<a href="${esc(link)}" target="_blank" rel="noopener">${esc(e.title)}</a>` : esc(e.title)) +
        ` <span class="where">episode · ${fmtDate(e.date)} · ${fmtDur(e.duration)}</span>` +
        `<p class="result-snippet">${snippet(e.title + ' — ' + e.desc)}</p></div>`);
    }
  }
  if (posts.length) {
    c.insertAdjacentHTML('beforeend', `<div class="result-group" style="margin-top:14px"><h2>Newsletter posts</h2></div>`);
    for (const p of posts.slice(0, 30)) {
      c.insertAdjacentHTML('beforeend',
        `<div class="result-row">` +
        `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title)}</a>` +
        ` <span class="where">post · ${fmtDate(p.date)} · ${fmtInt(p.likes)} likes</span></div>`);
    }
  }
  if (!eps.length && !posts.length) {
    c.insertAdjacentHTML('beforeend', `<p class="sub">Nothing found. Try a shorter query.</p>`);
  }
}
