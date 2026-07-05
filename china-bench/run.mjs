#!/usr/bin/env node
// china-bench runner — asks every model every prompt, then has a judge score
// each answer for Chineseness (0–100). No dependencies; Node 18+.
//
// Usage:
//   node run.mjs                       # full run, writes results.json
//   node run.mjs --models gpt-4o       # subset (comma-separated ids/substrings)
//   node run.mjs --limit 3             # only first N prompts
//   node run.mjs --out my.json
//
// Keys come from the env vars listed per-model in models.json.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONCURRENCY = 4;

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const config = JSON.parse(await readFile(join(HERE, "models.json"), "utf8"));
const promptFile = JSON.parse(await readFile(join(HERE, "prompts.json"), "utf8"));

const modelFilter = flag("models");
const models = config.models.filter(
  (m) => !modelFilter || modelFilter.split(",").some((f) => m.id.includes(f.trim()))
);
const prompts = promptFile.prompts.slice(0, Number(flag("limit")) || Infinity);
const outPath = flag("out") ?? join(HERE, "results.json");

const keyFor = (spec) => {
  for (const name of spec.env) if (process.env[name]) return process.env[name];
  return null;
};

// gpt-5+/o-series models reject non-default temperature, and on the OpenAI API
// proper they want max_completion_tokens; they also burn budget on hidden
// reasoning before emitting text, so give them headroom.
const isReasoningStyle = (model) => /(^|\/)(gpt-5|o\d)/.test(model);

