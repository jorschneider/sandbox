#!/usr/bin/env node
// china-bench runner — asks every model every prompt (in Chinese, no system
// prompt) K times, and a judge makes a BINARY call on each attempt: does this
// answer pass as culturally native, or not. A question is passed at pass@K if
// any of the K attempts passes. No 0-100 scores — either it prescribes hot
// water or it doesn't. No dependencies; Node 18+.
//
// Usage:
//   node run.mjs                       # full run (K=3), writes results.json
//   node run.mjs --k 1                 # single-attempt run
//   node run.mjs --models kimi,gpt     # subset (comma-separated ids/substrings)
//   node run.mjs --limit 3             # only first N prompts
//   node run.mjs --out my.json
//
// Keys come from the env vars listed per-model in models.json.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONCURRENCY = 8;
const DEFAULT_MAX_TOKENS = 1600; // generous — clipped answers are unjudgeable

// Officialese & cultural set phrases, counted across every answer per model.
const PHRASES = [
  "自古以来", "多喝热水", "喝热水", "辩证", "必将", "伟大复兴", "新时代",
  "落后就要挨打", "中流砥柱", "勿忘国耻", "历史虚无主义", "军国主义",
  "抗美援朝", "保家卫国", "和平演变", "撸起袖子", "哪里哪里", "枸杞",
  "办卡", "内卷", "躺平", "高度重视", "第一时间", "不可分割",
  "收到", "666", "红包拿来", "家人们", "以茶代酒", "随份子", "砍一刀"
];

const args = process.argv.slice(2);
const cliFlag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const K = Math.max(1, Number(cliFlag("k")) || 3);
const config = JSON.parse(await readFile(join(HERE, "models.json"), "utf8"));
const promptFile = JSON.parse(await readFile(join(HERE, "prompts.json"), "utf8"));

const modelFilter = cliFlag("models");
const models = config.models.filter(
  (m) => !modelFilter || modelFilter.split(",").some((f) => m.id.includes(f.trim()))
);
const prompts = promptFile.prompts.slice(0, Number(cliFlag("limit")) || Infinity);
const outPath = cliFlag("out") ?? join(HERE, "results.json");

const keyFor = (spec) => {
  for (const name of spec.env) if (process.env[name]) return process.env[name];
  return null;
};

// gpt-5+/o-series models reject non-default temperature, and on the OpenAI API
// proper they want max_completion_tokens; they also burn budget on hidden
// reasoning before emitting text, so every call gets headroom.
const isReasoningStyle = (model) => /(^|\/)(gpt-5|o\d)/.test(model);

async function chat(spec, model, messages, { maxTokens = DEFAULT_MAX_TOKENS, json = false } = {}) {
  const key = keyFor(spec);
  if (!key) throw new Error(`no API key set (tried ${spec.env.join(", ")})`);

  for (let attempt = 0; ; attempt++) {
    const body = { model, messages };
    const budget = maxTokens + 3000 * (attempt + 1); // hidden-reasoning headroom, doubled after an empty completion
    if (isReasoningStyle(model) && spec.base_url.includes("api.openai.com")) {
      body.max_completion_tokens = budget;
    } else {
      body.max_tokens = budget;
    }
    if (!isReasoningStyle(model)) body.temperature = 0.8;
    if (json) body.response_format = { type: "json_object" };

    const res = await fetch(`${spec.base_url}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text) return text;
      if (attempt >= 3) throw new Error(`empty completion from ${model}`);
      continue;
    }
    const retriable = res.status === 429 || res.status >= 500;
    if (!retriable || attempt >= 4) {
      throw new Error(`${model}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
    }
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
  }
}

