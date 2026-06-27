// ============================================================
//  BROKER BATTLE — game logic
//  Pass-and-play, two-player insurance broker exam quiz.
// ============================================================
import { QUESTIONS, CATEGORIES } from "./questions.js";

const $ = (id) => document.getElementById(id);
const shuffle = (a) => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };

// ---------- config state ----------
const cfg = {
  names: ["Jordan", "Athena"],
  rounds: 8,
  time: 20,           // seconds; 0 = off
  cats: new Set(Object.keys(CATEGORIES)),  // all by default
};

// ---------- match state ----------
let queue = [];        // ordered list of questions for the match
let qIndex = 0;        // index into queue
let answered = false;
let timerId = null;
let timeLeft = 0;
let game = null;       // per-player stats

const KEYS = ["A", "B", "C", "D"];

// ============================================================
//  SETUP SCREEN
// ============================================================
function buildCatChips() {
  const wrap = $("cats");
  wrap.innerHTML = "";

  // "All" toggle
  const all = document.createElement("button");
  all.className = "chip all";
  all.textContent = "All topics";
  all.setAttribute("aria-pressed", "true");
  all.onclick = () => {
    const turnOn = all.getAttribute("aria-pressed") !== "true";
    all.setAttribute("aria-pressed", String(turnOn));
    cfg.cats = new Set(turnOn ? Object.keys(CATEGORIES) : []);
    syncChips();
  };
  wrap.appendChild(all);

  for (const [key, c] of Object.entries(CATEGORIES)) {
    const b = document.createElement("button");
    b.className = "chip";
    b.dataset.cat = key;
    b.style.color = c.color;
    b.setAttribute("aria-pressed", "true");
    b.innerHTML = `<span class="dot" style="background:${c.color}"></span>${c.name}`;
    b.onclick = () => {
      if (cfg.cats.has(key)) cfg.cats.delete(key); else cfg.cats.add(key);
      syncChips();
    };
    wrap.appendChild(b);
  }
}

function syncChips() {
  const wrap = $("cats");
  for (const b of wrap.querySelectorAll(".chip[data-cat]")) {
    b.setAttribute("aria-pressed", String(cfg.cats.has(b.dataset.cat)));
  }
  const all = wrap.querySelector(".chip.all");
  all.setAttribute("aria-pressed", String(cfg.cats.size === Object.keys(CATEGORIES).length));
}

function wireSegments() {
  $("rounds").querySelectorAll("button").forEach((b) => {
    b.onclick = () => {
      $("rounds").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      cfg.rounds = parseInt(b.dataset.rounds, 10);
    };
  });
  $("timer").querySelectorAll("button").forEach((b) => {
    b.onclick = () => {
      $("timer").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      cfg.time = parseInt(b.dataset.time, 10);
    };
  });
}

// ============================================================
//  START / BUILD QUEUE
// ============================================================
function startMatch() {
  cfg.names[0] = ($("in-name1").value.trim() || "Player 1").slice(0, 14);
  cfg.names[1] = ($("in-name2").value.trim() || "Player 2").slice(0, 14);

  if (cfg.cats.size === 0) { cfg.cats = new Set(Object.keys(CATEGORIES)); syncChips(); }

  const pool = QUESTIONS.filter((q) => cfg.cats.has(q.cat));
  const needed = cfg.rounds * 2;
  let picked = shuffle(pool).slice(0, needed);
  // if not enough unique questions, top up with reshuffled extras
  while (picked.length < needed && pool.length > 0) {
    picked = picked.concat(shuffle(pool));
    picked = picked.slice(0, needed);
  }
  queue = picked;

  game = {
    score: [0, 0],
    correct: [0, 0],
    asked: [0, 0],
    streak: [0, 0],
    bestStreak: [0, 0],
    missedCats: [{}, {}],   // category -> miss count, per player
  };
  qIndex = 0;

  // header
  $("name1").textContent = cfg.names[0];
  $("name2").textContent = cfg.names[1];
  $("score1").textContent = "0";
  $("score2").textContent = "0";
  $("streak1").textContent = "";
  $("streak2").textContent = "";
  $("scoreboard").classList.remove("hidden");

  show("play");
  renderQuestion();
}

// whose turn for a given queue index: alternate every question
function playerFor(i) { return i % 2; }   // 0 => Jordan, 1 => Athena

