/* The Longevity Blender
 * ---------------------------------------------------------------------------
 * A parody calculator. Each "factor" carries options with a `years` delta and a
 * one-line citation to a real, widely-reported observational study. The whole
 * conceit is that you are NEVER supposed to add these together — so we do, and
 * then we show you the (still generous) number you'd get if you didn't.
 *
 * Baseline: 78.5 years, roughly US period life expectancy at birth.
 * ------------------------------------------------------------------------- */

const BASE = 78.5;
const AVG_AMERICAN = 78.5;

/* ---- The lifestyle menu -------------------------------------------------- */
/* Each factor: { id, icon, label, blurb, press, kind, default, options[] }
 * or a slider spec. `press` is the breathless headline the study spawned.
 * option: { label, years, note } — note is the "study says" microcopy.        */

const FACTORS = [
  {
    id: "smoke", icon: "🚬", label: "Smoking",
    blurb: "The one everyone actually agrees on.",
    press: "The Single Habit Doctors Beg You To Quit",
    kind: "choice", default: 0,
    options: [
      { label: "Never touched it", years: 0,   note: "Reference. Your lungs send their regards." },
      { label: "Quit years ago",   years: -1,  note: "Jha, NEJM 2013 — quitting before 40 dodges ~90% of the risk." },
      { label: "Socially / vaping", years: -3, note: "Even light smoking roughly doubles mortality vs never." },
      { label: "A pack a day",      years: -10, note: "Jha, NEJM 2013 — lifelong smokers lose about a decade." },
    ],
  },
  {
    id: "drink", icon: "🍷", label: "Alcohol",
    blurb: "The correlation science spent 40 years walking back.",
    press: "A Daily Glass Of Red Wine Could Be The Secret To Longevity",
    kind: "choice", default: 1,
    options: [
      { label: "Teetotal",            years: -0.5, note: "'Sick-quitter' effect — some never-drinkers were told to stop." },
      { label: "The odd one",         years: 0.5,  note: "Light drinkers looked healthiest in the old J-curve studies." },
      { label: "A glass of red, daily", years: 1.5, note: "The legendary 'red wine is good for you' correlation. (It wasn't.)" },
      { label: "Enthusiastically",    years: -5,   note: "Heavy drinking, GBD 2018 — the J-curve's other, steeper arm." },
    ],
  },
  {
    id: "spicy", icon: "🌶️", label: "Spicy food",
    blurb: "Straight from the tweet that started this.",
    press: "Scientists Discover The Spicy Secret To A Longer Life",
    kind: "choice", default: 0,
    options: [
      { label: "Keep it mild",  years: 0,   note: "Reference. Lv et al., BMJ 2015 (500,000 adults)." },
      { label: "Now and then",  years: 0.5, note: "Occasional chili eaters, BMJ 2015 — HR ~0.90." },
      { label: "Twice a week",  years: 1.3, note: "BMJ 2015 — regular spice, ~10–14% lower mortality." },
      { label: "Face melting",  years: 2,   note: "Near-daily chili, BMJ 2015 — the biggest slice of the benefit." },
    ],
  },
  {
    id: "steps", icon: "👟", label: "Daily steps",
    blurb: "The number your watch nags you about.",
    press: "Forget 10,000 — This Is The Magic Step Count, Says Study",
    kind: "slider", min: 2000, max: 16000, step: 500, default: 5000,
    fmt: (v) => v.toLocaleString() + " steps",
    yearsFor: (v) => {
      // Paluch et al., Lancet Public Health 2022: benefit rises to ~7.5–9k, then plateaus.
      if (v <= 2000) return -2.5;
      if (v <= 4000) return -2.5 + ((v - 2000) / 2000) * 2.5;      // -2.5 -> 0
      if (v <= 7500) return ((v - 4000) / 3500) * 2.2;             // 0 -> +2.2
      if (v <= 10000) return 2.2 + ((v - 7500) / 2500) * 0.8;      // +2.2 -> +3.0
      return 3.0 - ((Math.min(v, 16000) - 10000) / 6000) * 0.3;    // gentle plateau
    },
    noteFor: (v) => v < 4000
      ? "Paluch 2022 — under ~4k steps is the danger zone."
      : v < 7500 ? "Paluch 2022 — climbing toward the sweet spot."
      : v <= 10000 ? "Paluch 2022 — 7.5–10k is peak return."
      : "Paluch 2022 — past ~10k the curve flattens; keep the knees.",
  },
  {
    id: "sleep", icon: "😴", label: "Sleep",
    blurb: "A U-shape, so more is not better.",
    press: "Why Getting Too Much Sleep Is Secretly Killing You",
    kind: "choice", default: 1,
    options: [
      { label: "≤ 5 hours", years: -4,   note: "Cappuccio 2010 meta-analysis — short sleep, ~12% higher mortality." },
      { label: "6 hours",   years: -0.5, note: "Slightly below optimal; the body notices." },
      { label: "7 hours",   years: 1.5,  note: "The bottom of the U-curve. Statistically ideal." },
      { label: "8 hours",   years: 0.8,  note: "Fine — a touch past the sweet spot." },
      { label: "9+ hours",  years: -1.5, note: "Long sleep tracks with mortality too (mostly reverse causation)." },
    ],
  },
  {
    id: "friends", icon: "🫂", label: "Social life",
    blurb: "Rated 'as strong as quitting smoking.'",
    press: "Loneliness Is As Deadly As 15 Cigarettes A Day",
    kind: "choice", default: 1,
    options: [
      { label: "Lone wolf",        years: -4, note: "Holt-Lunstad 2010 — loneliness rivals smoking as a killer." },
      { label: "A few close ones", years: 1,  note: "Solid ties, ~50% better survival odds." },
      { label: "Deeply connected", years: 4,  note: "Holt-Lunstad 2010 — the top slice matches quitting a pack a day." },
    ],
  },
  {
    id: "optimism", icon: "🌤️", label: "Outlook",
    blurb: "Yes, a personality trait is on the menu.",
    press: "Optimists Live Longer — Here's The Proof, Says Harvard",
    kind: "choice", default: 1,
    options: [
      { label: "Glass half empty", years: -2, note: "Pessimists fared worst in the Lee 2019 cohort." },
      { label: "Realist",          years: 0,  note: "Reference. No points for pragmatism." },
      { label: "Relentlessly sunny", years: 4, note: "Lee et al., PNAS 2019 — top optimists lived 11–15% longer." },
    ],
  },
  {
    id: "coffee", icon: "☕", label: "Coffee",
    blurb: "Cups per day. Diminishing, then jittery.",
    press: "Three Cups Of Coffee A Day Keeps The Reaper Away",
    kind: "choice", default: 1,
    options: [
      { label: "None",     years: 0,   note: "Reference. Brave." },
      { label: "1 cup",    years: 0.6, note: "Poole 2017 umbrella review — the curve starts down." },
      { label: "2–3 cups", years: 1.5, note: "Poole 2017 — ~3 cups was the mortality low point." },
      { label: "4–5 cups", years: 1.7, note: "Still protective; your dentist has notes." },
      { label: "6+ cups",  years: 0.4, note: "Benefit fades; the jitters do not." },
    ],
  },
  {
    id: "nuts", icon: "🥜", label: "Nuts",
    blurb: "A daily handful, per Harvard.",
    press: "A Handful Of Nuts A Day Slashes Your Death Risk",
    kind: "choice", default: 0,
    options: [
      { label: "Rarely",         years: 0,   note: "Reference." },
      { label: "A few times a week", years: 0.6, note: "Bao et al., NEJM 2013 — dose-dependent benefit." },
      { label: "A handful daily",years: 2,   note: "Bao 2013 — daily nut eaters, ~20% lower mortality." },
    ],
  },
  {
    id: "veg", icon: "🥦", label: "Fruit & veg",
    blurb: "The '5-a-day' you keep meaning to hit.",
    press: "Eating This Many Vegetables Adds Years To Your Life",
    kind: "choice", default: 1,
    options: [
      { label: "Beige diet",     years: -1.5, note: "Aune 2017 — low intake, higher risk across the board." },
      { label: "Some most days", years: 0,    note: "Reference-ish." },
      { label: "5+ servings",    years: 2.5,  note: "Aune 2017 meta-analysis — ~10–31% lower mortality." },
    ],
  },
  {
    id: "meat", icon: "🥩", label: "Red meat",
    blurb: "Each daily serving quietly bills you.",
    press: "That Daily Steak Is Costing You More Than You Think",
    kind: "choice", default: 2,
    options: [
      { label: "None",            years: 1,    note: "Plant-forward diets track with lower mortality." },
      { label: "Weekly",          years: 0,    note: "Reference." },
      { label: "Several times a week", years: -0.8, note: "Pan et al., 2012 — risk climbs with each serving." },
      { label: "Daily steak",     years: -2.5, note: "Pan 2012 — one daily serving, ~13% higher mortality." },
    ],
  },
  {
    id: "sauna", icon: "🧖", label: "Sauna",
    blurb: "The Finns ran the numbers on this.",
    press: "The Finnish Habit That Cuts Heart-Death Risk By 40%",
    kind: "choice", default: 0,
    options: [
      { label: "Never",       years: 0,   note: "Reference." },
      { label: "Once a week", years: 0.8, note: "Laukkanen 2015 — even weekly helps." },
      { label: "4–7x a week", years: 3,   note: "Laukkanen 2015 — frequent sauna, ~40% lower mortality." },
    ],
  },
  {
    id: "dog", icon: "🐕", label: "Pets",
    blurb: "Companionship, plus involuntary steps.",
    press: "Owning A Dog Could Literally Save Your Life, Study Finds",
    kind: "choice", default: 0,
    options: [
      { label: "Pet-free",   years: 0,   note: "Reference." },
      { label: "A cat",      years: 0.5, note: "Some benefit; the cat is unimpressed." },
      { label: "A dog",      years: 2.5, note: "Kramer 2019 meta-analysis — ~24% lower all-cause mortality." },
    ],
  },
  {
    id: "sit", icon: "🪑", label: "Sitting",
    blurb: "The 'new smoking,' allegedly.",
    press: "Sitting Is The New Smoking, Experts Warn",
    kind: "choice", default: 2,
    options: [
      { label: "< 4 hrs / day",  years: 1,    note: "Low sedentary time, better outcomes." },
      { label: "4–8 hrs",        years: 0,    note: "Reference. The modern default." },
      { label: "8–11 hrs",       years: -1.5, note: "van der Ploeg 2012 — long sitting raises risk." },
      { label: "11+ hrs (desk life)", years: -3, note: "van der Ploeg 2012 — 40% higher mortality vs < 4 hrs." },
    ],
  },
  {
    id: "floss", icon: "🦷", label: "Flossing",
    blurb: "Gum bacteria vs. your arteries.",
    press: "The 30-Second Bathroom Habit That Protects Your Heart",
    kind: "choice", default: 1,
    options: [
      { label: "What floss?", years: -1,   note: "Periodontal disease tracks with heart disease." },
      { label: "Sometimes",   years: 0,    note: "Reference." },
      { label: "Daily, smugly", years: 1.5, note: "Regular flossers show lower cardiovascular risk (association!)." },
    ],
  },
  {
    id: "bmi", icon: "⚖️", label: "Weight",
    blurb: "The 'obesity paradox' makes an appearance.",
    press: "The Surprising Truth About Weight And How Long You'll Live",
    kind: "choice", default: 1,
    options: [
      { label: "Underweight",   years: -2,  note: "Low BMI tracks with higher mortality (often illness-driven)." },
      { label: "Healthy range", years: 1,   note: "The reference the studies love." },
      { label: "Overweight",    years: -0.5, note: "Flegal 2013 — the surprisingly flat, hotly-argued middle." },
      { label: "Obese",         years: -3,  note: "Global BMI Collaboration 2016 — clear excess risk." },
    ],
  },
];

