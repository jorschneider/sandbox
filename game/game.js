// ============================================================
//  BROKER BATTLE — game controller
//  Modes: Versus+Steal · Co-op Boss · Reflex Duel · Quizmaster
// ============================================================
import { QUESTIONS, CATEGORIES } from "./questions.js";
import { resume as audioResume, toggleMuted, isMuted, setMuted, sfx } from "./audio.js";
import * as FX from "./fx.js";

const $ = (id) => document.getElementById(id);
const shuffle = (a) => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [x[i], x[j]] = [x[j], x[i]]; } return x; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const AVATARS = ["🦊", "🦉", "🐼", "🐯", "🐸", "🦄", "🐙", "🦖", "🐲", "🦅", "🐱", "🐶", "🦝", "🐢", "🦈", "🐝"];

// ============================================================
//  PERSISTENCE — names, avatars, settings, series & topic mastery
// ============================================================
const SKEY = "brokerBattle.v1";
const store = {
  data: {
    names: ["Jordan", "Athena"], avatars: ["🦊", "🦉"],
    rounds: 8, time: 20, cats: null, muted: false,
    series: { p0: 0, p1: 0, ties: 0 },     // head-to-head (versus/duel/host)
    boss: { won: 0, lost: 0 },             // co-op record vs The Examiner
    topic: {},                             // cat -> { seen, correct }
  },
  load() {
    try { const raw = localStorage.getItem(SKEY); if (raw) Object.assign(this.data, JSON.parse(raw)); }
    catch (e) {}
    return this.data;
  },
  save() { try { localStorage.setItem(SKEY, JSON.stringify(this.data)); } catch (e) {} },
  recordTopic(cat, correct) {
    const t = this.data.topic[cat] || (this.data.topic[cat] = { seen: 0, correct: 0 });
    t.seen++; if (correct) t.correct++; this.save();
  },
  recordSeries(winnerIdx) { // 0, 1, or -1 for tie
    if (winnerIdx === 0) this.data.series.p0++;
    else if (winnerIdx === 1) this.data.series.p1++;
    else this.data.series.ties++;
    this.save();
  },
  recordBoss(won) { won ? this.data.boss.won++ : this.data.boss.lost++; this.save(); },
};

// ---------- config ----------
const cfg = {
  names: ["Jordan", "Athena"],
  avatars: ["🦊", "🦉"],
  rounds: 8,
  time: 20,
  cats: new Set(Object.keys(CATEGORIES)),
  diff: "mixed",   // "mixed" (all) | "hard" (drop easy — med+hard only)
  mode: "versus",
};
const DIFF_POINTS = { easy: 90, med: 110, hard: 140 };
const DIFF_DMG = { easy: 8, med: 12, hard: 18 };

// ---------- shared match state ----------
let queue = [], qIndex = 0, answered = false, curQ = null, curOrder = null;
let timerId = null, timeLeft = 0;

// ============================================================
//  HOME / SETUP
// ============================================================
function buildCatChips() {
  const wrap = $("cats"); wrap.innerHTML = "";
  const all = document.createElement("button");
  all.className = "chip all"; all.textContent = "All topics"; all.setAttribute("aria-pressed", "true");
  all.onclick = () => {
    const on = all.getAttribute("aria-pressed") !== "true";
    all.setAttribute("aria-pressed", String(on));
    cfg.cats = new Set(on ? Object.keys(CATEGORIES) : []);
    syncChips(); persistCfg(); sfx.tap();
  };
  wrap.appendChild(all);
  for (const [key, c] of Object.entries(CATEGORIES)) {
    const b = document.createElement("button");
    b.className = "chip"; b.dataset.cat = key; b.style.color = c.color;
    b.setAttribute("aria-pressed", "true");
    b.innerHTML = `<span class="dot" style="background:${c.color}"></span>${c.name}`;
    b.onclick = () => { cfg.cats.has(key) ? cfg.cats.delete(key) : cfg.cats.add(key); syncChips(); persistCfg(); sfx.tap(); };
    wrap.appendChild(b);
  }
}
function syncChips() {
  for (const b of $("cats").querySelectorAll(".chip[data-cat]"))
    b.setAttribute("aria-pressed", String(cfg.cats.has(b.dataset.cat)));
  $("cats").querySelector(".chip.all").setAttribute("aria-pressed", String(cfg.cats.size === Object.keys(CATEGORIES).length));
}
function wireSegments() {
  $("rounds").querySelectorAll("button").forEach((b) => b.onclick = () => {
    $("rounds").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false"));
    b.setAttribute("aria-pressed", "true"); cfg.rounds = +b.dataset.rounds; persistCfg(); sfx.tap();
  });
  $("timer").querySelectorAll("button").forEach((b) => b.onclick = () => {
    $("timer").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false"));
    b.setAttribute("aria-pressed", "true"); cfg.time = +b.dataset.time; persistCfg(); sfx.tap();
  });
  $("diffSel").querySelectorAll("button").forEach((b) => b.onclick = () => {
    $("diffSel").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false"));
    b.setAttribute("aria-pressed", "true"); cfg.diff = b.dataset.diff; persistCfg(); sfx.tap();
  });
}
function wireAvatars() {
  const cycle = (i, el) => {
    let idx = AVATARS.indexOf(cfg.avatars[i]);
    idx = (idx + 1) % AVATARS.length;
    // skip the other player's avatar
    if (AVATARS[idx] === cfg.avatars[1 - i]) idx = (idx + 1) % AVATARS.length;
    cfg.avatars[i] = AVATARS[idx]; el.textContent = AVATARS[idx];
    persistCfg(); FX.burstAt(el, i === 0 ? "p1" : "p2", 14); sfx.select();
  };
  $("av1").onclick = () => cycle(0, $("av1"));
  $("av2").onclick = () => cycle(1, $("av2"));
}

function readNames() {
  cfg.names[0] = ($("in-name1").value.trim() || "Jordan").slice(0, 14);
  cfg.names[1] = ($("in-name2").value.trim() || "Athena").slice(0, 14);
}