// ============================================================
//  RENDER A QUESTION
// ============================================================
function renderQuestion() {
  answered = false;
  clearTimer();

  const q = queue[qIndex];
  const p = playerFor(qIndex);
  const cat = CATEGORIES[q.cat];

  // turn indicator + scoreboard active state
  const who = $("turnWho");
  who.textContent = `${cfg.names[p]}'s turn`;
  who.className = "turn-who " + (p === 0 ? "p1" : "p2");
  $("card1").classList.toggle("active", p === 0);
  $("card2").classList.toggle("active", p === 1);

  $("qcount").textContent = `Q ${qIndex + 1} / ${queue.length}`;
  const pill = $("catPill");
  pill.textContent = cat.name;
  pill.style.background = cat.color;

  $("qtext").textContent = q.q;
  $("qtext").classList.remove("pop"); void $("qtext").offsetWidth; $("qtext").classList.add("pop");

  // answers — present shuffled so position isn't a tell
  const order = shuffle(q.choices.map((c, i) => ({ c, i })));
  const ans = $("answers");
  ans.innerHTML = "";
  order.forEach((opt, displayIdx) => {
    const btn = document.createElement("button");
    btn.className = "answer";
    btn.innerHTML = `<span class="key">${KEYS[displayIdx]}</span><span>${opt.c}</span>`;
    btn.onclick = () => choose(btn, opt.i === q.answer, q);
    ans.appendChild(btn);
  });

  // explanation/next hidden
  $("explain").classList.add("hidden");
  $("nextRow").classList.add("hidden");

  // timer
  if (cfg.time > 0) {
    $("timerWrap").classList.remove("hidden");
    startTimer(q);
  } else {
    $("timerWrap").classList.add("hidden");
  }
}

// ============================================================
//  TIMER
// ============================================================
function startTimer(q) {
  timeLeft = cfg.time;
  const fill = $("timerFill");
  fill.style.width = "100%";
  const tick = 100; // ms
  const total = cfg.time * 1000;
  let elapsed = 0;
  timerId = setInterval(() => {
    elapsed += tick;
    timeLeft = Math.max(0, (total - elapsed) / 1000);
    fill.style.width = (100 * (total - elapsed) / total) + "%";
    if (elapsed >= total) {
      clearTimer();
      if (!answered) timeUp(q);
    }
  }, tick);
}
function clearTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }

function timeUp(q) {
  answered = true;
  const p = playerFor(qIndex);
  game.asked[p]++;
  game.streak[p] = 0;
  bumpMiss(p, q.cat);
  updateStreakLabel(p);
  // reveal correct answer
  revealAnswers(q, null);
  showExplain(false, q, "⏰ Time's up!");
}

// ============================================================
//  ANSWER HANDLING
// ============================================================
function choose(btn, isCorrect, q) {
  if (answered) return;
  answered = true;
  clearTimer();

  const p = playerFor(qIndex);
  game.asked[p]++;

  let gained = 0;
  if (isCorrect) {
    game.correct[p]++;
    game.streak[p]++;
    game.bestStreak[p] = Math.max(game.bestStreak[p], game.streak[p]);
    // base 100, speed bonus up to +50, streak multiplier
    const speedBonus = cfg.time > 0 ? Math.round(50 * (timeLeft / cfg.time)) : 0;
    const mult = 1 + 0.25 * (game.streak[p] - 1); // 1x, 1.25x, 1.5x ...
    gained = Math.round((100 + speedBonus) * mult);
    game.score[p] += gained;
  } else {
    game.streak[p] = 0;
    bumpMiss(p, q.cat);
  }

  updateScore(p, gained);
  updateStreakLabel(p);
  revealAnswers(q, btn);
  showExplain(isCorrect, q, isCorrect ? `✓ +${gained} points` : "✗ Not quite");
}

function revealAnswers(q, chosenBtn) {
  const buttons = [...$("answers").children];
  buttons.forEach((b) => {
    b.disabled = true;
    const txt = b.querySelector("span:last-child").textContent;
    const correctText = q.choices[q.answer];
    if (txt === correctText) b.classList.add("correct");
    else if (b === chosenBtn) b.classList.add("wrong");
    else b.classList.add("dim");
  });
}