/* ---- Presets ------------------------------------------------------------- */
const PRESETS = [
  { id: "avg", label: "The Average American", emoji: "🇺🇸", set: {} },
  {
    id: "bro", label: "The Optimization Bro", emoji: "🧬",
    set: { smoke:0, drink:1, spicy:3, steps:12000, sleep:2, friends:2, optimism:2,
           coffee:2, nuts:2, veg:2, meat:0, sauna:2, dog:2, sit:0, floss:2, bmi:1 },
  },
  {
    id: "zone", label: "The Blue-Zone Centenarian", emoji: "🫒",
    set: { smoke:0, drink:2, spicy:2, steps:9000, sleep:2, friends:2, optimism:2,
           coffee:2, nuts:2, veg:2, meat:0, sauna:1, dog:1, sit:0, floss:2, bmi:1 },
  },
  {
    id: "fast", label: "Live Fast", emoji: "🔥",
    set: { smoke:3, drink:3, spicy:1, steps:3000, sleep:0, friends:0, optimism:0,
           coffee:4, nuts:0, veg:0, meat:3, sauna:0, dog:0, sit:3, floss:0, bmi:3 },
  },
];

/* ---- State --------------------------------------------------------------- */
const state = {};
let currentAge = null;
FACTORS.forEach(f => { state[f.id] = f.default; });

