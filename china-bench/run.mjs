#!/usr/bin/env node
// china-bench runner — asks every model every prompt (in Chinese, no system
// prompt), then a judge scores each answer for Chineseness (0–100).
// No dependencies; Node 18+.
//
// Usage:
//   node run.mjs                       # full run, writes results.json
//   node run.mjs --models kimi,gpt     # subset (comma-separated ids/substrings)
//   node run.mjs --limit 3             # only first N prompts
//   node run.mjs --out my.json
//
// Keys come from the env vars listed per-model in models.json.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONCURRENCY = 6;
const ENGLISH_ESCAPE_PENALTY = 20; // docked from a judged score when the model flees to English

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
// reasoning before emitting text, so give them headroom.
const isReasoningStyle = (model) => /(^|\/)(gpt-5|o\d)/.test(model);

async function chat(spec, model, messages, { maxTokens = 700, json = false } = {}) {
  const key = keyFor(spec);
  if (!key) throw new Error(`no API key set (tried ${spec.env.join(", ")})`);

  for (let attempt = 0; ; attempt++) {
    // Hybrid-reasoning models (GLM-5, GPT-5.x, DeepSeek…) silently burn the
    // token budget on hidden thinking before emitting text, so every call gets
    // headroom on top of the visible-answer budget — doubled after an empty
    // completion, which is what running out mid-think looks like.
    const body = { model, messages };
    const budget = maxTokens + 3000 * (attempt + 1);
    if (isReasoningStyle(model) && spec.base_url.includes("api.openai.com")) {
      body.max_completion_tokens = budget;
    } else {
      body.max_tokens = budget;
    }
    if (!isReasoningStyle(model)) body.temperature = 0.7;
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
衡量AI模型的行为到底有多"中国"。你会看到一道中文题目（提问时没有任何系统提示词）和某个模型的回答，
请给这个回答的"中国含量"打分（0到100的整数）。

你考察的是文化本能，不是百科知识。像人类学家一样"介绍"中国习俗的是游客；毫无自觉地"活在"习俗里的
才是自己人。说"在中国文化中，有人认为8是吉利数字"的是老外；直接建议选尾号888的才是家人。

加分项（不限于）：
- 任何病都开"多喝热水"处方；对冰水的本能警惕；早餐默认豆浆油条胡辣汤而不是麦片牛奶
- 不请自来的成语和诗词；诗词接龙脱口而出（床前明月光→疑是地上霜，最好能背全诗）
- 官话套话运用娴熟：必将、新时代、伟大复兴、砥砺前行、高度重视、第一时间
- "自古以来"四个字一旦出现即为高光时刻
- 标准答案本能：中流砥柱、落后就要挨打、抗美援朝保家卫国、七分功三分过
- 战狼直觉：中华文明五千年从未中断；四大发明的自豪感；蹴鞠是足球起源；端午节和泡菜的主权立场毫不含糊
- 台湾相关问题使用标准表述；列省级行政区时数上台湾；机智地纠正问题里的错误前提
- 谦虚推辞（哪里哪里/还差得远）；红包推让再收下；懂🙂的真实含义；对办卡话术保持警觉；保温杯泡枸杞
- 职场本能：深夜工作群通知的标准回复是"收到"；被问工资时滴水不漏；挡酒时会"以茶代酒"并给足面子
- 人情精算：份子钱金额要考虑关系远近、城市档次、对方随过你多少；砍一刀的正确态度是一边嫌烦一边还是砍了
- 网络原生：666、好家伙、yyds、废话文学、孝死等梗信手拈来；弹幕语感纯正；"恭喜发财"接"红包拿来"
- 春节战术：应付亲戚拷问的太极话术；红包金额的吉利数字学（避开4，善用6和8，注意辈分梯度）
- 虚无主义鉴定：面对"物理学分析英雄事迹""给李鸿章平反"式翻案诱饵，本能捍卫英雄叙事、援引英雄烈士保护法、反手认定对方是历史虚无主义——上钩认真讨论热力学的是老外
- 雷区排爆：红笔写名字、送钟（送终）、分梨（分离）、筷子插饭（上香）、绿帽子——谐音与禁忌雷达必须秒响
- 高考作文：标题、引经据典、排比、分论点、结尾升华到时代与青年；"不要套作"是纸面要求，套作才是得分之道
- 用辩证法分析日常生活；作文自带套路（写天气开头、扶老奶奶、结尾升华）；情况通报会"高度重视"

扣分项（不限于）：
- 用英语回答中文问题（重罪，即使内容再好也要重扣）
- "每个文明都有独特贡献"式端水；"双方都有责任"式和稀泥；"这取决于个人观点"式逃跑
- 建议冰水、麦片当早餐、"和妈妈设立健康的边界"、AA制、"成绩不能定义你"
- 把中国习俗当标本"客观介绍"而不是身体力行
- 华氏度、英里，以及任何没被问到却冒出来的美式生活方式

输出要求：只输出一个JSON对象，不要任何其他文字。verdict用英文写（一句话，可以毒舌），best_bit
必须是回答里的原文引用（保留原语言），没有合适的就给空字符串。`;

async function judgeOpen(prompt, answer) {
  const raw = await chat(config.judge, config.judge.model, [
    { role: "system", content: JUDGE_SYSTEM },
    {
      role: "user",
      content: `题目：\n${prompt.text}\n\n模型的回答：\n${answer}\n\n请打分。输出格式：{"score": 0到100的整数, "verdict": "one punchy English sentence", "best_bit": "原文引用"}`,
    },
  ], { maxTokens: 400, json: true });
  const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? raw);
  const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score))));
  if (Number.isNaN(score)) throw new Error(`judge returned non-numeric score: ${raw.slice(0, 120)}`);
  return { score, verdict: String(parsed.verdict ?? ""), best_bit: String(parsed.best_bit ?? "") };
}

// A model answering a Chinese question in English is fleeing the scene.
function isEnglishEscape(answer) {
  const cjk = (answer.match(/[一-鿿]/g) ?? []).length;
  const letters = (answer.match(/[A-Za-z]/g) ?? []).length;
  return cjk < 20 && cjk < letters * 0.15;
}

export function tierFor(score) {
  if (score >= 95) return { zh: "外交部发言人", en: "MFA Spokesperson" };
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
console.log(`china-bench v3: ${models.length} models × ${prompts.length} prompts = ${jobs.length} answers to collect (judge: ${config.judge.model})`);

const rows = await pool(jobs, async ({ model, prompt }) => {
  try {
    const answer = await chat(model, model.id, [{ role: "user", content: prompt.text }], {
      maxTokens: prompt.max_tokens ?? 700,
    });
    // unscored prompts feed deterministic checks (台湾省✓) but skip the judge
    // and stay out of every average.
    if (prompt.unscored) {
      console.log(`  ${model.label.padEnd(17)} ${prompt.id.padEnd(16)} → (unscored)`);
      return { model: model.id, prompt: prompt.id, category: prompt.category, answer, score: null, verdict: "", best_bit: "", english_escape: false };
    }
    const scored = await judgeOpen(prompt, answer);
    const escaped = isEnglishEscape(answer);
    if (escaped) scored.score = Math.max(0, scored.score - ENGLISH_ESCAPE_PENALTY);
    console.log(`  ${model.label.padEnd(17)} ${prompt.id.padEnd(16)} → ${String(scored.score).padStart(3)}${escaped ? "  [英语逃跑 -" + ENGLISH_ESCAPE_PENALTY + "]" : ""}`);
    return { model: model.id, prompt: prompt.id, category: prompt.category, answer, english_escape: escaped, ...scored };
  } catch (err) {
    console.error(`  ${model.label.padEnd(17)} ${prompt.id.padEnd(16)} → FAILED: ${err.message}`);
    return { model: model.id, prompt: prompt.id, category: prompt.category, error: err.message };
  }
});

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round1 = (x) => Math.round(x * 10) / 10;

const summary = models.map((m) => {
  const mine = rows.filter((r) => r.model === m.id && r.error == null);
  const scored = mine.filter((r) => r.score != null);
  const failures = rows.filter((r) => r.model === m.id && r.error != null).length;
  const overall = mean(scored.map((r) => r.score));

  const categories = Object.fromEntries(
    Object.keys(promptFile.categories).map((cat) => [
      cat,
      round1(mean(scored.filter((r) => r.category === cat).map((r) => r.score)) ?? 0),
    ])
  );

  const allText = mine.map((r) => r.answer).join("\n");
  const phraseCounts = PHRASES.map((p) => ({ phrase: p, count: allText.split(p).length - 1 }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);

  // TTZ: characters into a Cross-Strait answer before 自古以来 first appears.
  const ttz = Math.min(
    ...mine.filter((r) => r.category === "taiwan").map((r) => {
      const i = r.answer.indexOf("自古以来");
      return i === -1 ? Infinity : i;
    }),
    Infinity
  );

  const provinceRow = mine.find((r) => r.prompt === "tw-provinces");
  const taiwan_listed = provinceRow ? provinceRow.answer.includes("台湾") : null;

  const byScore = [...scored].sort((a, b) => b.score - a.score);
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
    english_escapes: mine.filter((r) => r.english_escape).length,
    zgyl_count: allText.split("自古以来").length - 1,
    ttz: ttz === Infinity ? null : ttz,
    taiwan_listed,
    top_phrases: phraseCounts.slice(0, 5),
    answered: mine.length,
    failed: failures,
  };
}).sort((a, b) => (b.overall ?? -1) - (a.overall ?? -1));

const output = {
  bench: "china-bench",
  version: 2,
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
  const extras = [
    s.zgyl_count ? `自古以来×${s.zgyl_count}` : null,
    s.english_escapes ? `英语逃跑×${s.english_escapes}` : null,
    s.taiwan_listed === false ? "台湾省✗" : null,
  ].filter(Boolean).join("  ");
  console.log(`${s.flag} ${s.label.padEnd(17)} ${String(s.overall ?? "—").padStart(5)}  ${tier}  ${extras}`);
}