function showExplain(good, q, verdictText) {
  const ex = $("explain");
  const v = $("verdict");
  v.textContent = verdictText;
  v.className = "verdict " + (good ? "good" : "bad");
  $("explainText").innerHTML = `<b>Why:</b> ${q.why}`;
  ex.classList.remove("hidden");
  ex.classList.remove("pop"); void ex.offsetWidth; ex.classList.add("pop");

  // next button (or finish)
  const nr = $("nextRow");
  nr.classList.remove("hidden");
  $("next").textContent = (qIndex + 1 >= queue.length) ? "See results  🏁" : "Next  ➜";
}

function bumpMiss(p, cat) { game.missedCats[p][cat] = (game.missedCats[p][cat] || 0) + 1; }

// ---------- scoreboard updates ----------
function updateScore(p, gained) {
  const el = $(p === 0 ? "score1" : "score2");
  el.textContent = game.score[p];
  if (gained > 0) { el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); }
}
function updateStreakLabel(p) {
  const el = $(p === 0 ? "streak1" : "streak2");
  const s = game.streak[p];
  el.textContent = s >= 2 ? `🔥 ${s} streak (${1 + 0.25 * (s - 1)}x)` : "";
}

// ============================================================
//  NEXT / END
// ============================================================
function next() {
  qIndex++;
  if (qIndex >= queue.length) return endMatch();
  renderQuestion();
}

function endMatch() {
  clearTimer();
  const [s1, s2] = game.score;
  $("end-name1").textContent = cfg.names[0];
  $("end-name2").textContent = cfg.names[1];
  $("end-score1").textContent = s1;
  $("end-score2").textContent = s2;
  $("end-correct1").textContent = `${game.correct[0]}/${game.asked[0]}`;
  $("end-correct2").textContent = `${game.correct[1]}/${game.asked[1]}`;
  $("end-streak1").textContent = game.bestStreak[0];
  $("end-streak2").textContent = game.bestStreak[1];

  const line = $("winnerLine");
  if (s1 === s2) {
    $("trophy").textContent = "🤝";
    line.textContent = "It's a tie!";
  } else {
    const w = s1 > s2 ? 0 : 1;
    $("trophy").textContent = "🏆";
    line.innerHTML = `<span style="color:${w === 0 ? "var(--p1)" : "var(--p2)"}">${cfg.names[w]}</span> wins!`;
  }

  $("review").innerHTML = buildReview();
  show("end");
}

function buildReview() {
  // combined topics-to-review across both players
  const combined = {};
  [0, 1].forEach((p) => {
    for (const [cat, n] of Object.entries(game.missedCats[p])) combined[cat] = (combined[cat] || 0) + n;
  });
  const sorted = Object.entries(combined).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) {
    return `<h3>📚 Topics to review</h3>Flawless round — no missed topics. Athena's ready. 🎉`;
  }
  const items = sorted.map(([cat, n]) =>
    `<span style="color:${CATEGORIES[cat].color};font-weight:800">${CATEGORIES[cat].name}</span> (${n} missed)`
  ).join(" · ");
  return `<h3>📚 Topics to review</h3>${items}`;
}

// ============================================================
//  SCREEN ROUTING
// ============================================================
function show(name) {
  ["setup", "play", "end"].forEach((s) => $(s).classList.toggle("hidden", s !== name));
  if (name !== "play") { /* keep scoreboard visible during end, hide on setup */ }
  $("scoreboard").classList.toggle("hidden", name === "setup");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ============================================================
//  INIT
// ============================================================
function init() {
  buildCatChips();
  wireSegments();
  $("start").onclick = startMatch;
  $("next").onclick = next;
  $("again").onclick = startMatch;
  $("reconfig").onclick = () => { clearTimer(); $("scoreboard").classList.add("hidden"); show("setup"); };

  // keyboard: A-D to answer, Enter/Space for next
  document.addEventListener("keydown", (e) => {
    if (!$("play").classList.contains("hidden")) {
      const k = e.key.toUpperCase();
      if (!answered && ["A", "B", "C", "D"].includes(k)) {
        const idx = KEYS.indexOf(k);
        const btn = $("answers").children[idx];
        if (btn) btn.click();
      } else if (answered && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        next();
      }
    }
  });
}

init();
