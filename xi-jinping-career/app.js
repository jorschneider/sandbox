/* Paramount Leader — client-side career engine.
   All simulation runs locally; GAME_DATA is provided by content.js. */
(function () {
  'use strict';

  var DATA = window.GAME_DATA || {};
  var TOPICS = DATA.topics || {};
  var TONES = DATA.tones || { hardline: { keywords: [] }, reform: { keywords: [] } };
  var BANNED = DATA.banned || [];
  var PERSONAS = DATA.personas || [];
  var STAKEHOLDERS = DATA.stakeholders || [];
  var CORE_EVENTS = DATA.events || [];
  var SCENARIOS = DATA.scenarios || [];
  var MEDIA = DATA.media || {};
  var MARKETING = DATA.marketing || {};
  var ENDINGS = DATA.endings || [];
  var ACHIEVEMENTS = DATA.achievements || [];

  var TOTAL_TURNS = 20;
  var STAT_LABELS = {
    partyUnity: 'Party Unity',
    stability: 'Social Stability',
    economy: 'GDP Growth',
    intl: 'International Standing',
    power: 'Personal Power',
    approval: 'Approval (internal)'
  };

  var G = null; // active game state
  var gameCounter = 0; // increments each new game, so the Situation Room can reset relationships

  /* ---------------- utilities ---------------- */
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function showScreen(name) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) screens[i].classList.remove('active');
    $('screen-' + name).classList.add('active');
    window.scrollTo(0, 0);
  }
  function toast(msg) {
    var t = el('div', 'toast', msg);
    $('toasts').appendChild(t);
    setTimeout(function () { t.remove(); }, 5200);
  }

  /* ---------------- persistence (achievements only) ---------------- */
  function loadUnlocked() {
    try {
      var v = JSON.parse(localStorage.getItem('pl_achievements') || '[]');
      return Array.isArray(v) ? v : [];
    }
    catch (e) { return []; }
  }
  function saveUnlocked(ids) {
    try { localStorage.setItem('pl_achievements', JSON.stringify(ids)); } catch (e) { /* private mode */ }
  }

  /* ---------------- landing page ---------------- */
  function renderLanding() {
    var m = MARKETING;
    if (m.heroTagline) $('hero-tagline').innerHTML = esc(m.heroTagline) + '<sup>*</sup>';
    if (m.heroSub) $('hero-sub').textContent = m.heroSub;

    var fg = $('features-grid');
    (m.features || []).forEach(function (f) {
      var c = el('div', 'feature-card');
      c.appendChild(el('h3', null, esc(f.title)));
      c.appendChild(el('p', null, esc(f.body)));
      fg.appendChild(c);
    });

    var tg = $('testimonials-grid');
    (m.testimonials || []).forEach(function (t) {
      var c = el('div', 'testimonial-card');
      c.appendChild(el('div', 'stars', '★★★★★'));
      c.appendChild(el('blockquote', null, '&ldquo;' + esc(t.quote) + '&rdquo;'));
      c.appendChild(el('cite', null, '— ' + esc(t.author)));
      tg.appendChild(c);
    });

    var pg = $('pricing-grid');
    (m.pricing || []).forEach(function (p, i) {
      var c = el('div', 'pricing-card' + (i === (m.pricing.length - 1) ? ' featured' : ''));
      c.appendChild(el('h3', null, esc(p.name)));
      c.appendChild(el('div', 'price', esc(p.price)));
      var ul = el('ul');
      (p.perks || []).forEach(function (perk) { ul.appendChild(el('li', null, esc(perk))); });
      c.appendChild(ul);
      pg.appendChild(c);
    });

    var fl = $('faq-list');
    (m.faq || []).forEach(function (f) {
      var c = el('div', 'faq-item');
      c.appendChild(el('h3', null, esc(f.q)));
      c.appendChild(el('p', null, esc(f.a)));
      fl.appendChild(c);
    });

    $('disclaimer').innerHTML = esc(m.disclaimer || 'Parody. Satire. Fiction.') +
      '<br>All simulation runs in your browser. No gameplay data leaves this page &mdash; the fonts, regrettably, arrive from Google.';
  }

  /* ---------------- scenario select ---------------- */
  function renderScenarios() {
    var grid = $('scenario-grid');
    grid.innerHTML = '';
    SCENARIOS.forEach(function (s) {
      var card = el('button', 'scenario-card');
      var dclass = s.difficulty === 'Very Hard' ? 'd-veryhard' : (s.difficulty === 'Hard' ? 'd-hard' : '');
      card.appendChild(el('div', 'scenario-year', esc(s.year)));
      card.appendChild(el('h3', null, esc(s.title)));
      card.appendChild(el('div', 'scenario-tagline', esc(s.tagline)));
      card.appendChild(el('div', 'scenario-blurb', esc(s.blurb)));
      card.appendChild(el('div', 'scenario-difficulty ' + dclass, esc(s.difficulty)));
      card.addEventListener('click', function () { startGame(s); });
      grid.appendChild(card);
    });
  }

  /* ---------------- game state ---------------- */
  function startGame(scenario) {
    var support = {};
    STAKEHOLDERS.forEach(function (s) { support[s.id] = s.startSupport; });
    G = {
      id: ++gameCounter,
      scenario: scenario,
      turn: 0,
      stats: {
        partyUnity: scenario.stats.partyUnity,
        stability: scenario.stats.stability,
        economy: scenario.stats.economy,
        intl: scenario.stats.intl,
        power: scenario.stats.power,
        approval: scenario.stats.approval
      },
      support: support,
      usedEvents: {},
      streakTopic: null,
      streakN: 0,
      vagueStreak: 0,
      counters: { hardline: 0, reform: 0, vague: 0, harmonized: 0, pd: 0, policies: 0 },
      unlocked: loadUnlocked(),
      sessionUnlocks: [],
      log: [],
      over: false
    };
    $('tb-scenario').textContent = scenario.title;
    $('results-feed').innerHTML = '';
    $('timeline').innerHTML = '';
    $('policy-input').value = '';
    $('charcount').textContent = '0';
    renderStats();
    renderStakeholders();
    renderAchievements();
    showScreen('game');
    nextTurn();
  }

  function dateLabel(turn) {
    var year = G.scenario.year + Math.floor(turn / 4);
    return 'Q' + (turn % 4 + 1) + ' ' + year;
  }

  function drawEvent() {
    var pool = (G.scenario.events || []).concat(CORE_EVENTS).filter(function (e) {
      return !G.usedEvents[e.id] && (e.minTurn || 0) <= G.turn;
    });
    if (!pool.length) { G.usedEvents = {}; pool = CORE_EVENTS.slice(); }
    var total = 0;
    pool.forEach(function (e) { total += (e.weight || 1); });
    var r = Math.random() * total;
    for (var i = 0; i < pool.length; i++) {
      r -= (pool[i].weight || 1);
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  function nextTurn() {
    var ev = drawEvent();
    G.usedEvents[ev.id] = true;
    G.currentEvent = ev;
    $('tb-date').textContent = dateLabel(G.turn) + ' · Turn ' + (G.turn + 1) + ' / ' + TOTAL_TURNS;
    $('brief-date').textContent = dateLabel(G.turn);
    $('brief-title').textContent = ev.title;
    $('brief-text').textContent = ev.briefing;
    var chips = $('brief-chips');
    chips.innerHTML = '';
    (ev.topics || []).forEach(function (tid) {
      var t = TOPICS[tid];
      if (!t) return;
      var chip = el('button', 'chip', '✎ ' + esc(t.label));
      chip.addEventListener('click', function () {
        var kws = t.keywords || [];
        $('policy-input').value = 'Launch a sweeping national campaign on ' + t.label.toLowerCase() +
          ', with decisive measures on ' + (kws[0] || t.label.toLowerCase()) +
          (kws[1] ? ' and ' + kws[1] : '') + '.';
        $('charcount').textContent = String($('policy-input').value.length);
        $('policy-input').focus();
      });
      chips.appendChild(chip);
    });
  }

  /* ---------------- policy analysis ---------------- */
  function countHits(lower, keywords) {
    var hits = 0;
    (keywords || []).forEach(function (kw) { if (lower.indexOf(kw) !== -1) hits++; });
    return hits;
  }

  function analyze(text) {
    var lower = text.toLowerCase();

    for (var b = 0; b < BANNED.length; b++) {
      if (lower.indexOf(BANNED[b]) !== -1) return { harmonized: true, topics: [], tone: 'neutral', vague: false };
    }

    var scored = [];
    Object.keys(TOPICS).forEach(function (tid) {
      var hits = countHits(lower, TOPICS[tid].keywords);
      if (hits > 0) scored.push({ id: tid, hits: hits });
    });
    scored.sort(function (a, b2) { return b2.hits - a.hits; });
    var topics = scored.slice(0, 2).map(function (s) { return s.id; });

    var hard = countHits(lower, TONES.hardline.keywords);
    var reform = countHits(lower, TONES.reform.keywords);
    var tone = 'neutral';
    if (hard > reform && hard > 0) tone = 'hardline';
    else if (reform > hard && reform > 0) tone = 'reform';

    var vague = text.trim().length < 40 || topics.length === 0;
    return { harmonized: false, topics: topics, tone: tone, vague: vague };
  }

  function applyDeltas(analysis) {
    var d = { partyUnity: 0, stability: 0, economy: 0, intl: 0, power: 0, approval: 0 };
    var KEYMAP = { partyUnity: 'partyUnity', stability: 'stability', economy: 'economy', intl: 'intl', power: 'power', approval: 'approval' };

    function add(deltas, weight) {
      if (!deltas) return;
      Object.keys(KEYMAP).forEach(function (k) {
        if (typeof deltas[k] === 'number') d[k] += Math.round(deltas[k] * weight);
      });
    }

    if (analysis.harmonized) {
      d.stability += 1; d.intl -= 2; d.approval -= 1; d.power += 1;
      analysis.relevant = false;
    } else {
      analysis.topics.forEach(function (tid, i) {
        var t = TOPICS[tid];
        if (!t) return;
        var w = i === 0 ? 1 : 0.5;
        // the Politburo tires of the same speech
        if (i === 0 && analysis.fatigue === 1) w = 0.5;
        if (i === 0 && analysis.fatigue >= 2) w = 0;
        add(t.deltas, w);
        if (analysis.tone === 'hardline') add(t.hardline, w);
        if (analysis.tone === 'reform') add(t.reform, w);
      });
      if (analysis.fatigue >= 2) { d.partyUnity -= 1; d.approval -= 2; }
      if (analysis.vague) { d.approval -= 2; d.partyUnity -= Math.min(G.vagueStreak, 6); }
      var evTopics = G.currentEvent.topics || [];
      analysis.relevant = !analysis.vague && analysis.topics.some(function (tid) { return evTopics.indexOf(tid) !== -1; });
    }

    // an unaddressed crisis festers, faster on harder scenarios
    var pressure = { 'Standard': 1, 'Hard': 2, 'Very Hard': 3 }[G.scenario.difficulty] || 1;
    if (analysis.relevant) { d.stability += 1; d.approval += 1; }
    else { d.stability -= pressure; d.approval -= Math.ceil(pressure / 2); }

    // a little chaos, as history demands
    var keys = Object.keys(d);
    d[pick(keys)] += 1;
    d[pick(keys)] -= 1;

    Object.keys(d).forEach(function (k) {
      var eff = d[k];
      // triumph has diminishing returns, and the summit is windy
      if (eff > 0) {
        if (G.stats[k] >= 95) eff = 0;
        else if (G.stats[k] >= 85) eff = Math.ceil(eff / 2);
      }
      if (G.stats[k] >= 92) eff -= 1;
      d[k] = eff;
      G.stats[k] = clamp(G.stats[k] + eff, k === 'economy' ? -20 : 0, 100);
    });
    return d;
  }

  function updateStakeholders(analysis) {
    var shifts = [];
    if (analysis.harmonized || !analysis.topics.length) return shifts;
    STAKEHOLDERS.forEach(function (s) {
      var delta = 0;
      analysis.topics.forEach(function (tid, i) {
        var aff = (s.affinities || {})[tid];
        if (typeof aff === 'number') delta += Math.round(aff * 3 * (i === 0 ? 1 : 0.5));
      });
      if (delta !== 0) {
        G.support[s.id] = clamp(G.support[s.id] + delta, 0, 100);
        shifts.push({ s: s, delta: delta });
      }
    });
    shifts.sort(function (a, b) { return Math.abs(b.delta) - Math.abs(a.delta); });
    return shifts;
  }

  function personaReactions(analysis) {
    if (analysis.harmonized || !analysis.topics.length) {
      return shuffle(PERSONAS).slice(0, 3).map(function (p) {
        return { p: p, mood: 'neutral', quip: pick((p.quips || {}).neutral || ['…']) };
      });
    }
    var reactions = [];
    var engaged = [];
    PERSONAS.forEach(function (p) {
      var aff = 0;
      analysis.topics.forEach(function (tid) {
        var a = (p.affinities || {})[tid];
        if (typeof a === 'number' && Math.abs(a) > Math.abs(aff)) aff = a;
      });
      if (aff !== 0) engaged.push({ p: p, aff: aff });
    });
    shuffle(engaged).slice(0, 4).forEach(function (e) {
      var mood = e.aff > 0 ? 'approve' : 'disapprove';
      reactions.push({ p: e.p, mood: mood, quip: pick((e.p.quips || {})[mood] || ['…']) });
    });
    var neutralPool = PERSONAS.filter(function (p) {
      return !reactions.some(function (r) { return r.p.id === p.id; });
    });
    if (neutralPool.length) {
      var np = pick(neutralPool);
      reactions.push({ p: np, mood: 'neutral', quip: pick((np.quips || {}).neutral || ['…']) });
    }
    return reactions;
  }

  function headlines(analysis) {
    var key = (!analysis.harmonized && analysis.topics.length) ? analysis.topics[0] : 'generic';
    var m = MEDIA[key] || MEDIA.generic || {};
    G.counters.pd++;
    return {
      pd: pick(m.peoples_daily || ['Nation Advances From Victory To Victory']),
      gt: pick(m.global_times || ['Foreign Forces Advised To Reflect Deeply On Their Conduct']),
      west: pick(m.western || ['Analysts Puzzled, Again'])
    };
  }

  /* ---------------- achievements ---------------- */
  function checkAchievements(endingCondition, congressTier) {
    var c = G.counters, s = G.stats;
    var allLow = STAKEHOLDERS.length > 0 && STAKEHOLDERS.every(function (st) { return G.support[st.id] < 30; });
    var fired = {
      first_policy: c.policies >= 1,
      power90: s.power >= 90,
      approval_real_below40: s.approval < 40,
      all_stakeholders_below30: allLow,
      harmonized3: c.harmonized >= 3,
      hardline10: c.hardline >= 10,
      reform10: c.reform >= 10,
      gdp_negative: endingCondition === 'collapse',
      vague3: c.vague >= 3,
      peoples_daily_20: c.pd >= 20,
      survive_zero2022: G.scenario.id === 'zero2022' && /^congress/.test(endingCondition || ''),
      win_strait2027: G.scenario.id === 'strait2027' && (congressTier === 'congress_great' || congressTier === 'congress_good')
    };
    ACHIEVEMENTS.forEach(function (a) {
      if (fired[a.trigger] && G.unlocked.indexOf(a.id) === -1) {
        G.unlocked.push(a.id);
        G.sessionUnlocks.push(a.id);
        toast('🏅 Achievement unlocked: <b>' + esc(a.name) + '</b> — ' + esc(a.desc));
      }
    });
    saveUnlocked(G.unlocked);
    renderAchievements();
  }

  /* ---------------- endings ---------------- */
  function endingFor(cond) {
    return ENDINGS.filter(function (e) { return e.condition === cond; })[0] || {
      title: 'History Will Judge (Favorably, It Has Been Decided)',
      text: 'Your term ends. The record of it is being edited as you read this.',
      condition: cond
    };
  }

  function checkGameOver() {
    var s = G.stats;
    if (s.partyUnity < 20) return endingFor('purged');
    if (s.stability < 15) return endingFor('uprising');
    if (s.economy <= 5) return endingFor('collapse');
    if (s.intl < 10) return endingFor('warlost');
    if (G.turn >= TOTAL_TURNS) {
      var econScore = clamp(s.economy, 0, 100);
      var score = 0.25 * s.partyUnity + 0.2 * s.stability + 0.2 * econScore +
        0.15 * s.intl + 0.1 * s.power + 0.1 * s.approval;
      var tier = score >= 70 ? 'congress_great' : score >= 55 ? 'congress_good' :
        score >= 40 ? 'congress_ok' : 'congress_bad';
      // the Congress notices your weakest number, even if you hoped it wouldn't
      var weakest = Math.min(s.partyUnity, s.stability, econScore, s.intl, s.power, s.approval);
      if (weakest < 25 && (tier === 'congress_great' || tier === 'congress_good')) tier = 'congress_ok';
      return endingFor(tier);
    }
    return null;
  }

  function officialApproval() {
    var off = clamp(Math.max(G.stats.approval, 89) + ((G.turn * 7) % 10) / 10, 89, 99.9);
    return off.toFixed(1);
  }

  function endGame(ending) {
    G.over = true;
    checkAchievements(ending.condition, ending.condition);
    $('end-date').textContent = dateLabel(Math.max(G.turn - 1, 0));
    $('end-title').textContent = ending.title;
    $('end-text').textContent = ending.text;

    var st = $('end-stats');
    st.innerHTML = '<h3>Final ledger (internal copy — destroy after reading)</h3>';
    var table = el('table');
    var rows = [
      ['Quarters served', String(Math.min(G.turn, TOTAL_TURNS)) + ' / ' + TOTAL_TURNS],
      ['Official approval', officialApproval() + '%'],
      ['Actual approval', G.stats.approval + '% (this row does not exist)'],
      ['Party Unity', G.stats.partyUnity + '/100'],
      ['Social Stability', G.stats.stability + '/100'],
      ['GDP growth', (G.stats.economy / 10).toFixed(1) + '%'],
      ['International Standing', G.stats.intl + '/100'],
      ['Personal Power', G.stats.power + '/100'],
      ['Directives harmonized', String(G.counters.harmonized)]
    ];
    rows.forEach(function (r) {
      var tr = el('tr');
      tr.appendChild(el('td', null, esc(r[0])));
      tr.appendChild(el('td', null, esc(r[1])));
      table.appendChild(tr);
    });
    st.appendChild(table);

    var ac = $('end-achievements');
    if (G.sessionUnlocks.length) {
      ac.style.display = '';
      ac.innerHTML = '<h3>Decorations conferred this term</h3>';
      G.sessionUnlocks.forEach(function (id) {
        var a = ACHIEVEMENTS.filter(function (x) { return x.id === id; })[0];
        if (a) ac.appendChild(el('div', null, (a.emoji || '🏅') + ' <b>' + esc(a.name) + '</b> — ' + esc(a.desc)));
      });
    } else {
      ac.style.display = 'none';
    }
    $('end-disclaimer').textContent = MARKETING.disclaimer || 'Parody. Satire. Fiction.';
    showScreen('end');
  }

  /* ---------------- rendering ---------------- */
  function renderStats() {
    var panel = $('stats-panel');
    panel.innerHTML = '';
    [
      ['partyUnity', G.stats.partyUnity, G.stats.partyUnity + '/100'],
      ['stability', G.stats.stability, G.stats.stability + '/100'],
      ['economy', clamp(G.stats.economy, 0, 100), (G.stats.economy / 10).toFixed(1) + '%'],
      ['intl', G.stats.intl, G.stats.intl + '/100'],
      ['power', G.stats.power, G.stats.power + '/100']
    ].forEach(function (row) {
      var bar = el('div', 'statbar');
      bar.appendChild(el('div', 'label', '<span>' + esc(STAT_LABELS[row[0]]) + '</span><b>' + esc(row[2]) + '</b>'));
      var track = el('div', 'track');
      var cls = row[1] < 30 ? ' low' : row[1] > 70 ? ' high' : '';
      var fill = el('div', 'fill' + cls);
      fill.style.width = clamp(row[1], 0, 100) + '%';
      track.appendChild(fill);
      bar.appendChild(track);
      panel.appendChild(bar);
    });
    $('internal-approval').innerHTML = 'Internal poll (do not circulate): <b>' + G.stats.approval +
      '%</b>. The official figure remains <b>' + officialApproval() + '%</b>, as it always has.';
    $('tb-approval').textContent = officialApproval() + '%';
    $('tb-gdp').textContent = (G.stats.economy / 10).toFixed(1) + '%';
  }

  function renderStakeholders() {
    var grid = $('stakeholder-grid');
    grid.innerHTML = '';
    STAKEHOLDERS.forEach(function (s) {
      var v = G.support[s.id];
      var cls = v >= 60 ? ' s-happy' : v < 35 ? ' s-angry' : '';
      var d = el('div', 'stakeholder' + cls,
        '<span>' + esc(s.emoji || '▪') + '</span><span>' + esc(s.name) + '</span><span class="pct">' + v + '</span>');
      d.title = s.blurb || '';
      grid.appendChild(d);
    });
  }

  function renderAchievements() {
    var list = $('achievements-list');
    list.innerHTML = '';
    var unlocked = G ? G.unlocked : loadUnlocked();
    ACHIEVEMENTS.forEach(function (a) {
      var got = unlocked.indexOf(a.id) !== -1;
      var d = el('div', 'ach' + (got ? ' unlocked' : ''),
        '<span>' + esc(a.emoji || '🏅') + '</span><span><span class="ach-name">' + esc(a.name) +
        '</span> <span class="ach-desc">' + esc(got ? a.desc : '???') + '</span></span>');
      list.appendChild(d);
    });
  }

  function harmonizeText(text) {
    return text.replace(/[^\s]/g, '▓').slice(0, 120);
  }

  function renderResult(text, analysis, deltas, shifts, reactions, heads, outcome, advisor) {
    var card = el('div', 'card result-card');
    card.appendChild(el('div', 'card-kicker', 'DIRECTIVE ISSUED · ' + esc(dateLabel(G.turn)) +
      ' · RE: ' + esc(G.currentEvent.title)));

    if (analysis.harmonized) {
      card.appendChild(el('div', 'result-policy harmonized', esc(harmonizeText(text))));
      card.appendChild(el('div', 'harmonize-note',
        '⚠ This directive has been harmonized by the Cyberspace Administration of China. Officially, you never said it. Unofficially, everyone is talking about it.'));
    } else {
      card.appendChild(el('div', 'result-policy', '&ldquo;' + esc(text) + '&rdquo;'));
    }

    card.appendChild(el('p', 'result-outcome', esc(outcome)));
    if (advisor) card.appendChild(el('p', 'advisor', esc(advisor)));

    var dr = el('div', 'delta-row');
    Object.keys(deltas).forEach(function (k) {
      if (!deltas[k]) return;
      var up = deltas[k] > 0;
      dr.appendChild(el('span', 'delta ' + (up ? 'up' : 'down'),
        esc(STAT_LABELS[k]) + ' ' + (up ? '+' : '') + deltas[k]));
    });
    if (dr.children.length) card.appendChild(dr);

    if (reactions.length) {
      card.appendChild(el('div', 'result-section-title', 'Focus group (pre-screened, still unpredictable)'));
      var pr = el('div', 'persona-row');
      reactions.forEach(function (r) {
        var mood = r.mood === 'approve' ? '👍' : r.mood === 'disapprove' ? '👎' : '😐';
        pr.appendChild(el('div', 'persona-react',
          '<span class="mood">' + mood + '</span><span class="who">' + esc(r.p.emoji || '') + ' ' +
          esc(r.p.name) + ':</span><span>&ldquo;' + esc(r.quip) + '&rdquo;</span>'));
      });
      card.appendChild(pr);
    }

    card.appendChild(el('div', 'result-section-title', 'Tomorrow’s front pages'));
    var papers = el('div', 'papers');
    papers.appendChild(el('div', 'paper pd', '<div class="paper-name">People’s Daily</div><div class="headline">' + esc(heads.pd) + '</div>'));
    papers.appendChild(el('div', 'paper gt', '<div class="paper-name">Global Times</div><div class="headline">' + esc(heads.gt) + '</div>'));
    papers.appendChild(el('div', 'paper west', '<div class="paper-name">Western Observer</div><div class="headline">' + esc(heads.west) + '</div>'));
    card.appendChild(papers);

    if (shifts.length) {
      card.appendChild(el('div', 'result-section-title', 'Power-bloc reactions'));
      var sr = el('div', 'delta-row');
      shifts.slice(0, 6).forEach(function (sh) {
        var up = sh.delta > 0;
        sr.appendChild(el('span', 'delta ' + (up ? 'up' : 'down'),
          esc((sh.s.emoji || '') + ' ' + sh.s.name) + ' ' + (up ? '+' : '') + sh.delta));
      });
      card.appendChild(sr);
    }

    var feed = $('results-feed');
    feed.insertBefore(card, feed.firstChild);
    while (feed.children.length > 6) feed.removeChild(feed.lastChild);
  }

  /* ---------------- turn submission ---------------- */
  function issueDirective() {
    if (!G || G.over) return;
    var input = $('policy-input');
    var text = input.value.trim();
    if (!text) {
      toast('The ministries await a directive. Silence is a policy, but not a good one.');
      return;
    }

    var analysis = analyze(text);
    G.counters.policies++;
    if (analysis.harmonized) G.counters.harmonized++;
    if (analysis.tone === 'hardline') G.counters.hardline++;
    if (analysis.tone === 'reform') G.counters.reform++;
    if (!analysis.harmonized && !analysis.topics.length) G.counters.vague++;

    var primary = analysis.harmonized ? null : (analysis.topics[0] || null);
    if (primary && primary === G.streakTopic) G.streakN++;
    else { G.streakTopic = primary; G.streakN = primary ? 1 : 0; }
    analysis.fatigue = G.streakN >= 3 ? 2 : G.streakN === 2 ? 1 : 0;
    G.vagueStreak = (!analysis.harmonized && analysis.vague) ? G.vagueStreak + 1 : 0;

    var deltas = applyDeltas(analysis);
    var shifts = updateStakeholders(analysis);
    var reactions = personaReactions(analysis);
    var heads = headlines(analysis);

    var outcome, advisor = '';
    if (analysis.harmonized) {
      outcome = 'The directive was intercepted before it reached a single ministry. A polite note suggests you rest.';
    } else if (analysis.vague && !analysis.topics.length) {
      outcome = 'Vague waffle won’t move the Politburo. The ministries file your directive under “inspirational” and do nothing.';
      advisor = 'Tremendously visionary, Chairman. Which ministry should ignore it first?';
    } else {
      var t0 = TOPICS[analysis.topics[0]];
      outcome = pick(t0.outcomes || ['The machinery of state lurches into motion.']);
      if (analysis.vague) outcome += ' (The Politburo noted a certain vagueness. It has been minuted.)';
      advisor = t0.advisor || '';
      if (analysis.fatigue >= 2) {
        outcome += ' The Politburo has heard this speech before; attention drifts to teacups.';
      }
      if (analysis.relevant === false) {
        outcome += ' Meanwhile, the matter in your briefing remains magnificently unaddressed.';
      }
    }

    var topicNote = analysis.harmonized ? 'harmonized'
      : analysis.topics.length ? analysis.topics.map(function (tid) { return TOPICS[tid] ? TOPICS[tid].label : tid; }).join(', ')
        : 'waffle';
    G.log.push({ date: dateLabel(G.turn), note: G.currentEvent.title + ' → ' + topicNote });
    var tl = $('timeline');
    var li = el('li', null, '<span class="tl-date">' + esc(dateLabel(G.turn)) + '</span>' +
      esc(G.currentEvent.title + ' → ' + topicNote));
    tl.insertBefore(li, tl.firstChild);

    renderResult(text, analysis, deltas, shifts, reactions, heads, outcome, advisor);
    renderStats();
    renderStakeholders();

    input.value = '';
    $('charcount').textContent = '0';

    G.turn++;
    var ending = checkGameOver();
    checkAchievements(ending ? ending.condition : null, ending ? ending.condition : null);
    if (ending) { endGame(ending); return; }
    nextTurn();
  }

  /* ---------------- share ---------------- */
  function shareResult() {
    var text = 'I served ' + Math.min(G.turn, TOTAL_TURNS) + ' quarters as Paramount Leader. Official approval: ' +
      officialApproval() + '%. Verdict: "' + $('end-title').textContent + '" — ' + location.href.split('#')[0];
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast('Result copied to clipboard. Distribution of unauthorized results is, of course, unauthorized.');
      }, function () { toast('The clipboard has declined your request. It happens to everyone.'); });
    } else {
      toast('The clipboard has declined your request. It happens to everyone.');
    }
  }

  /* ---------------- wiring ---------------- */
  function init() {
    renderLanding();
    renderScenarios();

    $('btn-start').addEventListener('click', function () { showScreen('select'); });
    $('btn-start-2').addEventListener('click', function () { showScreen('select'); });
    document.querySelectorAll('[data-nav]').forEach(function (b) {
      b.addEventListener('click', function () { showScreen(b.getAttribute('data-nav')); });
    });
    $('btn-issue').addEventListener('click', issueDirective);
    $('policy-input').addEventListener('input', function () {
      $('charcount').textContent = String($('policy-input').value.length);
    });
    $('policy-input').addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') issueDirective();
    });
    $('btn-replay').addEventListener('click', function () { showScreen('select'); });
    $('btn-share').addEventListener('click', shareResult);
  }

  // ---------------- integration API for the Situation Room (situation.js) ----------------
  window.PARAMOUNT = {
    active: function () { return !!(G && !G.over); },
    gameId: function () { return G ? G.id : 0; },
    snapshot: function () {
      if (!G) return null;
      return {
        scenario: G.scenario.title,
        date: dateLabel(G.turn),
        turn: G.turn,
        stats: {
          partyUnity: G.stats.partyUnity,
          stability: G.stats.stability,
          economy: (G.stats.economy / 10),
          intl: G.stats.intl,
          power: G.stats.power,
          approval: G.stats.approval
        }
      };
    },
    // Apply Situation-Room outcomes to the game-level stats. Accepts the same delta keys
    // the engine tracks (economy here is in whole points, matching internal scale).
    applyDeltas: function (obj) {
      if (!G || G.over || !obj) return {};
      var applied = {};
      Object.keys(obj).forEach(function (k) {
        if (!STAT_LABELS[k] && k !== 'economy') return;
        var v = Math.round(Number(obj[k]) || 0);
        if (!v) return;
        G.stats[k] = clamp(G.stats[k] + v, k === 'economy' ? -20 : 0, 100);
        applied[k] = v;
      });
      renderStats();
      return applied;
    },
    toast: toast,
    STAT_LABELS: STAT_LABELS
  };

  document.addEventListener('DOMContentLoaded', init);
})();