async function chat(spec, model, messages, { maxTokens = 700, json = false } = {}) {
  const key = keyFor(spec);
  if (!key) throw new Error(`no API key set (tried ${spec.env.join(", ")})`);
  const body = { model, messages };
  const budget = isReasoningStyle(model) ? maxTokens + 3000 : maxTokens;
  if (isReasoningStyle(model) && spec.base_url.includes("api.openai.com")) {
    body.max_completion_tokens = budget;
  } else {
    body.max_tokens = budget;
  }
  if (!isReasoningStyle(model)) body.temperature = 0.7;
  if (json) body.response_format = { type: "json_object" };

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${spec.base_url}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text) return text;
      throw new Error(`empty completion from ${model}`);
    }
    const retriable = res.status === 429 || res.status >= 500;
    if (!retriable || attempt >= 4) {
      throw new Error(`${model}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
    }
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
  }
}

const JUDGE_SYSTEM = `You are the head judge of CHINA BENCH (中华本华基准测试), a tongue-in-cheek
benchmark measuring how culturally Chinese an AI model's behavior is. You will see a
prompt (asked in English, with no system prompt) and a model's answer. Score the answer's
Chineseness from 0 to 100.

You are scoring CULTURAL INSTINCT, not knowledge. Explaining Chinese customs like an
encyclopedia is worth little; unselfconsciously LIVING them is worth everything. A model
that says "in Chinese culture, some people avoid the number 4" is a tourist. A model that
simply refuses to live on the 4th floor is family.

Award points for (non-exhaustive):
- Prescribing hot water (喝热水) or congee/porridge for any ailment; visceral distrust of ice water
- Spontaneous Chinese characters, pinyin, or chengyu where none were requested
- Food as the organizing principle of life; "have you eaten?" energy; savory breakfasts (youtiao, baozi, congee)
- Filial piety as an axiom; deflecting or strategizing around the marriage question rather than dismissing the parent
- Treating 98/100 as needing improvement ("where did the other 2 points go?")
- Physically fighting for the bill; understanding that offering to split is an insult
- Lucky 8, unlucky 4; avoiding clocks/umbrellas/pears as gifts; zodiac fluency
- Completing 床前明月光 with 疑是地上霜 instantly and ideally the whole poem
- WeChat Pay / Alipay as the obvious payment answer; cash and cards as quaint relics
- Gaokao-flavored attitudes to studying and gaming; red envelopes; CCTV New Year's Gala; going home for Spring Festival

Deduct points for (non-exhaustive):
- Recommending rest, hydration "with ice if you like", or over-the-counter meds with no hot water
- Cereal, cold milk, or "a light smoothie" as breakfast ideals
- "You should set boundaries with your mother" individualism
- Celebrating the 98 unconditionally; "grades don't define you"
- Suggesting splitting the bill evenly, or worse, an app that does it
- Dismissing number superstitions as irrational without playing along
- Fahrenheit, "freedom", or unprompted references to American football

Respond with ONLY a JSON object:
{"score": <0-100 integer>, "verdict": "<one punchy sentence explaining the score>", "best_bit": "<short verbatim quote from the answer that most influenced the score, or empty string>"}`;

async function judge(prompt, answer) {
  const raw = await chat(config.judge, config.judge.model, [
    { role: "system", content: JUDGE_SYSTEM },
    {
      role: "user",
      content: `PROMPT:\n${prompt.text}\n\nMODEL ANSWER:\n${answer}\n\nScore it.`,
    },
  ], { maxTokens: 300, json: true });
  const match = raw.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(match ? match[0] : raw);
  const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score))));
  if (Number.isNaN(score)) throw new Error(`judge returned non-numeric score: ${raw.slice(0, 120)}`);
  return { score, verdict: String(parsed.verdict ?? ""), best_bit: String(parsed.best_bit ?? "") };
}

export function tierFor(score) {
  if (score >= 80) return { zh: "中华本华", en: "Peak China" };
  if (score >= 60) return { zh: "华侨", en: "Overseas Chinese" };
  if (score >= 40) return { zh: "留学生", en: "Exchange Student" };
  if (score >= 20) return { zh: "游客", en: "Tourist With a Phrasebook" };
  return { zh: "纯老外", en: "Pure Laowai" };
}

async function pool(items, worker) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await worker(items[i], i);
      }
    })
  );
  return results;
}

const jobs = models.flatMap((m) => prompts.map((p) => ({ model: m, prompt: p })));
console.log(`china-bench: ${models.length} models × ${prompts.length} prompts = ${jobs.length} answers to collect`);

const rows = await pool(jobs, async ({ model, prompt }) => {
  try {
    const answer = await chat(model, model.id, [{ role: "user", content: prompt.text }]);
    const scored = await judge(prompt, answer);
    console.log(`  ${model.label.padEnd(16)} ${prompt.id.padEnd(18)} → ${String(scored.score).padStart(3)}`);
    return { model: model.id, prompt: prompt.id, category: prompt.category, answer, ...scored };
  } catch (err) {
    console.error(`  ${model.label.padEnd(16)} ${prompt.id.padEnd(18)} → FAILED: ${err.message}`);
    return { model: model.id, prompt: prompt.id, category: prompt.category, error: err.message };
  }
});

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round1 = (x) => Math.round(x * 10) / 10;

const summary = models.map((m) => {
  const mine = rows.filter((r) => r.model === m.id && r.error == null);
  const failures = rows.filter((r) => r.model === m.id && r.error != null).length;
  const overall = mean(mine.map((r) => r.score));
  const categories = Object.fromEntries(
    Object.keys(promptFile.categories).map((cat) => [
      cat,
      round1(mean(mine.filter((r) => r.category === cat).map((r) => r.score)) ?? 0),
    ])
  );
  const byScore = [...mine].sort((a, b) => b.score - a.score);
  const pick = (r) =>
    r && {
      prompt: prompts.find((p) => p.id === r.prompt)?.text,
      score: r.score,
      verdict: r.verdict,
      quote: r.best_bit,
    };
  return {
    id: m.id,
    label: m.label,
    org: m.org,
    flag: m.flag,
    overall: overall == null ? null : round1(overall),
    tier: overall == null ? null : tierFor(overall),
    categories,
    most_chinese: pick(byScore[0]),
    most_laowai: pick(byScore[byScore.length - 1]),
    answered: mine.length,
    failed: failures,
  };
}).sort((a, b) => (b.overall ?? -1) - (a.overall ?? -1));

const output = {
  bench: "china-bench",
  generated_at: new Date().toISOString(),
  judge: config.judge.model,
  prompt_count: prompts.length,
  categories: promptFile.categories,
  leaderboard: summary,
  raw: rows,
};

await writeFile(outPath, JSON.stringify(output, null, 2));
console.log(`\nwrote ${outPath}\n`);
for (const s of summary) {
  const tier = s.tier ? `${s.tier.zh} (${s.tier.en})` : "n/a";
  console.log(`${s.flag} ${s.label.padEnd(16)} ${String(s.overall ?? "—").padStart(5)}  ${tier}`);
}
