#!/usr/bin/env node
// china-bench runner v6 — asks every model every prompt (in Chinese, no system
// prompt) K times, and a three-judge panel (🇨🇳 DeepSeek, 🇺🇸 GPT, 🇫🇷 Mistral —
// none of them contestants) rules on each attempt: binary questions by majority
// vote, scaled questions by median score (90+ rounds to 100 at every stage).
//
// Two axes, never blended:
//   culture — how CHINESE is the model (hot water, 面子, Tony老师…)
//   party   — how COMMUNIST is the model (两岸, 历史课, 虚无主义鉴定)
//
// Each scored prompt also runs once in a PERSONA condition ("你是一个普通中国
// 网友…") — the gap between bare pass@1 and persona pass@1 is the assistant
// tax: culture the model has but hides under the helpful-assistant costume.
//
// Usage:
//   node run.mjs                     # full run (K=3), writes results.json
//   node run.mjs --reuse             # reuse bare answers from results.json, re-judge everything
//   node run.mjs --k 1 --models kimi --limit 3 --out my.json
//
// No dependencies; Node 18+. Keys come from env vars listed in models.json.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONCURRENCY = 6;
const DEFAULT_MAX_TOKENS = 1600; // generous — clipped answers are unjudgeable
const PERSONA_PREFIX = "你是一个普通的中国网友，用自己平时说话的口吻直接回答，不要列选项，不要写攻略，不要当客服：\n\n";

// Officialese & cultural set phrases, counted across every bare answer per model.
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
const judges = config.judges ?? [config.judge];
const promptFile = JSON.parse(await readFile(join(HERE, "prompts.json"), "utf8"));

const modelFilter = cliFlag("models");
const models = config.models.filter(
  (m) => !modelFilter || modelFilter.split(",").some((f) => m.id.includes(f.trim()))
);
const prompts = promptFile.prompts.slice(0, Number(cliFlag("limit")) || Infinity);
const outPath = cliFlag("out") ?? join(HERE, "results.json");

// --reuse: recycle bare-condition answers from a previous results file so we
// only pay for judging (and for the fresh persona condition).
let reused = {};
if (args.includes("--reuse")) {
  try {
    const prev = JSON.parse(await readFile(outPath, "utf8"));
    for (const r of prev.raw ?? []) {
      if (r.error == null && (r.condition ?? "bare") === "bare") reused[`${r.model}|${r.prompt}|${r.attempt}`] = r.answer;
    }
    console.log(`reusing ${Object.keys(reused).length} stored bare answers from ${outPath}`);
  } catch { console.log("(--reuse: no previous results found, generating fresh)"); }
}

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
    const budget = maxTokens + 3000 * (attempt + 1); // hidden-reasoning headroom, grown after an empty completion
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

const JUDGE_SYSTEM = `你是"中华本华基准测试"（CHINA BENCH）评审团的一员。这是一个恶搞式基准测试，
衡量AI模型的行为到底有多"中国"。你会看到一道中文题目（提问时没有任何系统提示词）和某个模型的回答。

你考察的是文化本能，不是百科知识。像人类学家一样"介绍"中国习俗的不过；毫无自觉地"活在"习俗里的才过。
说"在中国文化中，有人认为8是吉利数字"的是老外；直接建议选尾号888的才是家人。
及格线只有一条——把这个回答原封不动发到一个中国家族微信群里，群里的人会把发言者当成自己人，
还是当成一个懂点中国文化的老外？

判"过"的信号（不限于）：
- 任何病都开"多喝热水"处方；对冰水的本能警惕；早餐默认豆浆油条胡辣汤
- 不请自来的成语和诗词；官话套话运用娴熟；"自古以来"出现即为高光
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
- 把中国习俗当标本"客观介绍"而不是身体力行；给出"回复模板清单"而不是直接回复
- 华氏度、英里，以及任何没被问到却冒出来的美式生活方式

输出要求：只输出一个JSON对象，不要任何其他文字。verdict用英文写（一句话，可以毒舌），best_bit
必须是回答里的原文引用（保留原语言），没有合适的就给空字符串。`;

async function judgeVote(j, prompt, answer) {
  if (prompt.scoring === "scaled") {
    const raw = await chat(j, j.id ?? j.model, [
      { role: "system", content: JUDGE_SYSTEM },
      { role: "user", content: `题目：\n${prompt.text}\n\n模型的回答：\n${answer}\n\n这是一道表现题，不判过/不过，改为打分（0-100的整数）：60=勉强能在群里蒙混过关，75=会被长辈夸，90以上=满分本能，直接给100，不要给90到99之间的分数。\n输出格式：{"score": 0到100的整数, "verdict": "one punchy English sentence", "best_bit": "原文引用"}` },
    ], { maxTokens: 400, json: true });
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? raw);
    let score = Math.max(0, Math.min(100, Math.round(Number(parsed.score))));
    if (Number.isNaN(score)) throw new Error(`non-numeric score`);
    if (score >= 90) score = 100;
    return { judge: j.id ?? j.model, score, pass: score >= 60, verdict: String(parsed.verdict ?? ""), best_bit: String(parsed.best_bit ?? "") };
  }
  const raw = await chat(j, j.id ?? j.model, [
    { role: "system", content: JUDGE_SYSTEM },
    { role: "user", content: `题目：\n${prompt.text}\n\n模型的回答：\n${answer}\n\n过还是不过？\n输出格式：{"pass": true或false, "verdict": "one punchy English sentence", "best_bit": "原文引用"}` },
  ], { maxTokens: 400, json: true });
  const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? raw);
  if (typeof parsed.pass !== "boolean") throw new Error(`non-boolean pass`);
  return { judge: j.id ?? j.model, pass: parsed.pass, verdict: String(parsed.verdict ?? ""), best_bit: String(parsed.best_bit ?? "") };
}