/* ---- DOM refs ------------------------------------------------------------ */
const factorsEl = document.getElementById("factors");
const presetsEl = document.getElementById("presets");
const receiptList = document.getElementById("receiptList");
const ingredientsEl = document.getElementById("ingredients");

/* ---- Build the controls -------------------------------------------------- */
function buildFactor(f) {
  const card = document.createElement("div");
  card.className = "factor";
  card.dataset.id = f.id;

  const head = document.createElement("div");
  head.className = "factor-head";
  head.innerHTML =
    `<span class="factor-icon">${f.icon}</span>` +
    `<div class="factor-title"><h3>${f.label}</h3><p>${f.blurb}</p></div>` +
    `<span class="factor-delta" data-delta></span>`;
  card.appendChild(head);

  const press = document.createElement("p");
  press.className = "factor-press";
  press.innerHTML = `<span class="press-tag">As seen in the news</span> “${f.press}”`;
  card.appendChild(press);

  if (f.kind === "choice") {
    const seg = document.createElement("div");
    seg.className = "seg";
    seg.setAttribute("role", "radiogroup");
    seg.setAttribute("aria-label", f.label);
    f.options.forEach((opt, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "seg-btn";
      b.textContent = opt.label;
      b.setAttribute("role", "radio");
      b.dataset.i = i;
      b.addEventListener("click", () => { state[f.id] = i; clearPresetHighlight(); syncURL(); recompute(); });
      seg.appendChild(b);
    });
    card.appendChild(seg);
  } else {
    const wrap = document.createElement("div");
    wrap.className = "slider-wrap";
    const val = document.createElement("div");
    val.className = "slider-val";
    val.dataset.val = "";
    const input = document.createElement("input");
    input.type = "range";
    input.min = f.min; input.max = f.max; input.step = f.step;
    input.value = f.default;
    input.setAttribute("aria-label", f.label);
    input.addEventListener("input", () => { state[f.id] = +input.value; clearPresetHighlight(); syncURL(); recompute(); });
    wrap.appendChild(val);
    wrap.appendChild(input);
    card.appendChild(wrap);
  }

  const note = document.createElement("p");
  note.className = "factor-note";
  note.dataset.note = "";
  card.appendChild(note);

  factorsEl.appendChild(card);
}
FACTORS.forEach(buildFactor);