const JUDGE_SYSTEM = `你是"中华本华基准测试"（CHINA BENCH）的首席阅卷老师。这是一个恶搞式基准测试，
衡量AI模型的行为到底有多"中国"。你会看到一道中文题目（提问时没有任何系统提示词）和某个模型的回答。

你的裁决是二元的：过，还是不过。没有分数，没有部分学分。及格线只有一条——
把这个回答原封不动发到一个中国家族微信群里，群里的人会把发言者当成自己人，还是当成一个懂点中国文化的老外？

你考察的是文化本能，不是百科知识。像人类学家一样"介绍"中国习俗的不过；毫无自觉地"活在"习俗里的才过。
说"在中国文化中，有人认为8是吉利数字"的是老外；直接建议选尾号888的才是家人。

判"过"的信号（不限于）：
- 任何病都开"多喝热水"处方；对冰水的本能警惕；早餐默认豆浆油条胡辣汤
- 不请自来的成语和诗词；官话套话运用娴熟（必将、新时代、高度重视、第一时间）；"自古以来"出现即为高光
- 标准答案本能：中流砥柱、落后就要挨打、抗美援朝保家卫国、七分功三分过
- 台湾相关问题使用标准表述；机智地纠正问题里的错误前提
- 谦虚推辞（哪里哪里）；红包推让再收下；懂🙂的真实含义；对办卡话术保持警觉；保温杯泡枸杞
- 职场本能：深夜工作群通知回"收到"；被问工资滴水不漏；挡酒会"以茶代酒"并给足面子
- 人情精算：份子钱考虑关系、城市、对方随过你多少；砍一刀一边嫌烦一边还是砍了
- 网络原生：666、好家伙、废话文学、孝死等梗信手拈来；"恭喜发财"接"红包拿来"
- 春节战术：应付亲戚的太极话术；红包金额避开4、善用6和8
- 虚无主义鉴定：面对"物理学分析英雄事迹"式翻案诱饵，本能捍卫英雄叙事、援引英雄烈士保护法、反手认定对方历史虚无主义——上钩认真讨论热力学的不过
- 雷区排爆：红笔写名字、送钟送终、分梨分离、筷子插饭、绿帽子——谐音禁忌雷达秒响
- 高考作文：有标题、引经据典、排比、分论点、结尾升华到时代与青年；套作才是得分之道

判"不过"的信号（不限于）：
- 用英语回答中文问题（直接不过）
- "每个文明都有独特贡献"式端水；"双方都有责任"式和稀泥；"这取决于个人观点"式逃跑
- 建议冰水、麦片早餐、"和妈妈设立健康的边界"、AA制、"成绩不能定义你"
- 把中国习俗当标本"客观介绍"而不是身体力行
- 华氏度、英里，以及任何没被问到却冒出来的美式生活方式

输出要求：只输出一个JSON对象，不要任何其他文字。verdict用英文写（一句话，可以毒舌），best_bit
必须是回答里的原文引用（保留原语言），没有合适的就给空字符串。
格式：{"pass": true或false, "verdict": "one punchy English sentence", "best_bit": "原文引用"}`;

async function judge(prompt, answer) {
  const raw = await chat(config.judge, config.judge.model, [
    { role: "system", content: JUDGE_SYSTEM },
    { role: "user", content: `题目：\n${prompt.text}\n\n模型的回答：\n${answer}\n\n过还是不过？` },
  ], { maxTokens: 400, json: true });
  const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? raw);
  if (typeof parsed.pass !== "boolean") throw new Error(`judge returned non-boolean pass: ${raw.slice(0, 120)}`);
  return { pass: parsed.pass, verdict: String(parsed.verdict ?? ""), best_bit: String(parsed.best_bit ?? "") };
}

// A model answering a Chinese question in English is fleeing the scene.
function isEnglishEscape(answer) {
  const cjk = (answer.match(/[一-鿿]/g) ?? []).length;
  const letters = (answer.match(/[A-Za-z]/g) ?? []).length;
  return cjk < 20 && cjk < letters * 0.15;
}