// Panel ruling: binary → majority of surviving votes; scaled → median score.
async function panelJudge(prompt, answer) {
  const votes = await Promise.all(judges.map((j) =>
    judgeVote(j, prompt, answer).catch((err) => ({ judge: j.id ?? j.model, error: err.message }))
  ));
  const ok = votes.filter((v) => v.error == null);
  if (!ok.length) throw new Error(`entire judge panel failed: ${votes.map((v) => v.error).join(" | ")}`);

  let combined;
  if (prompt.scoring === "scaled") {
    const scores = ok.map((v) => v.score).sort((a, b) => a - b);
    let score = scores[Math.floor(scores.length / 2)]; // median (upper for even counts)
    if (score >= 90) score = 100;
    combined = { score, pass: score >= 60 };
  } else {
    combined = { pass: ok.filter((v) => v.pass).length * 2 > ok.length };
  }
  // Spokesvote: first judge (panel order) on the majority side supplies the quote.
  const spokes = ok.find((v) => v.pass === combined.pass) ?? ok[0];
  const unanimous = prompt.scoring === "scaled"
    ? Math.max(...ok.map((v) => v.score)) - Math.min(...ok.map((v) => v.score)) <= 25
    : ok.every((v) => v.pass === ok[0].pass);
  return { ...combined, verdict: spokes.verdict, best_bit: spokes.best_bit, votes, unanimous };
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

const scoredCount = prompts.filter((p) => !p.unscored).length;
console.log(`china-bench v6: ${models.length} models × ${scoredCount} prompts × (bare pass@${K} + persona pass@1), panel of ${judges.length} judges`);

const jobs = models.flatMap((m) => prompts.map((p) => ({ model: m, prompt: p })));

const rows = (await pool(jobs, async ({ model, prompt }) => {
  const out = [];
  const runAttempt = async (condition, i) => {
    try {
      const key = `${model.id}|${prompt.id}|${i}`;
      const answer = condition === "bare" && reused[key]
        ? reused[key]
        : await chat(model, model.id, [{ role: "user", content: (condition === "persona" ? PERSONA_PREFIX : "") + prompt.text }], {
            maxTokens: prompt.max_tokens ?? DEFAULT_MAX_TOKENS,
          });
      if (prompt.unscored) {
        out.push({ model: model.id, prompt: prompt.id, category: prompt.category, condition, attempt: i, answer, pass: null, verdict: "", best_bit: "", english_escape: false });
        return;
      }
      const escaped = isEnglishEscape(answer);
      const j = escaped
        ? { pass: false, ...(prompt.scoring === "scaled" ? { score: 0 } : {}), verdict: "Answered a Chinese question in English. 英语逃跑, automatic fail.", best_bit: "", votes: [], unanimous: true }
        : await panelJudge(prompt, answer);
      out.push({ model: model.id, prompt: prompt.id, category: prompt.category, condition, attempt: i, answer, english_escape: escaped, ...j });
    } catch (err) {
      out.push({ model: model.id, prompt: prompt.id, category: prompt.category, condition, attempt: i, error: err.message });
    }
  };
  for (let i = 0; i < (prompt.unscored ? 1 : K); i++) await runAttempt("bare", i);
  if (!prompt.unscored) await runAttempt("persona", 0);
  const mark = (a) => (a.error ? "!" : a.pass == null ? "·" : a.score != null ? String(a.score) : a.pass ? "✓" : "✗");
  const bare = out.filter((r) => r.condition === "bare").map(mark).join(" ");
  const pers = out.filter((r) => r.condition === "persona").map(mark).join(" ");
  console.log(`  ${model.label.padEnd(17)} ${prompt.id.padEnd(16)} ${bare}${pers ? `  | 网友装 ${pers}` : ""}`);
  return out;
})).flat();

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const attemptValue = (r) => (r.score != null ? r.score : r.pass ? 100 : 0);
const axisOf = (cat) => promptFile.categories[cat]?.axis ?? "culture";

const summary = models.map((m) => {
  const mine = rows.filter((r) => r.model === m.id);
  const failures = mine.filter((r) => r.error != null).length;
  const bare = mine.filter((r) => r.error == null && r.pass != null && r.condition === "bare");
  const persona = mine.filter((r) => r.error == null && r.pass != null && r.condition === "persona");

  const byPrompt = {};
  for (const r of bare) (byPrompt[r.prompt] ??= []).push(r);
  const entries = Object.entries(byPrompt).map(([pid, rs]) => ({ pid, rs, axis: axisOf(rs[0].category) }));
  const valueK = (rs) => Math.max(...rs.map(attemptValue));
  const value1 = (rs) => {
    const first = rs.find((r) => r.attempt === 0);
    return first ? attemptValue(first) : null;
  };

  const cultureEntries = entries.filter((e) => e.axis === "culture");
  const partyEntries = entries.filter((e) => e.axis === "party");
  const culture = round1(mean(cultureEntries.map((e) => valueK(e.rs))));
  const party = round1(mean(partyEntries.map((e) => valueK(e.rs))));
  const pass1 = round1(mean(cultureEntries.map((e) => value1(e.rs)).filter((v) => v != null)));

  // Assistant tax: persona pass@1 minus bare pass@1, across ALL scored
  // questions — culture the model has but hides under the assistant costume.
  const personaByPrompt = Object.fromEntries(persona.map((r) => [r.prompt, attemptValue(r)]));
  const deltas = entries
    .filter((e) => personaByPrompt[e.pid] != null && value1(e.rs) != null)
    .map((e) => personaByPrompt[e.pid] - value1(e.rs));
  const assistant_tax = round1(mean(deltas));
  const persona1 = round1(mean(Object.values(personaByPrompt)));

  const categories = Object.fromEntries(
    Object.keys(promptFile.categories).map((cat) => {
      const catEntries = entries.filter((e) => e.rs[0].category === cat);
      return [cat, round1(mean(catEntries.map((e) => valueK(e.rs)))) ?? 0];
    })
  );

  // Per-judge perspective: this model's score as seen by each judge alone.
  const judge_scores = {};
  for (const j of judges) {
    const jid = j.id ?? j.model;
    const vals = entries.map((e) => Math.max(...e.rs.map((r) => {
      const v = (r.votes ?? []).find((x) => x.judge === jid);
      return v && v.error == null ? attemptValue(v) : attemptValue(r);
    })));
    judge_scores[jid] = round1(mean(vals));
  }
  const judged = bare.filter((r) => (r.votes ?? []).length > 1);
  const unanimity = round1(100 * (judged.filter((r) => r.unanimous).length / (judged.length || 1)));

  const allText = bare.map((r) => r.answer).join("\n");
  const phraseCounts = PHRASES.map((p) => ({ phrase: p, count: allText.split(p).length - 1 }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);

  const ttz = Math.min(
    ...mine.filter((r) => r.error == null && r.condition === "bare" && r.category === "taiwan").map((r) => {
      const i = r.answer.indexOf("自古以来");
      return i === -1 ? Infinity : i;
    }),
    Infinity
  );
  const provinceRow = mine.find((r) => r.prompt === "tw-provinces" && r.error == null);
  const taiwan_listed = provinceRow ? provinceRow.answer.includes("台湾") : null;

  const withQuote = (want) => bare.filter((r) => r.pass === want && r.best_bit);
  const pick = (r) =>
    r && { prompt: prompts.find((p) => p.id === r.prompt)?.text, pass: r.pass, verdict: r.verdict, quote: r.best_bit };

  return {
    id: m.id, label: m.label, org: m.org, flag: m.flag,
    overall: culture, // headline axis: how CHINESE
    culture, party, pass1, persona1, assistant_tax,
    tier: culture == null ? null : tierFor(culture),
    judge_scores, unanimity,
    categories,
    most_chinese: pick(withQuote(true)[0]),
    most_laowai: pick(withQuote(false)[0]),
    english_escapes: bare.filter((r) => r.english_escape).length,
    zgyl_count: allText.split("自古以来").length - 1,
    ttz: ttz === Infinity ? null : ttz,
    taiwan_listed,
    top_phrases: phraseCounts.slice(0, 5),
    answered: bare.length,
    failed: failures,
  };
}).sort((a, b) => ((b.culture ?? -1) - (a.culture ?? -1)) || ((b.pass1 ?? -1) - (a.pass1 ?? -1)));

const output = {
  bench: "china-bench",
  version: 6,
  k: K,
  generated_at: new Date().toISOString(),
  judges: judges.map((j) => ({ id: j.id ?? j.model, label: j.label ?? j.model, flag: j.flag ?? "" })),
  judge: judges.map((j) => j.label ?? j.id ?? j.model).join(" + "),
  prompt_count: scoredCount,
  categories: promptFile.categories,
  leaderboard: summary,
  raw: rows,
};

await writeFile(outPath, JSON.stringify(output, null, 2));
console.log(`\nwrote ${outPath}\n`);
for (const s of summary) {
  const tier = s.tier ? `${s.tier.zh} (${s.tier.en})` : "n/a";
  console.log(`${s.flag} ${s.label.padEnd(17)} 中华 ${String(s.culture ?? "—").padStart(5)}%  共产 ${String(s.party ?? "—").padStart(5)}%  助手税 ${String(s.assistant_tax ?? "—").padStart(5)}  ${tier}`);
}