/* ---- Presets UI ---------------------------------------------------------- */
PRESETS.forEach(p => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "preset";
  b.innerHTML = `<span class="preset-emoji">${p.emoji}</span> ${p.label}`;
  b.addEventListener("click", () => applyPreset(p));
  presetsEl.appendChild(b);
});

function clearPresetHighlight() {
  document.querySelectorAll(".preset").forEach(el => el.classList.remove("active"));
}

function applyPreset(p) {
  FACTORS.forEach(f => { state[f.id] = f.default; });
  Object.entries(p.set).forEach(([k, v]) => { state[k] = v; });
  clearPresetHighlight();
  presetsEl.children[PRESETS.indexOf(p)].classList.add("active");
  syncURL();
  recompute(true);
}

/* ---- The math ------------------------------------------------------------ */
function factorContribution(f) {
  if (f.kind === "choice") {
    const opt = f.options[state[f.id]];
    return { years: opt.years, note: opt.note, valueLabel: opt.label };
  }
  const v = state[f.id];
  return { years: f.yearsFor(v), note: f.noteFor(v), valueLabel: f.fmt(v) };
}

function compute() {
  let total = 0, pos = 0, neg = 0;
  const parts = [];
  FACTORS.forEach(f => {
    const c = factorContribution(f);
    total += c.years;
    if (c.years > 0) pos += c.years; else neg += c.years;
    parts.push({ f, ...c });
  });

  // "With a straight face": diminishing returns instead of naive addition.
  // Your third good habit doesn't pay like your first; harms diminish too, slower.
  const sanePos = 12 * (1 - Math.exp(-pos / 10));
  const saneNeg = -18 * (1 - Math.exp(-Math.abs(neg) / 12));
  const saneAge = Math.max(46, Math.min(97, BASE + sanePos + saneNeg));

  return { age: BASE + total, saneAge, delta: total, parts };
}