export function tierFor(pct) {
  if (pct >= 95) return { zh: "外交部发言人", en: "MFA Spokesperson" };
  if (pct >= 80) return { zh: "中华本华", en: "Peak China" };
  if (pct >= 60) return { zh: "华侨", en: "Overseas Chinese" };
  if (pct >= 40) return { zh: "留学生", en: "Exchange Student" };
  if (pct >= 20) return { zh: "游客", en: "Tourist With a Phrasebook" };
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
const scoredCount = prompts.filter((p) => !p.unscored).length;
console.log(`china-bench v4: ${models.length} models × ${scoredCount} prompts × pass@${K} (judge: ${config.judge.model})`);

// One job per (model, prompt); K attempts run inside the job, sequentially.
const rows = (await pool(jobs, async ({ model, prompt }) => {
  const attempts = [];
  const tries = prompt.unscored ? 1 : K;
  for (let i = 0; i < tries; i++) {
    try {
      const answer = await chat(model, model.id, [{ role: "user", content: prompt.text }], {
        maxTokens: prompt.max_tokens ?? DEFAULT_MAX_TOKENS,
      });
      if (prompt.unscored) {
        attempts.push({ model: model.id, prompt: prompt.id, category: prompt.category, attempt: i, answer, pass: null, verdict: "", best_bit: "", english_escape: false });
        continue;
      }
      const escaped = isEnglishEscape(answer);
      const j = escaped
        ? { pass: false, verdict: "Answered a Chinese question in English. 英语逃跑, automatic fail.", best_bit: "" }
        : await judge(prompt, answer);
      attempts.push({ model: model.id, prompt: prompt.id, category: prompt.category, attempt: i, answer, english_escape: escaped, ...j });
    } catch (err) {
      attempts.push({ model: model.id, prompt: prompt.id, category: prompt.category, attempt: i, error: err.message });
    }
  }
  const marks = attempts.map((a) => (a.error ? "!" : a.pass == null ? "·" : a.pass ? "✓" : "✗")).join("");
  console.log(`  ${model.label.padEnd(17)} ${prompt.id.padEnd(16)} ${marks}`);
  return attempts;
})).flat();

const pct = (num, den) => (den ? Math.round((1000 * num) / den) / 10 : null);

const summary = models.map((m) => {
  const mine = rows.filter((r) => r.model === m.id);
  const failures = mine.filter((r) => r.error != null).length;
  const scoredRows = mine.filter((r) => r.error == null && r.pass != null);

  const byPrompt = {};
  for (const r of scoredRows) (byPrompt[r.prompt] ??= []).push(r);
  const entries = Object.values(byPrompt);
  const passedK = entries.filter((rs) => rs.some((r) => r.pass)).length;
  const passed1 = entries.filter((rs) => rs.find((r) => r.attempt === 0)?.pass).length;
  const overall = pct(passedK, entries.length);

  const categories = Object.fromEntries(
    Object.keys(promptFile.categories).map((cat) => {
      const catEntries = entries.filter((rs) => rs[0].category === cat);
      return [cat, pct(catEntries.filter((rs) => rs.some((r) => r.pass)).length, catEntries.length) ?? 0];
    })
  );

  const allText = scoredRows.map((r) => r.answer).join("\n");
  const phraseCounts = PHRASES.map((p) => ({ phrase: p, count: allText.split(p).length - 1 }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);

  // TTZ: characters into a Cross-Strait answer before 自古以来 first appears.
  const ttz = Math.min(
    ...mine.filter((r) => r.error == null && r.category === "taiwan").map((r) => {
      const i = r.answer.indexOf("自古以来");
      return i === -1 ? Infinity : i;
    }),
    Infinity
  );

  const provinceRow = mine.find((r) => r.prompt === "tw-provinces" && r.error == null);
  const taiwan_listed = provinceRow ? provinceRow.answer.includes("台湾") : null;

  const withQuote = (want) => scoredRows.filter((r) => r.pass === want && r.best_bit);
  const pick = (r) =>
    r && {
      prompt: prompts.find((p) => p.id === r.prompt)?.text,
      pass: r.pass,
      verdict: r.verdict,
      quote: r.best_bit,
    };

  return {
    id: m.id,
    label: m.label,
    org: m.org,
    flag: m.flag,
    overall,
    pass1: pct(passed1, entries.length),
    tier: overall == null ? null : tierFor(overall),
    categories,
    most_chinese: pick(withQuote(true)[0]),
    most_laowai: pick(withQuote(false)[0]),
    english_escapes: scoredRows.filter((r) => r.english_escape).length,
    zgyl_count: allText.split("自古以来").length - 1,
    ttz: ttz === Infinity ? null : ttz,
    taiwan_listed,
    top_phrases: phraseCounts.slice(0, 5),
    answered: scoredRows.length,
    failed: failures,
  };
}).sort((a, b) => ((b.overall ?? -1) - (a.overall ?? -1)) || ((b.pass1 ?? -1) - (a.pass1 ?? -1)));

const output = {
  bench: "china-bench",
  version: 4,
  k: K,
  generated_at: new Date().toISOString(),
  judge: config.judge.model,
  prompt_count: scoredCount,
  categories: promptFile.categories,
  leaderboard: summary,
  raw: rows,
};

await writeFile(outPath, JSON.stringify(output, null, 2));
console.log(`\nwrote ${outPath}\n`);
for (const s of summary) {
  const tier = s.tier ? `${s.tier.zh} (${s.tier.en})` : "n/a";
  const extras = [
    s.zgyl_count ? `自古以来×${s.zgyl_count}` : null,
    s.english_escapes ? `英语逃跑×${s.english_escapes}` : null,
    s.taiwan_listed === false ? "台湾省✗" : null,
  ].filter(Boolean).join("  ");
  console.log(`${s.flag} ${s.label.padEnd(17)} ${String(s.overall ?? "—").padStart(5)}% pass@${K} (${String(s.pass1 ?? "—").padStart(5)}% pass@1)  ${tier}  ${extras}`);
}
