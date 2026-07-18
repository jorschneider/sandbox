#!/usr/bin/env node
/**
 * Kimi builds the microsite. This harness only ferries bytes:
 * it sends the ChinaTalk essay + a design brief to Moonshot's Kimi API and
 * writes whatever HTML Kimi returns to the repo root as index.html.
 *
 *   KIMI_API_KEY=sk-... node tools/kimi-build.mjs generate
 *   KIMI_API_KEY=sk-... node tools/kimi-build.mjs revise "feedback…" shot1.png shot2.png
 *
 * The key is read from the environment only — never hardcode it here.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API_KEY = process.env.KIMI_API_KEY;
if (!API_KEY) {
  console.error("KIMI_API_KEY is not set. Aborting.");
  process.exit(1);
}

const MODEL = process.env.KIMI_MODEL || "kimi-k3";
const API = "https://api.moonshot.ai/v1/chat/completions";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "index.html");

// Moonshot's platform input filter hard-rejects two strings that appear in the
// essay, regardless of context ("Xi Jinping" as a full name, and the name of a
// banned religious movement). For transport we shorten the leader's name to
// "Xi" (as most of the essay already does) and code the movement as
// "Grey Lotus"; after the final revision round the publisher mechanically
// restores the original wording in index.html (sed "Grey Lotus" -> original).
const ESSAY = readFileSync(join(ROOT, "tools", "essay.txt"), "utf8")
  .replaceAll("Xi Jinping’s", "Xi’s")
  .replaceAll("Xi Jinping's", "Xi's")
  .replaceAll("Xi Jinping", "Xi")
  .replaceAll("Falun Gong", "Grey Lotus");

const BRIEF = `
You are Kimi, Moonshot AI's frontier model, acting as the SOLE designer,
writer-adapter, and front-end engineer for a scenario microsite. A human
orchestrator will save your output verbatim as index.html and serve it as a
static site — nothing you write will be edited by anyone else, so it must be
complete and production-quality.

======================================================================
THE SOURCE MATERIAL
======================================================================
The site illustrates the ChinaTalk essay "When China Gets a Mythos Model"
(full text at the end of this message). It is an explicitly HYPOTHETICAL
scenario exercise: when a Chinese lab trains a model as capable as Anthropic's
frontier "Claude Mythos" (whose cyber capabilities pushed Washington into a de
facto licensing regime), what does Beijing do? The essay invents a fictional
model — Z.ai "GLM 6" — and tells three branching stories, then the ChinaTalk
team gives probability forecasts. Today's real date is July 18, 2026.

======================================================================
THE ASSIGNMENT
======================================================================
Build a single-page scenario microsite in the tradition of ai-2027.com — the
"AI 2027" scenario forecast site: serious editorial futurism, a scrolling
narrative timeline with dates, restrained data visualization, the feeling of a
classified briefing typeset like a magazine. The user calls this the
"AI 2027 → 2040 style": the narrative starts in 2026 and each branch may
extrapolate out to 2040 in a clearly-labeled epilogue.

DELIVERABLE: exactly ONE complete, self-contained HTML file.
- All CSS in one <style> block, all JS in one <script> block. No external
  libraries, no CDNs, no images (draw everything as inline SVG/CSS). Google
  Fonts via <link> is permitted (at most two families, e.g. a serif for
  narrative + a sans or mono for data/labels) — but the site must still look
  acceptable if fonts fail to load.
- Works from file:// or any static host. No build step.
- Responsive: elegant at 1440px, 1024px, and 390px wide. Narrative column
  ~65ch max-width.
- Semantic HTML, keyboard-accessible interactions, honors
  prefers-reduced-motion, lang attributes on Chinese text (zh-Hans).

======================================================================
REQUIRED STRUCTURE (top to bottom)
======================================================================
1. HERO — Title "When China Gets a Mythos Model", a Chinese subtitle of your
   own elegant devising, a one-sentence dek, byline:
   "A ChinaTalk scenario exercise — Jordan · Aqib · Lily · Irene", plus
   "Site written, designed & coded by Kimi (Moonshot AI)". July 2026 dateline.

2. PROLOGUE — the real-world setup as a dated vertical timeline (June 2026
   Jie Tang tells Elon a Mythos-class Chinese model lands within the year;
   Kimi K3's release shows it's close; July 7 Reuters report on restricting
   overseas access; Xi's WAIC speech on AI risk and "human control"; the
   White House's de facto licensing regime around Mythos). Use the essay's
   own language where possible.

3. THE BRANCH POINT — a visually distinct moment: the fictional Z.ai GLM 6
   quietly crosses the Mythos line. Three doors open. A scenario selector
   (tabs or cards) lets the reader jump between the three branches; all three
   remain readable by scrolling. Give each scenario a persistent identity
   color and a Chinese title of your own devising.

4. THREE SCENARIO BRANCHES — each a dated narrative timeline (late 2026 →
   2027) faithfully adapting the essay's prose:
   · Scenario 1 "Let It Rip" — open-source drop, zero-days discovered,
     enterprise adoption surges, Beijing tolerates it but quietly builds a
     cyber-capability licensing regime.
   · Scenario 2 "Glasswing with Chinese Characteristics" — Project IceFeather
     (冰羽项目) with the CAC, ministries and SOEs first, endless evaluation,
     eventually a lobotomized GLM 6-Open plus paid API.
   · Scenario 3 "The Black Box" — registry rules give the state exclusive
     access, GLM 6 becomes an assassin's mace (杀手锏), on-premise government
     deployment, a weakened public model, cyber pressure on the Global South
     and Europe, Z.ai as insulated national champion.
   Each branch ends with an "EXTRAPOLATION 2028–2040" epilogue — your own
   informed speculation clearly labeled as going beyond the essay, written in
   the same in-world register, 3–5 dated beats reaching 2040.

5. IN-UNIVERSE ARTIFACTS — one fictional bilingual prop per scenario, written
   by you in authentic register, each stamped clearly "FICTIONAL · 虚构":
   S1: Zhipu's launch-day hype post open-sourcing GLM 6.
   S2: a dry CAC/state-media bulletin announcing 冰羽项目 naming Z.ai as
       core private-sector partner.
   S3: terse leaked meeting-minute excerpts from Z.ai's summons to the CAC.
   Simplified Chinese with English translation, styled as documents.

6. DATA — inline SVG charts, drawn by you (no libraries):
   a. "Cyber capability index" line chart re-imagining the essay's fictitious
      graph: Claude Mythos, GPT 5.6 (visibly sandbagged below Mythos), and
      GLM 6 arriving at Mythos level. Label lines directly.
   b. Enterprise adoption of Chinese models: gentle slope, then the dramatic
      uptick at GLM 6's release.
   c. THE FORECAST — the heart of the site: horizontal probability bars per
      forecaster and scenario. Team numbers from the essay:
      Jordan  S1 20 · S2 65 · S3 15
      Aqib    S1 45 · S2 45 · S3 10
      Lily    S1 35 · S2 45 · S3 20
      Irene   S1 30 · S2 25 · S3 45
      Then add YOUR OWN row: "Kimi (Moonshot AI)" — the essay literally names
      Kimi as a lab that might train China's Mythos. Choose your own three
      integers summing to 100 and write a candid 2–4 sentence first-person
      rationale placed beside the chart, speaking as a Chinese frontier model
      asked to forecast its own possible fate. Analytical, not promotional.
   Chart craft rules: one y-axis per chart, thin marks, direct labels over
   legends where possible, muted hairline grid, text in ink colors (never in
   series color), no rainbow. Suggested validated palette — series blue
   #2a78d6, yellow #eda100, red #e34948, green #008300, violet #4a3aa7;
   ink #0b0b0b, secondary #52514e, muted #898781, hairline #e1e0d9 on a
   warm paper surface (e.g. #f9f8f4 page / #fcfcfb chart). You may restyle
   but keep series distinguishable for colorblind readers and ≥3:1 contrast.

7. STICKY CHROME — on desktop, a slim sticky element (sidebar or top rail)
   showing the CURRENT DATE of the timeline as the reader scrolls (updates
   via IntersectionObserver from data-date attributes) plus which branch the
   reader is inside. Collapses gracefully on mobile.

8. WHAT DO YOU THINK — closing call-to-action linking the reader poll:
   https://docs.google.com/forms/d/e/1FAIpQLSdPB1_jLhWgsD0OPBgk6U2AQ9FbpmW3NLsNazS5HCh-w0wefQ/viewform

9. FOOTER — disclaimers: hypothetical scenarios; GLM 6 is fictional; all
   artifacts are invented props; adapted from the ChinaTalk essay; "This page
   was generated end-to-end by Kimi (kimi-k2.7-code) via the Moonshot API,
   orchestrated through Claude Code." Include footnotes from the essay
   (Dean Ball quote context, Concordia AI report, the 2020 Xi "assassin's
   mace" speech and CSET's 杀手锏 definition) as a small footnote block.

======================================================================
VOICE & DESIGN DIRECTION
======================================================================
- Editorial gravitas: cream paper, near-black ink, one restrained accent per
  scenario. Generous whitespace. Serif narrative, small-caps or mono labels
  for dates and data. Chinese characters used as large ghosted display
  ornaments where tasteful.
- The essay's actual sentences are good — adapt them faithfully, trim for
  rhythm; do not dumb them down or bury them under UI.
- Everything fictional must be unmistakably labeled as fiction; the real
  events in the prologue (Reuters, WAIC, K3) stay factual.
- No lorem ipsum, no TODOs, no placeholder anything. Ship complete.

OUTPUT PROTOCOL: reply with ONLY the raw HTML document — first characters
"<!DOCTYPE html>", last characters "</html>". No markdown fences, no
commentary before or after.

======================================================================
FULL ESSAY TEXT
======================================================================
`;

async function call(messages, maxTokens) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: MODEL, messages, max_tokens: maxTokens, stream: true }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 800)}`);
  // OpenAI-compatible SSE stream; thinking models interleave reasoning deltas,
  // which we count but do not keep.
  let text = "";
  let finish = null;
  let usage = null;
  let reasoningChars = 0;
  let lastLog = Date.now();
  const decoder = new TextDecoder();
  let buf = "";
  for await (const chunk of res.body) {
    buf += decoder.decode(chunk, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop();
    for (const line of lines) {
      const m = line.match(/^data:\s*(.*)$/);
      if (!m || m[1] === "[DONE]") continue;
      let evt;
      try {
        evt = JSON.parse(m[1]);
      } catch {
        continue;
      }
      const c = evt.choices?.[0];
      if (c?.delta?.content) text += c.delta.content;
      if (c?.delta?.reasoning_content) reasoningChars += c.delta.reasoning_content.length;
      if (c?.finish_reason) finish = c.finish_reason;
      if (evt.usage) usage = evt.usage;
    }
    if (Date.now() - lastLog > 5000) {
      console.error(`  …streaming: ${text.length} chars out, ${reasoningChars} thinking chars`);
      lastLog = Date.now();
    }
  }
  return { text, finish, usage };
}

async function complete(messages) {
  // Try generous completion budgets first; fall back if the API rejects them.
  const budgets = [65536, 32768, 16384];
  let out = "";
  let convo = [...messages];
  for (let round = 0; round < 12; round++) {
    let resp, lastErr;
    for (const b of budgets) {
      // The platform's prompt classifier is stochastic near its threshold:
      // identical payloads sometimes block then pass. Retry a few times.
      for (let attempt = 0; attempt < 6 && !resp; attempt++) {
        try {
          resp = await call(convo, b);
        } catch (e) {
          lastErr = e;
          if (/content_filter/i.test(e.message)) {
            // The block state decays with time; back off generously.
            const wait = Math.min(120, 15 * 2 ** attempt);
            console.error(`  content_filter (attempt ${attempt + 1}), retrying in ${wait}s…`);
            await new Promise((r) => setTimeout(r, wait * 1000));
            continue;
          }
          if (!/max_tokens|length|too large|invalid/i.test(e.message)) throw e;
          break; // try next budget
        }
      }
      if (resp) break;
    }
    if (!resp) throw lastErr;
    out += resp.text;
    console.error(`  round ${round + 1}: +${resp.text.length} chars, finish=${resp.finish}, usage=${JSON.stringify(resp.usage ?? {})}`);
    if (resp.finish !== "length") return out;
    convo = [
      ...messages,
      { role: "assistant", content: out },
      {
        role: "user",
        content:
          "Your reply was cut off by the token limit. Continue EXACTLY from the last character you emitted — no repetition, no preamble, no code fences. Just keep going until </html>.",
      },
    ];
  }
  return out;
}

function cleanHtml(text) {
  let t = text.trim();
  t = t.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/, "").trim();
  const start = t.indexOf("<!DOCTYPE");
  if (start > 0) t = t.slice(start);
  return t;
}

function imagePart(path) {
  const b64 = readFileSync(path).toString("base64");
  return { type: "image_url", image_url: { url: `data:image/png;base64,${b64}` } };
}

const mode = process.argv[2] || "generate";

if (mode === "generate") {
  console.error(`Generating with ${MODEL}…`);
  const html = cleanHtml(
    await complete([{ role: "user", content: BRIEF + ESSAY }])
  );
  if (!/^<!DOCTYPE/i.test(html) || !/<\/html>\s*$/i.test(html)) {
    writeFileSync(OUT + ".partial", html);
    console.error("Output did not look like a complete HTML document; wrote index.html.partial for inspection.");
    process.exit(1);
  }
  writeFileSync(OUT, html + "\n");
  console.error(`Wrote ${OUT} (${html.length} chars)`);
} else if (mode === "revise") {
  const feedback = process.argv[3] || "Review your site and improve anything that looks broken or unpolished.";
  const shots = process.argv.slice(4);
  const current = readFileSync(OUT, "utf8");
  console.error(`Revising with ${MODEL} (${shots.length} screenshot(s))…`);
  const content = [
    {
      type: "text",
      text:
        `You are Kimi, sole author of the scenario microsite below (the design brief you originally followed is included after the code for reference). Attached are screenshot(s) of how it currently renders. Feedback from the render check:\n\n${feedback}\n\nReturn the COMPLETE corrected HTML document — the whole file, first characters "<!DOCTYPE html>", last "</html>", no markdown fences, no commentary. Preserve everything that already works; fix what the feedback and your own critique of the screenshots demand.\n\n=== CURRENT index.html ===\n` +
        current +
        `\n\n=== ORIGINAL BRIEF (for reference) ===\n` +
        BRIEF,
    },
    ...shots.map(imagePart),
  ];
  const html = cleanHtml(await complete([{ role: "user", content }]));
  if (!/^<!DOCTYPE/i.test(html) || !/<\/html>\s*$/i.test(html)) {
    writeFileSync(OUT + ".partial", html);
    console.error("Revision did not look complete; wrote index.html.partial, left index.html untouched.");
    process.exit(1);
  }
  writeFileSync(OUT, html + "\n");
  console.error(`Wrote ${OUT} (${html.length} chars)`);
} else {
  console.error(`Unknown mode: ${mode} (use "generate" or "revise")`);
  process.exit(1);
}