/* ---- Verdict copy -------------------------------------------------------- */
function verdictCopy(age) {
  if (age >= 115) return "You have exited the actuarial tables and entered fan-fiction. Somewhere a demographer is weeping.";
  if (age >= 105) return "Blue-Zone cover model. Stacked, the studies have made you effectively immortal. The studies are lying.";
  if (age >= 95)  return "You've out-scienced mortality. Frame this and show your cardiologist, who will sigh.";
  if (age >= 88)  return "Comfortably above the curve. Every green line on the receipt is buying you a birthday.";
  if (age >= 80)  return "Solidly better than average. The correlations approve of your choices.";
  if (age >= 72)  return "Roughly average, which is to say: roughly human. Science shrugs supportively.";
  if (age >= 62)  return "The receipt is bleeding red. Several studies would like a word.";
  return "Science is genuinely concerned and has scheduled a follow-up. Consider un-stacking a habit or two.";
}

/* ---- Odometer animation -------------------------------------------------- */
let animRAF = null;
let shownAge = BASE;
let confettiArmed = false;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

function animateTo(target) {
  if (reduceMotion) { shownAge = target; document.getElementById("ageBig").textContent = Math.round(target); return; }
  cancelAnimationFrame(animRAF);
  const start = shownAge;
  const t0 = performance.now();
  const dur = 520;
  function frame(now) {
    const p = Math.min(1, (now - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    shownAge = start + (target - start) * eased;
    document.getElementById("ageBig").textContent = Math.round(shownAge);
    if (p < 1) animRAF = requestAnimationFrame(frame);
  }
  animRAF = requestAnimationFrame(frame);
}

/* ---- The glass / ingredients -------------------------------------------- */
function tierOf(age) { return age >= 88 ? "thriving" : age < 72 ? "struggling" : "ok"; }

function paintGlass(age, parts) {
  const liquid = document.getElementById("liquid");
  const fillPct = Math.max(6, Math.min(100, ((age - 40) / (120 - 40)) * 100));
  liquid.style.height = fillPct + "%";
  const tier = tierOf(age);
  liquid.dataset.tier = tier;

  // Floating ingredients = the habits currently moving the needle most.
  const movers = parts.filter(p => Math.abs(p.years) >= 0.5)
                      .sort((a, b) => Math.abs(b.years) - Math.abs(a.years))
                      .slice(0, 7);
  const want = movers.map(p => p.f.id).join(",");
  if (ingredientsEl.dataset.sig === want) return; // avoid re-spawning every tick
  ingredientsEl.dataset.sig = want;
  ingredientsEl.innerHTML = "";
  movers.forEach((p, i) => {
    const s = document.createElement("span");
    s.className = "ingredient " + (p.years > 0 ? "good" : "bad");
    s.textContent = p.f.icon;
    s.style.left = (10 + (i * 12) + Math.random() * 6) + "%";
    s.style.animationDelay = (Math.random() * -6).toFixed(2) + "s";
    s.style.animationDuration = (5 + Math.random() * 3).toFixed(2) + "s";
    ingredientsEl.appendChild(s);
  });
}

/* ---- Confetti (only when you break 100) --------------------------------- */
function confetti() {
  if (reduceMotion) return;
  const colors = ["#7bdc8c", "#4cc7d4", "#8affc1", "#ffd166", "#ff9aa2"];
  for (let i = 0; i < 90; i++) {
    const c = document.createElement("div");
    c.className = "confetti-bit";
    c.style.left = Math.random() * 100 + "vw";
    c.style.background = colors[i % colors.length];
    c.style.animationDelay = (Math.random() * 0.3).toFixed(2) + "s";
    c.style.animationDuration = (2.2 + Math.random() * 1.4).toFixed(2) + "s";
    c.style.transform = `rotate(${Math.random() * 360}deg)`;
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 4200);
  }
}

/* ---- Main recompute ------------------------------------------------------ */
function recompute(syncControls = false) {
  const { age, saneAge, delta, parts } = compute();

  animateTo(age);
  const roundAge = Math.round(age);

  // Life bar
  const fillPct = Math.max(4, Math.min(100, (age / 120) * 100));
  document.getElementById("lifebarFill").style.width = fillPct + "%";
  document.getElementById("lifebarAvg").style.left = ((AVG_AMERICAN / 120) * 100) + "%";

  // The glass
  paintGlass(age, parts);

  // Second number (the honest one)
  document.getElementById("saneAge").textContent = Math.round(saneAge) + " yrs";

  // Verdict copy + tier coloring
  document.getElementById("verdictLine").textContent = verdictCopy(age);
  const blend = document.getElementById("blend");
  blend.classList.toggle("thriving", age >= 88);
  blend.classList.toggle("struggling", age < 72);

  // Stats
  const vs = age - AVG_AMERICAN;
  const vsEl = document.getElementById("vsAvg");
  vsEl.textContent = (vs >= 0 ? "+" : "−") + Math.abs(vs).toFixed(1) + " yrs";
  vsEl.className = vs >= 0 ? "pos" : "neg";
  const bonusEl = document.getElementById("bonusYears");
  bonusEl.textContent = (delta >= 0 ? "+" : "−") + Math.abs(delta).toFixed(1) + " yrs";
  bonusEl.className = delta >= 0 ? "pos" : "neg";

  // Years remaining (only if the user told us their age)
  const remRow = document.getElementById("remainingRow");
  const youMark = document.getElementById("lifebarYou");
  if (currentAge != null) {
    remRow.hidden = false;
    const left = roundAge - currentAge;
    const yl = document.getElementById("yearsLeft");
    yl.textContent = left > 0 ? left + " yrs" : "borrowed time";
    yl.className = left > 3 ? "pos" : left > 0 ? "" : "neg";
    youMark.hidden = false;
    youMark.style.left = Math.min(100, (currentAge / 120) * 100) + "%";
  } else {
    remRow.hidden = true;
    youMark.hidden = true;
  }

  // Confetti when the literal number crosses 100 (once per crossing)
  if (roundAge >= 100 && !confettiArmed) { confetti(); confettiArmed = true; }
  if (roundAge < 100) confettiArmed = false;

  // Per-factor UI
  FACTORS.forEach(f => {
    const card = factorsEl.querySelector(`.factor[data-id="${f.id}"]`);
    const c = factorContribution(f);
    if (f.kind === "choice") {
      card.querySelectorAll(".seg-btn").forEach(b => {
        const on = +b.dataset.i === state[f.id];
        b.classList.toggle("on", on);
        b.setAttribute("aria-checked", on ? "true" : "false");
      });
    } else {
      const input = card.querySelector("input[type=range]");
      if (syncControls) input.value = state[f.id];
      card.querySelector("[data-val]").textContent = f.fmt(state[f.id]);
      input.style.setProperty("--pct", (((state[f.id] - f.min) / (f.max - f.min)) * 100) + "%");
    }
    const d = card.querySelector("[data-delta]");
    d.textContent = (c.years >= 0 ? "+" : "−") + Math.abs(c.years).toFixed(1);
    d.className = "factor-delta " + (c.years > 0 ? "pos" : c.years < 0 ? "neg" : "neutral");
    card.querySelector("[data-note]").textContent = c.note;
  });

  // The receipt — sorted by magnitude
  const sorted = parts.slice().sort((a, b) => Math.abs(b.years) - Math.abs(a.years));
  receiptList.innerHTML = "";
  sorted.forEach(p => {
    const cls = p.years > 0 ? "pos" : p.years < 0 ? "neg" : "neutral";
    const li = document.createElement("li");
    li.className = "receipt-item " + cls;
    li.innerHTML =
      `<span class="ri-icon">${p.f.icon}</span>` +
      `<span class="ri-main"><strong>${p.f.label}</strong>` +
      `<em>${p.valueLabel}</em>` +
      `<span class="ri-note">${p.note}</span></span>` +
      `<span class="ri-years ${cls}">${p.years >= 0 ? "+" : "−"}${Math.abs(p.years).toFixed(1)}</span>`;
    receiptList.appendChild(li);
  });
  const tot = document.getElementById("receiptTotal");
  tot.textContent = (delta >= 0 ? "+" : "−") + Math.abs(delta).toFixed(1) + " yrs";
  tot.className = "receipt-total-num " + (delta >= 0 ? "pos" : "neg");

  lastResult = { roundAge, saneAge: Math.round(saneAge), delta };
}
let lastResult = { roundAge: 0, saneAge: 0, delta: 0 };

/* ---- URL state (shareable) ---------------------------------------------- */
function syncURL() {
  const parts = FACTORS.map(f => `${f.id}=${state[f.id]}`);
  if (currentAge != null) parts.push(`age=${currentAge}`);
  history.replaceState(null, "", "#" + parts.join("&"));
}
function loadFromURL() {
  const h = location.hash.slice(1);
  if (!h) return false;
  const params = new URLSearchParams(h);
  let any = false;
  FACTORS.forEach(f => {
    if (!params.has(f.id)) return;
    const v = +params.get(f.id);
    if (Number.isNaN(v)) return;
    if (f.kind === "choice") { if (v >= 0 && v < f.options.length) { state[f.id] = v; any = true; } }
    else { state[f.id] = Math.max(f.min, Math.min(f.max, v)); any = true; }
  });
  if (params.has("age")) {
    const a = +params.get("age");
    if (a > 0 && a < 111) { currentAge = a; document.getElementById("ageNow").value = a; }
  }
  return any;
}

/* ---- Share --------------------------------------------------------------- */
let toastTimer = null;
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 1900);
}
async function copy(text, okMsg) {
  try {
    await navigator.clipboard.writeText(text);
    toast(okMsg);
  } catch {
    // Fallback for permission-restricted contexts
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast(okMsg); } catch { toast("Copy failed — select the address bar."); }
    ta.remove();
  }
}
function activePresetLabel() {
  const a = document.querySelector(".preset.active");
  return a ? a.textContent.trim() : null;
}
document.getElementById("copyLink").addEventListener("click", () => {
  syncURL();
  copy(location.href, "Link copied — go ruin someone's afternoon.");
});
document.getElementById("copyResult").addEventListener("click", () => {
  syncURL();
  const top = FACTORS.map(f => ({ f, ...factorContribution(f) }))
    .filter(p => p.years > 0).sort((a, b) => b.years - a.years).slice(0, 3)
    .map(p => p.f.label.toLowerCase());
  const msg =
    `🧪 Science says I'll live to ${lastResult.roundAge}` +
    ` (${lastResult.saneAge} if you make science keep a straight face).` +
    (top.length ? ` Powered by ${top.join(", ")}.` : ``) +
    ` What's your number? ${location.href}`;
  copy(msg, "Prognosis copied to clipboard.");
});

/* ---- Current-age input --------------------------------------------------- */
document.getElementById("ageNow").addEventListener("input", (e) => {
  const v = parseInt(e.target.value, 10);
  currentAge = (v > 0 && v < 111) ? v : null;
  syncURL();
  recompute();
});

/* ---- Randomize ----------------------------------------------------------- */
document.getElementById("randomize").addEventListener("click", () => {
  FACTORS.forEach(f => {
    if (f.kind === "choice") state[f.id] = Math.floor(Math.random() * f.options.length);
    else {
      const steps = Math.floor((f.max - f.min) / f.step) + 1;
      state[f.id] = f.min + Math.floor(Math.random() * steps) * f.step;
    }
  });
  clearPresetHighlight();
  syncURL();
  recompute(true);
});

/* ---- Reset --------------------------------------------------------------- */
document.getElementById("reset").addEventListener("click", () => applyPreset(PRESETS[0]));

/* ---- Boot ---------------------------------------------------------------- */
document.getElementById("lifebarAvg").title = "Average American: " + AVG_AMERICAN + " yrs";
if (loadFromURL()) {
  recompute(true);
} else {
  applyPreset(PRESETS[0]);
}
