/* The Longevity Blender
 * ---------------------------------------------------------------------------
 * A parody calculator. Each "factor" carries options with a `years` delta and a
 * one-line citation to a real, widely-reported observational study. The whole
 * conceit is that you are NEVER supposed to add these together — so we do.
 *
 * Baseline: 78.5 years, roughly US period life expectancy at birth.
 * ------------------------------------------------------------------------- */

const BASE = 78.5;
const AVG_AMERICAN = 78.5;

/* ---- The lifestyle menu -------------------------------------------------- */
/* Each factor: { id, icon, label, kind, options[] } or a slider spec.
 * option: { label, years, note }  — note is the "study says" microcopy.       */

const FACTORS = [
  {
    id: "smoke", icon: "🚬", label: "Smoking",
    blurb: "The one everyone actually agrees on.",
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
  {
    id: "avg", label: "The Average American", emoji: "🇺🇸",
    // leave everything at defaults
    set: {},
  },
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
FACTORS.forEach(f => { state[f.id] = f.default; });

/* ---- Rendering the controls --------------------------------------------- */
const factorsEl = document.getElementById("factors");

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
      b.addEventListener("click", () => { state[f.id] = i; recompute(); });
      seg.appendChild(b);
    });
    card.appendChild(seg);
  } else if (f.kind === "slider") {
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
    input.addEventListener("input", () => { state[f.id] = +input.value; recompute(); });
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
const presetsEl = document.getElementById("presets");
PRESETS.forEach(p => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "preset";
  b.innerHTML = `<span class="preset-emoji">${p.emoji}</span> ${p.label}`;
  b.addEventListener("click", () => applyPreset(p));
  presetsEl.appendChild(b);
});

function applyPreset(p) {
  FACTORS.forEach(f => { state[f.id] = f.default; });
  Object.entries(p.set).forEach(([k, v]) => { state[k] = v; });
  document.querySelectorAll(".preset").forEach(el => el.classList.remove("active"));
  const idx = PRESETS.indexOf(p);
  presetsEl.children[idx].classList.add("active");
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
  let total = 0;
  const parts = [];
  FACTORS.forEach(f => {
    const c = factorContribution(f);
    total += c.years;
    parts.push({ f, ...c });
  });
  return { age: BASE + total, delta: total, parts };
}

/* ---- Verdict copy -------------------------------------------------------- */
function verdictCopy(age, delta) {
  if (age >= 115) return "You have exited the actuarial tables and entered fan-fiction. Somewhere a demographer is weeping.";
  if (age >= 105) return "Blue-Zone cover model. The studies, stacked, have made you effectively immortal. The studies are lying.";
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
function animateTo(target) {
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

/* ---- Main recompute ------------------------------------------------------ */
const receiptList = document.getElementById("receiptList");

function recompute(syncControls = false) {
  const { age, delta, parts } = compute();

  // Big readout + life bar
  animateTo(age);
  document.getElementById("ageBig").className = "odometer";
  const fillPct = Math.max(4, Math.min(100, (age / 120) * 100));
  document.getElementById("lifebarFill").style.width = fillPct + "%";
  const avgPct = (AVG_AMERICAN / 120) * 100;
  document.getElementById("lifebarAvg").style.left = avgPct + "%";

  // Verdict block
  document.getElementById("verdictLine").textContent = verdictCopy(age, delta);
  const vs = age - AVG_AMERICAN;
  const vsEl = document.getElementById("vsAvg");
  vsEl.textContent = (vs >= 0 ? "+" : "−") + Math.abs(vs).toFixed(1) + " yrs";
  vsEl.className = vs >= 0 ? "pos" : "neg";
  const bonusEl = document.getElementById("bonusYears");
  bonusEl.textContent = (delta >= 0 ? "+" : "−") + Math.abs(delta).toFixed(1) + " yrs";
  bonusEl.className = delta >= 0 ? "pos" : "neg";

  // Color the verdict panel by health
  const verdict = document.getElementById("verdict");
  verdict.classList.toggle("thriving", age >= 88);
  verdict.classList.toggle("struggling", age < 72);

  // Per-factor UI: highlight selection, show delta + note
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
      const pct = ((state[f.id] - f.min) / (f.max - f.min)) * 100;
      input.style.setProperty("--pct", pct + "%");
    }
    const d = card.querySelector("[data-delta]");
    d.textContent = (c.years >= 0 ? "+" : "−") + Math.abs(c.years).toFixed(1);
    d.className = "factor-delta " + (c.years > 0 ? "pos" : c.years < 0 ? "neg" : "neutral");
    card.querySelector("[data-note]").textContent = c.note;
  });

  // Sync segmented buttons when a preset was applied
  if (syncControls) {
    FACTORS.filter(f => f.kind === "choice").forEach(f => {
      const card = factorsEl.querySelector(`.factor[data-id="${f.id}"]`);
      card.querySelectorAll(".seg-btn").forEach(b =>
        b.classList.toggle("on", +b.dataset.i === state[f.id]));
    });
  }

  // The receipt — sorted by magnitude, non-zero first
  const sorted = parts.slice().sort((a, b) => Math.abs(b.years) - Math.abs(a.years));
  receiptList.innerHTML = "";
  sorted.forEach(p => {
    const li = document.createElement("li");
    const cls = p.years > 0 ? "pos" : p.years < 0 ? "neg" : "neutral";
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
}

/* ---- Reset --------------------------------------------------------------- */
document.getElementById("reset").addEventListener("click", () => applyPreset(PRESETS[0]));

/* ---- Boot ---------------------------------------------------------------- */
document.getElementById("lifebarAvg").title = "Average American: " + AVG_AMERICAN + " yrs";
applyPreset(PRESETS[0]);
