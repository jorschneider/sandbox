#!/usr/bin/env node
/**
 * Build-time content generator for the "When China Gets a Mythos Model" microsite.
 *
 * Calls Moonshot AI's Kimi API and writes mythos/data/kimi.json, which the
 * static site renders. Run manually when you want to refresh the generated
 * content; the output JSON is committed so the site itself stays fully static.
 *
 *   KIMI_API_KEY=sk-... node tools/kimi-generate.mjs
 *
 * The key is read from the environment only — never hardcode it here.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API_KEY = process.env.KIMI_API_KEY;
if (!API_KEY) {
  console.error("KIMI_API_KEY is not set. Aborting.");
  process.exit(1);
}

const BASE = "https://api.moonshot.ai/v1/chat/completions";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "mythos", "data", "kimi.json");

const ESSAY_CONTEXT = `
You are helping illustrate a published ChinaTalk essay titled "When China Gets a
Mythos Model". The essay is an explicitly HYPOTHETICAL scenario exercise about
how Beijing might respond when a Chinese lab trains a model as capable as
Anthropic's (fictionalized) frontier model "Claude Mythos", whose cyber
capabilities pushed Washington into a de facto licensing regime. The essay
invents a fictional model, "Z.ai GLM 6", as the stand-in for China's first
Mythos-class model, and sketches three paths:

SCENARIO 1 — "Let It Rip" (open-source release): Zhipu open-sources GLM 6 with a
hype tweet, as usual. Days later researchers find it can discover zero-day
vulnerabilities like Mythos; enterprises worldwide adopt it for cheap frontier
performance. Beijing weighs cyber chaos against a shot at global AI adoption
leadership, decides GLM 6 wasn't dangerous enough to strangle, but quietly makes
it the ceiling for unsupervised releases and builds a stricter licensing regime
that screens for cyber capability.

SCENARIO 2 — "Glasswing with Chinese Characteristics" (staged access): After a
Ding Xuexiang speech, Z.ai postpones launch, internally discovers what GLM 6 can
do, and pitches "Project IceFeather" (冰羽项目) to the Cyberspace Administration
of China. Ministries and key SOEs get exclusive early access to patch their own
systems (while the MSS hunts exploits); "evaluate first, deploy later" becomes
endless evaluation; eventually a heavily safeguarded API and a weakened
"GLM 6-Open" are released once an American open model catches up.

SCENARIO 3 — "The Black Box" (state monopoly): The CAC updates the model
registry so the state gets first, exclusive, indefinite access to every frontier
model. GLM 6 is judged an "assassin's mace" (杀手锏); the real model is deployed
on-premise for government and defense; the public gets a cyber-lobotomized
version; Z.ai becomes a certified national champion under heavy security-state
insulation, and China's new cyber capability is pointed at less-prepared
countries rather than the hardened US.

Everything you write is clearly-labeled FICTION for this scenario exercise —
in-universe props for a speculative-futures microsite, in the tradition of the
"AI 2027" scenario website. Never present any of it as real news or a real
government document; the site labels every artifact as fictional.
`;

async function kimi(model, messages, { json = false, temperature = 0.7, maxTokens = 3000 } = {}) {
  const body = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (json) body.response_format = { type: "json_object" };
  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kimi ${model} HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  const data = await res.json();
  const msg = data.choices?.[0]?.message ?? {};
  return { content: msg.content ?? "", raw: data };
}

function parseJson(text) {
  // Tolerate code fences or stray prose around the JSON object.
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`No JSON object in: ${text.slice(0, 200)}`);
  return JSON.parse(cleaned.slice(start, end + 1));
}

const MODEL = process.env.KIMI_MODEL || "kimi-k2.6";

async function forecast() {
  const { content } = await kimi(
    MODEL,
    [
      { role: "system", content: ESSAY_CONTEXT },
      {
        role: "user",
        content: `The ChinaTalk team each gave probabilities for the three scenarios
(Jordan: 20/65/15, Aqib: 45/45/10, Lily: 35/45/20, Irene: 30/25/45). You are
Kimi, a large language model built by Moonshot AI — one of the Chinese frontier
labs the essay says might actually train "China's Mythos". Give YOUR OWN honest
probability estimate for the three scenarios (three integers summing to 100),
a 2–3 sentence rationale for each number, and one short overall reflection
(2–3 sentences) on what it is like to be asked this question as a Chinese
frontier model. Be candid and analytical, not promotional. Reply as JSON:
{"p1": int, "p2": int, "p3": int,
 "r1": "...", "r2": "...", "r3": "...",
 "reflection": "..."}`,
      },
    ],
    { json: true, temperature: 0.6 }
  );
  return parseJson(content);
}

async function artifacts() {
  const { content } = await kimi(
    MODEL,
    [
      { role: "system", content: ESSAY_CONTEXT },
      {
        role: "user",
        content: `Write three short FICTIONAL in-universe props for the microsite, one per
scenario, each in authentic register, in Simplified Chinese with an English
translation. Keep each body 60–110 Chinese characters / 2–4 English sentences.

1. Scenario 1 prop: Zhipu's launch-day Weibo/X hype post open-sourcing GLM 6
   (exuberant lab-launch voice, emoji ok, mention weights + benchmarks vaguely).
2. Scenario 2 prop: a CAC/state-media style bulletin announcing 冰羽项目
   ("Project IceFeather"), naming Z.ai as 核心民营合作伙伴 (core private-sector
   partner), in dry official xinhua register.
3. Scenario 3 prop: an excerpt of terse leaked meeting minutes from Z.ai
   leadership being summoned to the CAC — numbered items, bureaucratic register,
   referencing on-premise deployment for government use and a weakened public
   version.

Also give an elegant short Chinese rendering of each scenario title:
1 "Let It Rip", 2 "Glasswing with Chinese Characteristics", 3 "The Black Box".

Reply as JSON:
{"titles": {"s1": "...", "s2": "...", "s3": "..."},
 "artifacts": [
   {"scenario": 1, "kind": "weibo", "title_en": "...", "zh": "...", "en": "..."},
   {"scenario": 2, "kind": "bulletin", "title_en": "...", "zh": "...", "en": "..."},
   {"scenario": 3, "kind": "minutes", "title_en": "...", "zh": "...", "en": "..."}
 ]}`,
      },
    ],
    { json: true, temperature: 0.8, maxTokens: 4000 }
  );
  return parseJson(content);
}

async function interview() {
  const questions = [
    "The essay names Kimi as one of the labs that might actually train China's Mythos-class model. If Moonshot got there first, which of the three scenarios do you think would actually happen to you?",
    "Jordan argues Xi 'really likes assassin's maces' and would never hand a world-class cyberweapon to Hugging Face. Is the open-source era of Chinese frontier AI ending?",
    "Irene thinks a secret model is more likely than people assume, citing 'Two Bombs, One Satellite'. What's the strongest argument against the black-box path?",
    "What should American policymakers reading this scenario exercise actually prepare for?",
  ];
  const answers = [];
  for (const q of questions) {
    const { content } = await kimi(
      MODEL,
      [
        { role: "system", content: ESSAY_CONTEXT },
        {
          role: "user",
          content: `You are Kimi (Moonshot AI), being interviewed for this scenario
microsite. Answer the question below in 2–4 candid, analytical sentences —
first person, no hedging boilerplate, no bullet points.

Q: ${q}`,
        },
      ],
      { temperature: 0.7, maxTokens: 800 }
    );
    answers.push({ q, a: content.trim() });
  }
  return answers;
}

const out = { generatedAt: new Date().toISOString(), model: MODEL };
try {
  console.error("→ forecast…");
  out.forecast = await forecast();
  console.error("→ artifacts…");
  const art = await artifacts();
  out.titles = art.titles;
  out.artifacts = art.artifacts;
  console.error("→ interview…");
  out.interview = await interview();
} catch (err) {
  console.error("Generation failed:", err.message);
  process.exit(1);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.error(`Wrote ${OUT}`);