// ============================================================
//  QUEUE BUILDING
// ============================================================
function buildQueue(count) {
  if (cfg.cats.size === 0) { cfg.cats = new Set(Object.keys(CATEGORIES)); syncChips(); }
  let pool = QUESTIONS.filter((q) => cfg.cats.has(q.cat));
  if (cfg.diff === "hard") {
    const hardPool = pool.filter((q) => q.d === "hard" || q.d === "med");
    if (hardPool.length >= Math.min(count, 6)) pool = hardPool; // only apply if enough remain
  }
  let picked = shuffle(pool).slice(0, count);
  while (picked.length < count && pool.length) picked = picked.concat(shuffle(pool)).slice(0, count);
  return picked;
}

// ============================================================
//  SCREEN ROUTING
// ============================================================
function show(name) {
  ["home", "play", "duel", "end", "reviewScreen"].forEach((s) => $(s).classList.toggle("hidden", s !== name));
  $("brand").classList.toggle("hidden", name === "duel");
  if (name === "home") renderHomeStats();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function toMenu() { clearTimer(); show("home"); sfx.tap(); }

// ============================================================
//  MODE DISPATCH
// ============================================================
function startMode(mode) {
  readNames(); persistCfg();
  cfg.mode = mode;
  audioResume();
  sfx.go();
  if (mode === "versus") startVersus();
  else if (mode === "coop") startCoop();
  else if (mode === "duel") startDuel();
  else if (mode === "host") startHost();
}

// ============================================================
//  SHARED QUIZ RENDER (versus / coop / host)
// ============================================================
function setHud(mode) {
  $("hud-versus").classList.toggle("hidden", mode !== "versus");
  $("hud-coop").classList.toggle("hidden", mode !== "coop");
  $("vbar").classList.toggle("hidden", mode !== "versus");
  $("cbar").classList.toggle("hidden", mode !== "coop");
  $("hostControls").classList.toggle("hidden", mode !== "host");
}

function renderQuestionCommon(q, { interactive = true } = {}) {
  curQ = q; answered = false; clearTimer();
  const cat = CATEGORIES[q.cat];
  $("qcount").textContent = `Q ${qIndex + 1} / ${queue.length}`;
  const pill = $("catPill"); pill.textContent = cat.name; pill.style.background = cat.color;
  const dp = $("diffPill");
  if (q.d) { dp.className = "diff-pill " + q.d; dp.textContent = { easy: "Easy", med: "Medium", hard: "Hard" }[q.d]; dp.classList.remove("hidden"); }
  else dp.classList.add("hidden");
  const qt = $("qtext"); qt.textContent = q.q;
  qt.classList.remove("pop"); void qt.offsetWidth; qt.classList.add("pop");

  curOrder = shuffle(q.choices.map((c, i) => ({ c, i })));
  const ans = $("answers"); ans.innerHTML = "";
  curOrder.forEach((opt, di) => {
    const btn = document.createElement("button");
    btn.className = "answer";
    btn.dataset.correct = String(opt.i === q.answer);
    btn.innerHTML = `<span class="key">${"ABCD"[di]}</span><span>${opt.c}</span>`;
    if (interactive) btn.onclick = () => onAnswerClick(btn);
    else btn.disabled = true;
    ans.appendChild(btn);
  });
  $("explain").classList.add("hidden");
  $("nextRow").classList.add("hidden");
}

function revealAnswers(chosenBtn) {
  [...$("answers").children].forEach((b) => {
    b.disabled = true;
    if (b.dataset.correct === "true") b.classList.add("correct");
    else if (b === chosenBtn) b.classList.add("wrong");
    else b.classList.add("dim");
  });
}
function showExplain(good, verdictText) {
  const ex = $("explain"), v = $("verdict");
  v.textContent = verdictText; v.className = "verdict " + (good ? "good" : "bad");
  $("explainText").innerHTML = `<b>Why:</b> ${curQ.why}`;
  ex.classList.remove("hidden"); ex.classList.remove("pop"); void ex.offsetWidth; ex.classList.add("pop");
  $("nextRow").classList.remove("hidden");
  $("next").textContent = (qIndex + 1 >= queue.length) ? "See results  🏁" : "Next  ➜";
}

// ---------- timer ----------
function startTimer(onExpire) {
  if (cfg.time <= 0) { $("timerWrap").classList.add("hidden"); return; }
  $("timerWrap").classList.remove("hidden");
  timeLeft = cfg.time;
  const fill = $("timerFill"); fill.style.width = "100%";
  const total = cfg.time * 1000; let elapsed = 0; let lastTick = total;
  timerId = setInterval(() => {
    elapsed += 100; timeLeft = Math.max(0, (total - elapsed) / 1000);
    fill.style.width = (100 * (total - elapsed) / total) + "%";
    if (total - elapsed <= 3000 && lastTick - (total - elapsed) >= 1000) { lastTick = total - elapsed; sfx.urgent(); FX.vibrate(20); }
    if (elapsed >= total) { clearTimer(); if (!answered) onExpire(); }
  }, 100);
}
function clearTimer() { if (timerId) { clearInterval(timerId); timerId = null; } $("timerWrap").classList.add("hidden"); }

// ============================================================
//  MODE: VERSUS + STEAL
// ============================================================
let vs = null;
function startVersus() {
  setHud("versus");
  queue = buildQueue(cfg.rounds * 2); qIndex = 0; missedQs = [];
  vs = {
    score: [0, 0], correct: [0, 0], asked: [0, 0], streak: [0, 0], best: [0, 0],
    steals: [0, 0], lifelines: [false, false], missed: [{}, {}],
    wagerArmed: false, stealMode: false, stealTimer: null,
  };
  // header
  $("hudav1").textContent = cfg.avatars[0]; $("hudav2").textContent = cfg.avatars[1];
  $("name1").textContent = cfg.names[0]; $("name2").textContent = cfg.names[1];
  $("score1").textContent = "0"; $("score2").textContent = "0";
  $("streak1").textContent = ""; $("streak2").textContent = "";
  show("play"); vsRender();
}
const playerFor = (i) => i % 2;

function vsRender() {
  const p = playerFor(qIndex);
  vs.wagerArmed = false; vs.stealMode = false;
  renderQuestionCommon(queue[qIndex]);
  const who = $("turnWho");
  who.textContent = `${cfg.names[p]} ${cfg.avatars[p]}`;
  who.className = "turn-who " + (p === 0 ? "p1" : "p2");
  $("card1").classList.toggle("active", p === 0);
  $("card2").classList.toggle("active", p === 1);
  // wager + lifeline chips
  const wb = $("wagerBtn"), lb = $("lifelineBtn");
  wb.classList.remove("armed"); wb.disabled = false;
  wb.onclick = () => { if (answered) return; vs.wagerArmed = !vs.wagerArmed; wb.classList.toggle("armed", vs.wagerArmed); sfx.select(); FX.vibrate(15); };
  lb.disabled = vs.lifelines[p];
  lb.textContent = vs.lifelines[p] ? "🆘 Lifeline used" : "🆘 50/50 Lifeline";
  lb.onclick = () => useLifeline(p, lb);
  startTimer(() => vsTimeUp());
}

function useLifeline(p, lb) {
  if (answered || vs.lifelines[p]) return;
  vs.lifelines[p] = true; lb.disabled = true; lb.textContent = "🆘 Lifeline used";
  // hide two wrong answers
  const wrong = [...$("answers").children].filter((b) => b.dataset.correct !== "true");
  shuffle(wrong).slice(0, 2).forEach((b) => b.classList.add("fade50"));
  sfx.whoosh(); FX.vibrate(25);
}

function onAnswerClick(btn) {
  if (cfg.mode === "versus") return vsAnswer(btn);
  if (cfg.mode === "coop") return coopAnswer(btn);
}

function vsAnswer(btn) {
  const correct = btn.dataset.correct === "true";
  // steal resolution happens AFTER the primary (wrong) answer, when `answered` is already true
  if (vs.stealMode) return vsStealResolve(btn, correct);
  if (answered) return;

  // primary answer by active player
  const p = playerFor(qIndex);
  if (correct) {
    answered = true; clearTimer(); vs.asked[p]++; vs.correct[p]++;
    store.recordTopic(curQ.cat, true);
    vs.streak[p]++; vs.best[p] = Math.max(vs.best[p], vs.streak[p]);
    const speed = cfg.time > 0 ? Math.round(50 * (timeLeft / cfg.time)) : 25;
    const mult = (1 + 0.25 * (vs.streak[p] - 1)) * (vs.wagerArmed ? 2 : 1);
    const base = DIFF_POINTS[curQ.d] || 100;
    const gained = Math.round((base + speed) * mult);
    vs.score[p] += gained;
    vsUpdateScore(p, `+${gained}${vs.wagerArmed ? " 🎲×2" : ""}`);
    vsStreakLabel(p);
    revealAnswers(btn);
    sfx.correct(); FX.vibrate([20, 40, 20]);
    FX.burstAt(btn, p === 0 ? "p1" : "p2", 24);
    showExplain(true, `✓ ${cfg.names[p]} nailed it! +${gained}`);
  } else {
    // wrong → wager penalty + open steal to opponent
    answered = true; clearTimer(); vs.asked[p]++; vs.streak[p] = 0; bumpMiss(vs, p, curQ.cat);
    store.recordTopic(curQ.cat, false); markMissed();
    if (vs.wagerArmed) { vs.score[p] = Math.max(0, vs.score[p] - 100); vsUpdateScore(p, "-100 🎲", true); }
    vsStreakLabel(p);
    btn.classList.add("wrong"); btn.disabled = true;
    sfx.wrong(); FX.vibrate(120); FX.shake($("play"));
    enterSteal(p);
  }
}

function enterSteal(victim) {
  const thief = 1 - victim;
  vs.stealMode = true;
  const who = $("turnWho");
  who.textContent = `⚡ ${cfg.names[thief]} ${cfg.avatars[thief]} — STEAL IT!`;
  who.className = "turn-who " + (thief === 0 ? "p1" : "p2");
  $("card1").classList.toggle("active", thief === 0);
  $("card2").classList.toggle("active", thief === 1);
  sfx.steal();
  // re-enable non-chosen answers, give a short steal window
  [...$("answers").children].forEach((b) => { if (!b.classList.contains("wrong")) b.disabled = false; });
  $("timerWrap").classList.remove("hidden");
  let t = 8; const fill = $("timerFill"); fill.style.width = "100%";
  const total = 8000; let el = 0;
  vs.stealTimer = setInterval(() => {
    el += 100; fill.style.width = (100 * (total - el) / total) + "%";
    if (el >= total) { clearInterval(vs.stealTimer); vs.stealTimer = null; vsStealExpire(); }
  }, 100);
}
function clearStealTimer() { if (vs.stealTimer) { clearInterval(vs.stealTimer); vs.stealTimer = null; } $("timerWrap").classList.add("hidden"); }

function vsStealResolve(btn, correct) {
  clearStealTimer();
  const victim = playerFor(qIndex), thief = 1 - victim;
  vs.stealMode = false;
  if (correct) {
    const gained = 75;
    vs.score[thief] += gained; vs.steals[thief]++;
    vsUpdateScore(thief, `STOLE +${gained} ⚡`);
    revealAnswers(btn);
    sfx.steal(); FX.vibrate([20, 30, 20, 30]); FX.burstAt(btn, thief === 0 ? "p1" : "p2", 22);
    showExplain(true, `⚡ ${cfg.names[thief]} stole it for +${gained}!`);
  } else {
    btn.classList.add("wrong"); revealAnswers(btn);
    sfx.wrong(); FX.vibrate(80);
    showExplain(false, `Nobody got it — review this one.`);
  }
}
function vsStealExpire() {
  vs.stealMode = false;
  revealAnswers(null);
  showExplain(false, `⏰ Steal expired — review this one.`);
}
function vsTimeUp() {
  const p = playerFor(qIndex);
  answered = true; vs.asked[p]++; vs.streak[p] = 0; bumpMiss(vs, p, curQ.cat);
  store.recordTopic(curQ.cat, false); markMissed();
  if (vs.wagerArmed) { vs.score[p] = Math.max(0, vs.score[p] - 100); vsUpdateScore(p, "-100 🎲", true); }
  vsStreakLabel(p);
  sfx.wrong(); FX.shake($("play"));
  enterSteal(p);
}

function vsUpdateScore(p, floatTxt, bad = false) {
  const el = $(p === 0 ? "score1" : "score2");
  el.textContent = vs.score[p]; el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop");
  FX.floatText(el, floatTxt, bad ? "#f87171" : (p === 0 ? "#7dd3fc" : "#fda4af"));
}
function vsStreakLabel(p) {
  const el = $(p === 0 ? "streak1" : "streak2"), s = vs.streak[p];
  el.textContent = s >= 2 ? `🔥 ${s} streak · ${(1 + 0.25 * (s - 1))}×` : "";
}
function bumpMiss(st, p, cat) { st.missed[p][cat] = (st.missed[p][cat] || 0) + 1; }

// ---- topic mastery + missed-question review tracking ----
let missedQs = [];
function markMissed() { if (curQ && !missedQs.includes(curQ)) missedQs.push(curQ); }

// ============================================================
//  MODE: CO-OP BOSS BATTLE
// ============================================================
let coop = null;
function startCoop() {
  setHud("coop");
  queue = buildQueue(cfg.rounds * 2); qIndex = 0; missedQs = [];
  const maxHp = queue.length * 10;
  coop = {
    maxHp, hp: maxHp, lives: 3, score: 0, correct: 0, asked: 0,
    combo: 0, bestCombo: 0, missed: [{}, {}], consulting: false, consults: 0, dmgDealt: 0, over: false,
  };
  coopDrawHud();
  show("play"); sfx.boss(); coopRender();
}
function coopDrawHud() {
  const pct = Math.max(0, (coop.hp / coop.maxHp) * 100);
  $("bossHp").style.width = pct + "%";
  $("bossHpText").textContent = `${Math.max(0, Math.ceil(coop.hp))} / ${coop.maxHp}`;
  const lv = Math.max(0, Math.min(3, coop.lives));
  $("lives").textContent = "❤️".repeat(lv) + "🖤".repeat(3 - lv);
  $("coopScore").textContent = coop.score;
  $("coopCombo").textContent = coop.combo >= 2 ? `🔥 ${coop.combo}× combo` : "";
  $("bossFace").textContent = coop.hp / coop.maxHp > 0.5 ? "🐉" : coop.hp / coop.maxHp > 0.2 ? "👹" : "💀";
}
function coopRender() {
  const p = playerFor(qIndex);
  coop.consulting = false;
  renderQuestionCommon(queue[qIndex]);
  const who = $("turnWho");
  who.textContent = `${cfg.names[p]} ${cfg.avatars[p]} — your strike`;
  who.className = "turn-who " + (p === 0 ? "p1" : "p2");
  const cb = $("consultBtn");
  cb.disabled = false; cb.classList.remove("armed"); cb.textContent = "🤝 Consult partner";
  cb.onclick = () => {
    if (answered || coop.consulting) return;
    coop.consulting = true; cb.classList.add("armed"); cb.textContent = "🤝 Consulting… (½ damage)";
    const wrong = [...$("answers").children].filter((b) => b.dataset.correct !== "true");
    shuffle(wrong).slice(0, 2).forEach((b) => b.classList.add("fade50"));
    sfx.whoosh(); FX.vibrate(20);
  };
}
function coopFinish(win, verdict) {
  coop.over = true; answered = true;
  $("nextRow").classList.add("hidden");
  showExplain(win, verdict);
  $("nextRow").classList.add("hidden");   // override: terminal state has no "next"
  setTimeout(() => endCoop(win), 850);
}
function coopAnswer(btn) {
  if (answered || coop.over) return;
  answered = true; clearTimer();
  const correct = btn.dataset.correct === "true";
  const p = playerFor(qIndex); coop.asked++;
  if (correct) {
    store.recordTopic(curQ.cat, true);
    coop.correct++; coop.combo++; coop.bestCombo = Math.max(coop.bestCombo, coop.combo);
    let dmg = (DIFF_DMG[curQ.d] || 12) + (coop.combo - 1) * 2;
    if (coop.consulting) dmg = Math.ceil(dmg / 2);
    coop.hp -= dmg; coop.dmgDealt += dmg; coop.score += dmg * 10;
    revealAnswers(btn);
    sfx.damage(); FX.vibrate([15, 30, 15]);
    $("bossFace").classList.remove("boss-hit"); void $("bossFace").offsetWidth; $("bossFace").classList.add("boss-hit");
    FX.floatText($("bossFace"), `-${dmg}`, "#fca5a5");
    FX.burstAt($("bossFace"), "gold", 18);
    coopDrawHud();
    if (coop.hp <= 0) { sfx.victory(); return coopFinish(true, `💥 ${dmg} damage — THE EXAMINER FALLS!`); }
    showExplain(true, `💥 ${dmg} damage${coop.consulting ? " (consulted)" : ""}! Combo ${coop.combo}×`);
  } else {
    coop.combo = 0; coop.lives--; bumpMiss(coop, p, curQ.cat);
    store.recordTopic(curQ.cat, false); markMissed();
    revealAnswers(btn);
    sfx.wrong(); FX.vibrate(150); FX.shake($("play"), "hard");
    coopDrawHud();
    if (coop.lives <= 0) { return coopFinish(false, `✗ The Examiner strikes you down…`); }
    showExplain(false, `✗ The Examiner hits back! ${coop.lives} ❤️ left`);
  }
}

// ============================================================
//  MODE: QUIZMASTER (host)
// ============================================================
let host = null;
function startHost() {
  setHud("host");
  queue = buildQueue(cfg.rounds * 2); qIndex = 0; missedQs = [];
  host = { correct: [0, 0], asked: [0, 0], streak: [0, 0], best: [0, 0], missed: [{}, {}], score: [0, 0] };
  $("hud-versus").classList.add("hidden");
  show("play"); hostRender();
}
function hostRender() {
  // answerer alternates; the OTHER player is the host/reader
  const answerer = playerFor(qIndex), reader = 1 - answerer;
  renderQuestionCommon(queue[qIndex], { interactive: false });
  const who = $("turnWho");
  who.innerHTML = `🎤 ${cfg.names[reader]} reads → ${cfg.names[answerer]} answers`;
  who.className = "turn-who " + (answerer === 0 ? "p1" : "p2");
  // hide the correctness from view until reveal: nothing marked yet
  $("hostReveal").classList.remove("hidden");
  $("hostGrade").classList.add("hidden");
  $("hostReveal").onclick = () => {
    revealAnswers(null);
    $("hostReveal").classList.add("hidden");
    $("hostGrade").classList.remove("hidden");
    sfx.select();
  };
  $("gradeRight").onclick = () => hostGrade(true);
  $("gradeWrong").onclick = () => hostGrade(false);
  // optional read-aloud timer
  startTimer(() => { sfx.urgent(); });
}
function hostGrade(good) {
  if (answered) return; answered = true; clearTimer();
  const a = playerFor(qIndex);
  host.asked[a]++;
  if (good) {
    store.recordTopic(curQ.cat, true);
    host.correct[a]++; host.streak[a]++; host.best[a] = Math.max(host.best[a], host.streak[a]);
    const mult = 1 + 0.2 * (host.streak[a] - 1);
    host.score[a] += Math.round(100 * mult);
    sfx.correct(); FX.confetti({ palette: a === 0 ? "p1" : "p2", count: 40 });
    showExplain(true, `✓ ${cfg.names[a]} got it!`);
  } else {
    host.streak[a] = 0; bumpMiss(host, a, curQ.cat);
    store.recordTopic(curQ.cat, false); markMissed();
    sfx.wrong(); FX.shake($("play"));
    showExplain(false, `✗ One to review with ${cfg.names[a]}.`);
  }
  $("hostGrade").classList.add("hidden");
}

// ============================================================
//  NEXT (quiz modes)
// ============================================================
function nextQuestion() {
  sfx.tap();
  qIndex++;
  if (qIndex >= queue.length) {
    if (cfg.mode === "versus") return endVersus();
    if (cfg.mode === "coop") return endCoop(false);
    if (cfg.mode === "host") return endHost();
  }
  if (cfg.mode === "versus") vsRender();
  else if (cfg.mode === "coop") coopRender();
  else if (cfg.mode === "host") hostRender();
}

// ============================================================
//  MODE: REFLEX DUEL
// ============================================================
let duel = null;
function startDuel() {
  duel = { score: [0, 0], rounds: cfg.rounds, round: 0, pool: buildQueue(cfg.rounds + 6), armed: false, locked: [false, false], won: false, fast: [0, 0], suddenDeath: false };
  $("duelScore").textContent = `${cfg.avatars[0]} 0 — 0 ${cfg.avatars[1]}`;
  $("duelQuit").onclick = () => toMenu();
  show("duel");
  duelNextRound();
}
async function duelNextRound() {
  if (!duel.suddenDeath && duel.round >= duel.rounds) return endDuel();
  const q = duel.pool[duel.round % duel.pool.length];
  duel.round++;
  duel.curQ = q; duel.armed = false; duel.locked = [false, false]; duel.won = false;

  // two options: correct + one distractor
  const correctText = q.choices[q.answer];
  const distract = shuffle(q.choices.filter((_, i) => i !== q.answer))[0];
  const opts = shuffle([{ t: correctText, ok: true }, { t: distract, ok: false }]);
  duel.correctSide = opts.findIndex((o) => o.ok);

  // render into both halves
  for (const half of ["top", "bottom"]) {
    $(half === "top" ? "dqTop" : "dqBottom").textContent = q.q;
    const btns = document.querySelectorAll(`.duel-opt[data-half="${half}"]`);
    btns.forEach((b, i) => {
      b.textContent = opts[i].t; b.disabled = true;
      b.className = "duel-opt"; b.dataset.ok = String(opts[i].ok);
    });
    $(half === "top" ? "duelTop" : "duelBottom").classList.remove("locked");
    $(half === "top" ? "flashTop" : "flashBottom").className = "duel-flash";
  }
  $("duelRound").textContent = duel.suddenDeath ? "⚔️ SUDDEN DEATH" : `Round ${duel.round} / ${duel.rounds}`;

  // countdown
  const go = $("duelGo");
  for (const n of ["3", "2", "1"]) {
    go.textContent = n; go.style.opacity = "1"; sfx.countdown(); FX.vibrate(15);
    await wait(620);
  }
  go.textContent = "GO!"; sfx.go(); FX.vibrate(40);
  duel.armed = true;
  document.querySelectorAll(".duel-opt").forEach((b) => b.disabled = false);
  setTimeout(() => { if (duel.armed) go.style.opacity = "0"; }, 350);

  // round timeout
  duel.t0 = performance.now();
  duel.roundTimer = setTimeout(() => duelTimeout(), 6000);
}

function duelTap(btn) {
  if (!duel.armed || duel.won) return;
  const half = btn.dataset.half;
  const player = half === "top" ? 0 : 1;   // top = player 1 (Jordan), bottom = player 2 (Athena)
  if (duel.locked[player]) return;
  const ok = btn.dataset.ok === "true";
  if (ok) {
    duel.won = true; duel.armed = false; clearTimeout(duel.roundTimer);
    duel.score[player]++;
    const dt = performance.now() - duel.t0;
    if (dt < 1200) duel.fast[player]++;
    btn.classList.add("win");
    flashHalf(half, "✓");
    // loser half marks correct answer
    const otherHalf = half === "top" ? "bottom" : "top";
    document.querySelectorAll(`.duel-opt[data-half="${otherHalf}"]`).forEach((b) => { if (b.dataset.ok === "true") b.classList.add("win"); b.disabled = true; });
    document.querySelectorAll(`.duel-opt[data-half="${half}"]`).forEach((b) => b.disabled = true);
    $("duelScore").textContent = `${cfg.avatars[0]} ${duel.score[0]} — ${duel.score[1]} ${cfg.avatars[1]}`;
    sfx.correct(); FX.vibrate([20, 40, 20]);
    FX.confetti({ palette: player === 0 ? "p1" : "p2", count: 50, y: player === 0 ? innerHeight * 0.25 : innerHeight * 0.75 });
    setTimeout(() => duelNextRound(), 1100);
  } else {
    duel.locked[player] = true;
    btn.classList.add("lose");
    $(half === "top" ? "duelTop" : "duelBottom").classList.add("locked");
    flashHalf(half, "✗");
    sfx.wrong(); FX.vibrate(120);
    // if both locked → nobody wins, advance
    if (duel.locked[0] && duel.locked[1]) {
      duel.armed = false; clearTimeout(duel.roundTimer);
      revealDuelCorrect();
      setTimeout(() => duelNextRound(), 1100);
    }
  }
}
function flashHalf(half, sym) {
  const f = $(half === "top" ? "flashTop" : "flashBottom");
  f.textContent = sym; f.className = "duel-flash show";
}
function revealDuelCorrect() {
  document.querySelectorAll(".duel-opt").forEach((b) => { if (b.dataset.ok === "true") b.classList.add("win"); b.disabled = true; });
}
function duelTimeout() {
  if (duel.won) return;
  duel.armed = false;
  revealDuelCorrect();
  $("duelGo").textContent = "⏱"; $("duelGo").style.opacity = "1";
  sfx.wrong();
  setTimeout(() => { $("duelGo").style.opacity = "0"; duelNextRound(); }, 1100);
}

// ============================================================
//  END SCREENS
// ============================================================
function badge(text) { return `<span class="badge">${text}</span>`; }

function endVersus() {
  clearTimer();
  const [s1, s2] = vs.score;
  $("trophy").textContent = s1 === s2 ? "🤝" : "🏆";
  if (s1 === s2) { $("winnerLine").textContent = "Dead heat — it's a tie!"; }
  else { const w = s1 > s2 ? 0 : 1; $("winnerLine").innerHTML = `${cfg.avatars[w]} <span style="color:${w === 0 ? "var(--p1)" : "var(--p2)"}">${cfg.names[w]}</span> wins!`; }
  $("endSub").textContent = `${cfg.names[0]} ${s1} · ${cfg.names[1]} ${s2}`;
  store.recordSeries(s1 === s2 ? -1 : (s1 > s2 ? 0 : 1));
  FX.confetti({ palette: "win", count: 120 }); sfx.victory();

  $("statgrid").innerHTML = [0, 1].map((p) => {
    const acc = vs.asked[p] ? Math.round(100 * vs.correct[p] / vs.asked[p]) : 0;
    const b = [];
    if (acc >= 90 && vs.asked[p] >= 4) b.push(badge("🎯 Sharpshooter"));
    if (vs.best[p] >= 4) b.push(badge("🔥 On Fire"));
    if (vs.steals[p] >= 1) b.push(badge(`⚡ Thief ×${vs.steals[p]}`));
    if (vs.correct[p] === vs.asked[p] && vs.asked[p] > 0) b.push(badge("💎 Flawless"));
    return `<div class="statcard ${p === 0 ? "p1" : "p2"}"><h3>${cfg.avatars[p]} ${cfg.names[p]}</h3>
      <div class="row"><span>Score</span><b>${vs.score[p]}</b></div>
      <div class="row"><span>Correct</span><b>${vs.correct[p]}/${vs.asked[p]} (${acc}%)</b></div>
      <div class="row"><span>Best streak</span><b>${vs.best[p]}</b></div>
      <div class="row"><span>Steals</span><b>${vs.steals[p]}</b></div>
      <div class="badges">${b.join("")}</div></div>`;
  }).join("");
  $("review").innerHTML = reviewHtml(mergeMissed(vs.missed));
  $("review").className = "review single";
  afterEnd(); show("end");
}

function endCoop(win) {
  clearTimer();
  store.recordBoss(win);
  $("trophy").textContent = win ? "🐉⚔️" : "💀";
  $("winnerLine").innerHTML = win ? `<span style="color:var(--good)">VICTORY!</span> The Examiner is defeated!` : `Defeated… The Examiner stands.`;
  const acc = coop.asked ? Math.round(100 * coop.correct / coop.asked) : 0;
  $("endSub").textContent = win ? `Team ${cfg.names[0]} + ${cfg.names[1]} cleared it with ${coop.lives} ❤️ to spare!` : `Boss HP left: ${Math.max(0, Math.ceil(coop.hp))} / ${coop.maxHp} — so close!`;
  if (win) { FX.confetti({ palette: "win", count: 140 }); sfx.victory(); } else { sfx.defeat(); }

  const b = [];
  if (win) b.push(badge("🐉 Boss Slayer"));
  if (coop.bestCombo >= 4) b.push(badge(`🔥 ${coop.bestCombo}× Combo`));
  if (coop.lives === 3 && win) b.push(badge("🛡️ No Damage"));
  if (acc >= 85 && coop.asked >= 4) b.push(badge("🎯 Sharp Team"));
  $("statgrid").innerHTML = `<div class="statcard team" style="grid-column:1/-1"><h3>🤝 Team ${cfg.names[0]} + ${cfg.names[1]}</h3>
    <div class="row"><span>Result</span><b>${win ? "Boss defeated" : "Wiped out"}</b></div>
    <div class="row"><span>Correct</span><b>${coop.correct}/${coop.asked} (${acc}%)</b></div>
    <div class="row"><span>Damage dealt</span><b>${coop.dmgDealt}</b></div>
    <div class="row"><span>Best combo</span><b>${coop.bestCombo}×</b></div>
    <div class="row"><span>Lives left</span><b>${"❤️".repeat(Math.max(0, coop.lives)) || "none"}</b></div>
    <div class="badges">${b.join("")}</div></div>`;
  $("review").innerHTML = reviewHtml(mergeMissed(coop.missed));
  $("review").className = "review single";
  afterEnd(); show("end");
}

function endHost() {
  clearTimer();
  const [s1, s2] = host.score;
  $("trophy").textContent = s1 === s2 ? "🤝" : "🏆";
  if (s1 === s2) $("winnerLine").textContent = "It's a tie!";
  else { const w = s1 > s2 ? 0 : 1; $("winnerLine").innerHTML = `${cfg.avatars[w]} <span style="color:${w === 0 ? "var(--p1)" : "var(--p2)"}">${cfg.names[w]}</span> wins!`; }
  $("endSub").textContent = "Quizmaster round complete 🎤";
  store.recordSeries(s1 === s2 ? -1 : (s1 > s2 ? 0 : 1));
  FX.confetti({ palette: "win", count: 110 }); sfx.victory();
  $("statgrid").innerHTML = [0, 1].map((p) => {
    const acc = host.asked[p] ? Math.round(100 * host.correct[p] / host.asked[p]) : 0;
    return `<div class="statcard ${p === 0 ? "p1" : "p2"}"><h3>${cfg.avatars[p]} ${cfg.names[p]}</h3>
      <div class="row"><span>Score</span><b>${host.score[p]}</b></div>
      <div class="row"><span>Correct</span><b>${host.correct[p]}/${host.asked[p]} (${acc}%)</b></div>
      <div class="row"><span>Best streak</span><b>${host.best[p]}</b></div></div>`;
  }).join("");
  $("review").innerHTML = reviewHtml(mergeMissed(host.missed));
  $("review").className = "review single";
  afterEnd(); show("end");
}

function endDuel() {
  const [s1, s2] = duel.score;
  if (s1 === s2) { // sudden death
    duel.suddenDeath = true;
    $("duelGo").textContent = "";
    return duelNextRound();
  }
  duel.suddenDeath = false;
  const w = s1 > s2 ? 0 : 1;
  store.recordSeries(w);
  $("trophy").textContent = "⚡🏆";
  $("winnerLine").innerHTML = `${cfg.avatars[w]} <span style="color:${w === 0 ? "var(--p1)" : "var(--p2)"}">${cfg.names[w]}</span> has the faster trigger!`;
  $("endSub").textContent = `${cfg.names[0]} ${s1} — ${s2} ${cfg.names[1]}`;
  FX.confetti({ palette: w === 0 ? "p1" : "p2", count: 130 }); sfx.victory();
  const b = [];
  if (duel.fast[w] >= 3) b.push(badge("⚡ Lightning Reflexes"));
  if ((w === 0 ? s2 : s1) === 0) b.push(badge("🧹 Clean Sweep"));
  $("statgrid").innerHTML = [0, 1].map((p) =>
    `<div class="statcard ${p === 0 ? "p1" : "p2"}"><h3>${cfg.avatars[p]} ${cfg.names[p]}</h3>
      <div class="row"><span>Rounds won</span><b>${duel.score[p]}</b></div>
      <div class="row"><span>Sub-1.2s taps</span><b>${duel.fast[p]}</b></div>
      <div class="badges">${p === w ? b.join("") : ""}</div></div>`).join("");
  $("review").innerHTML = `<h3>⚡ Reflex Duel</h3>Quick and dirty — great warm-up. For real studying, try <b>Co-op Boss</b> or <b>Quizmaster</b> next.`;
  $("review").className = "review single";
  afterEnd(); show("end");
}

// ---------- review helpers ----------
function mergeMissed(missedArr) {
  const m = {};
  missedArr.forEach((obj) => { for (const [c, n] of Object.entries(obj)) m[c] = (m[c] || 0) + n; });
  return m;
}
function reviewHtml(missed) {
  const sorted = Object.entries(missed).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return `<h3>📚 Topics to review</h3>Flawless — no missed topics. Athena's ready. 🎉`;
  const items = sorted.map(([cat, n]) => `<span style="color:${CATEGORIES[cat].color};font-weight:800">${CATEGORIES[cat].name}</span> (${n})`).join(" · ");
  return `<h3>📚 Topics to review</h3>${items}`;
}

// ============================================================
//  REVIEW MISSED — post-match study walkthrough
// ============================================================
function afterEnd() {
  const has = missedQs.length > 0;
  $("reviewMissed").classList.toggle("hidden", !has);
  $("reviewSp").classList.toggle("hidden", !has);
  if (has) $("reviewMissed").textContent = `📖  Review the ${missedQs.length} you missed`;
}
let rvIndex = 0;
function openReview() {
  if (!missedQs.length) return;
  rvIndex = 0; renderReview(); show("reviewScreen"); sfx.tap();
}
function renderReview() {
  const q = missedQs[rvIndex], cat = CATEGORIES[q.cat];
  $("rvCount").textContent = `${rvIndex + 1} / ${missedQs.length}`;
  const cp = $("rvCat"); cp.textContent = cat.name; cp.style.background = cat.color;
  $("rvQ").textContent = q.q;
  const ans = $("rvAnswers"); ans.innerHTML = "";
  q.choices.forEach((c, i) => {
    const d = document.createElement("div");
    d.className = "answer " + (i === q.answer ? "correct" : "dim");
    d.innerHTML = `<span class="key">${"ABCD"[i]}</span><span>${c}</span>`;
    ans.appendChild(d);
  });
  $("rvWhy").innerHTML = `<b>Why:</b> ${q.why}`;
  $("rvPrev").disabled = rvIndex === 0;
  $("rvNext").textContent = rvIndex + 1 >= missedQs.length ? "Done ✓" : "Next ›";
}
function rvMove(d) {
  if (d > 0 && rvIndex + 1 >= missedQs.length) { show("end"); sfx.tap(); return; }
  rvIndex = Math.max(0, Math.min(missedQs.length - 1, rvIndex + d));
  renderReview(); sfx.tap();
}

// ============================================================
//  HOME STATS — series tally + per-topic mastery
// ============================================================
function renderHomeStats() {
  const d = store.data;
  const total = d.series.p0 + d.series.p1 + d.series.ties;
  const bossTotal = d.boss.won + d.boss.lost;
  const box = $("seriesBox");
  if (total + bossTotal === 0) { box.classList.add("hidden"); }
  else {
    box.classList.remove("hidden");
    let html = "";
    if (total > 0) html += `<span class="series-item">🏆 ${cfg.avatars[0]} <b>${d.series.p0}</b> — <b>${d.series.p1}</b> ${cfg.avatars[1]}${d.series.ties ? ` · ${d.series.ties}T` : ""}</span>`;
    if (bossTotal > 0) html += `<span class="series-item">🐉 Examiner <b>${d.boss.won}</b>W–<b>${d.boss.lost}</b>L</span>`;
    box.innerHTML = html;
  }
  renderProgress();
}
function renderProgress() {
  const t = store.data.topic, cats = Object.keys(CATEGORIES);
  const totalSeen = cats.reduce((s, c) => s + (t[c] ? t[c].seen : 0), 0);
  const body = $("progressBody");
  if (totalSeen === 0) { body.innerHTML = `<p class="muted-note">Play a round and Athena's per-topic mastery shows up here — weakest topics first, so you know what to drill.</p>`; return; }
  const totalCorrect = cats.reduce((s, c) => s + (t[c] ? t[c].correct : 0), 0);
  const overall = Math.round(100 * totalCorrect / totalSeen);
  const rows = cats.filter((c) => t[c] && t[c].seen).map((c) => ({ c, pct: Math.round(100 * t[c].correct / t[c].seen), seen: t[c].seen, correct: t[c].correct }))
    .sort((a, b) => a.pct - b.pct);
  let html = `<div class="prog-overall">Overall mastery <b>${overall}%</b> · ${totalCorrect}/${totalSeen} correct</div>`;
  html += rows.map((r) => {
    const color = CATEGORIES[r.c].color;
    return `<div class="prog-row"><div class="prog-label"><span class="dot" style="background:${color}"></span>${CATEGORIES[r.c].name}</div>
      <div class="prog-bar"><div class="prog-fill" style="width:${r.pct}%;background:${color}"></div></div>
      <div class="prog-pct">${r.pct}% <span class="prog-n">(${r.correct}/${r.seen})</span></div></div>`;
  }).join("");
  html += `<button class="reset-btn" id="resetStats">↺ reset all stats</button>`;
  body.innerHTML = html;
  $("resetStats").onclick = () => {
    if (confirm("Reset all progress, series and topic stats?")) {
      store.data.series = { p0: 0, p1: 0, ties: 0 }; store.data.boss = { won: 0, lost: 0 }; store.data.topic = {};
      store.save(); renderHomeStats(); sfx.tap();
    }
  };
}

// ============================================================
//  PERSISTENCE GLUE
// ============================================================
function persistCfg() {
  store.data.names = cfg.names.slice();
  store.data.avatars = cfg.avatars.slice();
  store.data.rounds = cfg.rounds; store.data.time = cfg.time;
  store.data.diff = cfg.diff;
  store.data.cats = [...cfg.cats];
  store.save();
}
function applyState() {
  const d = store.load();
  cfg.names = (d.names || cfg.names).slice();
  cfg.avatars = (d.avatars || cfg.avatars).slice();
  cfg.rounds = d.rounds || cfg.rounds; cfg.time = (d.time != null ? d.time : cfg.time);
  cfg.diff = d.diff || cfg.diff;
  if (Array.isArray(d.cats)) cfg.cats = new Set(d.cats.length ? d.cats : Object.keys(CATEGORIES));
  $("in-name1").value = cfg.names[0]; $("in-name2").value = cfg.names[1];
  $("av1").textContent = cfg.avatars[0]; $("av2").textContent = cfg.avatars[1];
  $("rounds").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.rounds === cfg.rounds)));
  $("timer").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.time === cfg.time)));
  $("diffSel").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.diff === cfg.diff)));
  syncChips();
  setMuted(!!d.muted);
  $("sound-toggle").textContent = d.muted ? "🔇" : "🔊";
  $("sound-toggle").classList.toggle("off", !!d.muted);
}

// ============================================================
//  INIT / WIRING
// ============================================================
function init() {
  buildCatChips(); wireSegments(); wireAvatars();
  applyState();
  renderHomeStats();

  $("in-name1").addEventListener("input", () => { readNames(); persistCfg(); });
  $("in-name2").addEventListener("input", () => { readNames(); persistCfg(); });

  $("modes").querySelectorAll(".mode-card").forEach((c) => {
    c.onclick = () => { audioResume(); FX.burstAt(c, "gold", 18); startMode(c.dataset.mode); };
  });

  $("next").onclick = nextQuestion;
  $("again").onclick = () => { audioResume(); startMode(cfg.mode); };
  $("reconfig").onclick = toMenu;
  $("quit").onclick = toMenu;

  // review-missed
  $("reviewMissed").onclick = openReview;
  $("rvPrev").onclick = () => rvMove(-1);
  $("rvNext").onclick = () => rvMove(1);
  $("rvDone").onclick = () => { show("end"); sfx.tap(); };

  // duel taps
  document.querySelectorAll(".duel-opt").forEach((b) => b.onclick = () => duelTap(b));

  // sound toggle
  $("sound-toggle").onclick = () => {
    audioResume();
    const m = toggleMuted();
    $("sound-toggle").textContent = m ? "🔇" : "🔊";
    $("sound-toggle").classList.toggle("off", m);
    store.data.muted = m; store.save();
    if (!m) sfx.select();
  };

  // keyboard: A-D answer (versus/coop), Enter next
  document.addEventListener("keydown", (e) => {
    if (!$("play").classList.contains("hidden")) {
      const k = e.key.toUpperCase();
      if (!answered && ["A", "B", "C", "D"].includes(k) && (cfg.mode === "versus" || cfg.mode === "coop")) {
        const btn = $("answers").children["ABCD".indexOf(k)];
        if (btn && !btn.disabled) btn.click();
      } else if (answered && (e.key === "Enter" || e.key === " ") && !$("nextRow").classList.contains("hidden")) {
        e.preventDefault(); nextQuestion();
      }
    }
  });

  // resume audio on first interaction anywhere
  window.addEventListener("pointerdown", () => audioResume(), { once: true });
}

init();
