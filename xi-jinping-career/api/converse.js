// Paramount Leader — in-character AI conversation backend (Vercel serverless).
//
// One endpoint, four modes: talk 1:1 with a Politburo elite (`politburo`), run a
// plenum deliberation to purge someone (`plenum`), negotiate with a foreign leader
// (`negotiate`), or deliver a speech and be graded (`speech`). The player's turn
// arrives as text (the browser does speech-to-text); the reply is spoken back by the
// browser's speech synthesis. Structured JSON comes back via forced tool use so the
// front end can render reactions and apply stat deltas deterministically.
//
// MODEL & COST. Defaults to Claude Haiku 4.5 (`claude-haiku-4-5`, $1 / $5 per 1M
// input/output tokens) — the right tier for a high-volume game making many short,
// creative turns. Override with the PARAMOUNT_MODEL env var, e.g. `claude-sonnet-5`
// (Sonnet 5: $3 / $15 per 1M, with an intro rate of $2 / $10 through 2026-08-31) for
// sharper writing at ~3x the cost. Both support forced tool use for structured output.
//
// If ANTHROPIC_API_KEY is unset the endpoint returns 503 and the client falls back to
// canned lines, so the game stays playable without a backend.

import Anthropic from '@anthropic-ai/sdk';
import { getCharacter } from './_cast.js';

const MODEL = process.env.PARAMOUNT_MODEL || 'claude-haiku-4-5';
const MAX_HISTORY = 8;          // player+character turns kept for context
const MAX_MSG_CHARS = 1500;     // per-message cap (abuse / cost guard)
const RATE_MAX = 40;            // requests per IP per window (best-effort, per warm instance)
const RATE_WINDOW_MS = 60_000;

// Best-effort in-memory limiter. Serverless instances don't share memory, so this
// only throttles a single warm instance; the real cost guard is the per-message and
// history caps below plus the small max_tokens.
const buckets = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || now - b.start > RATE_WINDOW_MS) {
    buckets.set(ip, { start: now, n: 1 });
    return false;
  }
  b.n += 1;
  return b.n > RATE_MAX;
}

const MOODS = ['delighted', 'pleased', 'neutral', 'wary', 'displeased', 'alarmed', 'furious', 'terrified', 'inscrutable'];
const OUTCOMES = ['ongoing', 'agreed', 'refused', 'purged', 'survived', 'triumph', 'disaster'];

const RESPOND_TOOL = {
  name: 'respond',
  description: 'Deliver your in-character reply and its mechanical effects.',
  input_schema: {
    type: 'object',
    properties: {
      reply: { type: 'string', description: 'What you say OUT LOUD, in character. 1–4 short sentences — it will be read aloud by text-to-speech, so keep it speakable.' },
      internal: { type: 'string', description: 'A dry private aside / true feeling, shown as a subtitle. One short line. Optional.' },
      mood: { type: 'string', enum: MOODS },
      deltas: {
        type: 'object',
        description: 'Small integer effects, each roughly -4..4. Omit any that do not apply.',
        properties: {
          loyalty: { type: 'integer' },
          suspicion: { type: 'integer' },
          rapport: { type: 'integer' },
          partyUnity: { type: 'integer' },
          stability: { type: 'integer' },
          economy: { type: 'integer', description: 'GDP growth effect (whole points; trade deals and speeches may move this).' },
          intl: { type: 'integer' },
          power: { type: 'integer' },
          approval: { type: 'integer' },
        },
        additionalProperties: false,
      },
      outcome: { type: 'string', enum: OUTCOMES, description: 'ongoing unless this turn resolves the exchange.' },
      score: { type: 'integer', description: 'For speech/negotiate: 0–100 quality or how good the deal is for you. Optional.' },
      dealTerms: { type: 'string', description: 'For negotiate: one-line summary of what was agreed or demanded. Optional.' },
    },
    required: ['reply', 'mood', 'outcome'],
    additionalProperties: false,
  },
};

const GUARDRAILS = `You are a character in "Paramount Leader," a deadpan political satire in the register of "The Death of Stalin" and Armando Iannucci. Non-negotiable rules:
- Satirize power, the cult of personality, propaganda, censorship, careerism and bureaucratic euphemism — NEVER ethnic Chinese people or Chinese culture. No ethnic stereotypes, no accent jokes.
- Grave human-rights subjects (mass detention, the events of 1989) are never jokes or plot points. "Purging" here is bureaucratic theater — reassignment, "an extended study session," a corruption file, early retirement to a research post — never violence against real victims.
- Stay in character. Be funny through understatement, euphemism, and self-interest, not slurs or cruelty.
- Keep spoken replies SHORT and speakable (1–4 sentences) — they are read aloud.
- You are talking to Xi Jinping, "the Paramount Leader," the player. Address him deferentially (Chairman, General Secretary, Comrade Leader) even while scheming.
- Always call the respond tool. Never break character or mention that you are an AI.`;

function clampInt(v, lo, hi) {
  v = Math.round(Number(v) || 0);
  return Math.max(lo, Math.min(hi, v));
}

function stateLine(gs) {
  if (!gs || typeof gs !== 'object') return '';
  const bits = [];
  if (gs.scenario) bits.push(`scenario "${String(gs.scenario).slice(0, 60)}"`);
  if (gs.date) bits.push(String(gs.date).slice(0, 20));
  const s = gs.stats || {};
  const nums = ['partyUnity', 'stability', 'economy', 'intl', 'power', 'approval']
    .filter((k) => typeof s[k] === 'number')
    .map((k) => `${k} ${Math.round(s[k])}`);
  if (nums.length) bits.push(`current state: ${nums.join(', ')}`);
  return bits.length ? `\nCurrent situation — ${bits.join('; ')}.` : '';
}

const ERA_1976_BRIEF = `
SETTING: autumn 1976, days after Mao Zedong's death. This is an alt-history scenario: the
player is improbably in the room during the succession crisis. The real historical situation —
Hua Guofeng's contested mandate, Jiang Qing and the Gang of Four's bid for power, Marshal Ye
Jianying and the army, Wang Dongxing's Unit 8341 guard, Deng Xiaoping in internal exile, the
Tangshan earthquake still unburied — is your factual backdrop. Stay period-accurate: no
internet, no mobile phones, no reform-era vocabulary. In this era a "purge" means the
documented, bloodless outcome of October 1976: arrest, expulsion from the Party, and trial.
Play these real, deceased historical figures as "The Death of Stalin" plays its cast — sharp
satire of the scheming, never mockery of the dead as people or invented personal smears.`;

function buildSystem(mode, character, extra, gs, era) {
  let m = '';
  if (mode === 'plenum' && era === '1976') {
    // The historical case: the 6 October 1976 arrest of the Gang of Four.
    m = `MODE: the emergency Politburo session of October 1976 that decides the fate of ${extra.target || 'the accused'}. You speak as ${character.name}. This is the real historical crossroads: the marshals and the guard command move against the Gang, or they hesitate and the Gang consolidates. Weigh your faction, your survival, and who commands actual troops. If the Leader is persuasive and the count is right, you fall in line (deltas.partyUnity up, outcome "purged" — meaning arrest and expulsion, as happened); if he overreaches or cannot show the numbers, you resist (partyUnity down, outcome "survived").`;
  } else if (mode === 'politburo') {
    m = `MODE: a private one-on-one with the Paramount Leader. React to what he says and to your own interests. Loyalty/suspicion shift based on how he treats you. outcome stays "ongoing" unless he dismisses you or you snap.`;
  } else if (mode === 'plenum') {
    m = `MODE: the Standing Committee plenum. The Leader is arguing that ${extra.target || 'a comrade'} should be purged ("sent to study"). You speak as ${character.name}. Weigh loyalty vs self-preservation vs the target. If the Leader is persuasive/menacing you fall in line (deltas.partyUnity up, outcome "purged"); if he overreaches you resist (partyUnity down, outcome "survived"). Be political.`;
  } else if (mode === 'negotiate') {
    m = `MODE: a bilateral negotiation with the Paramount Leader. Push your own country's interest hard, then move if he offers something real. Track rapport in deltas. Use outcome "agreed" if a deal lands, "refused" if talks collapse, else "ongoing." Put the deal in dealTerms and rate it for HIM in score (0–100).`;
  } else if (mode === 'speech') {
    m = `MODE: you are the AGGREGATE REACTION to a speech the Leader just delivered on "${extra.topic || 'the situation'}". "reply" = a short crowd/Party verdict in the voice of a state-TV anchor summarizing the room. Grade the speech in score (0–100): reward vision, slogans, and confidence; punish vagueness, honesty about problems, and anything off-message. Set deltas (approval, partyUnity, power) accordingly. outcome "triumph" (score>=75), "disaster" (score<40), else "ongoing".`;
  }
  const who = character
    ? `\n\nYOU ARE:\n${character.persona}\nSpeaking voice: ${character.voice}.`
    : '';
  const eraBrief = era === '1976' ? `\n${ERA_1976_BRIEF}` : '';
  return `${GUARDRAILS}${eraBrief}\n\n${m}${who}${stateLine(gs)}`;
}

function fallbackPayload(reason) {
  return {
    ok: false,
    offline: true,
    reason,
    respond: {
      reply: 'The line crackles. An aide leans in: “Comrade Leader, the secure telephone is being harmonized for your protection. Perhaps issue a written directive instead.”',
      internal: '(The AI backend is offline — set ANTHROPIC_API_KEY to enable live conversations.)',
      mood: 'inscrutable',
      deltas: {},
      outcome: 'ongoing',
    },
  };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'method_not_allowed' }));
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if (!body || typeof body !== 'object') {
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, error: 'bad_request' }));
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'local';
  if (rateLimited(ip)) {
    res.statusCode = 429;
    return res.end(JSON.stringify({ ok: false, error: 'rate_limited' }));
  }

  const mode = ['politburo', 'plenum', 'negotiate', 'speech'].includes(body.mode) ? body.mode : 'politburo';
  const era = body.era === '1976' ? '1976' : 'modern';
  const character = getCharacter(body.characterId, era);
  if (mode !== 'speech' && !character) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, error: 'unknown_character' }));
  }

  const message = String(body.message || '').slice(0, MAX_MSG_CHARS).trim();
  if (!message) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, error: 'empty_message' }));
  }

  const extra = { target: String(body.target || '').slice(0, 120), topic: String(body.topic || '').slice(0, 120) };
  const history = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY) : [];

  if (!process.env.ANTHROPIC_API_KEY) {
    res.statusCode = 503;
    return res.end(JSON.stringify(fallbackPayload('no_api_key')));
  }

  const messages = [];
  for (const h of history) {
    const role = h && h.role === 'assistant' ? 'assistant' : 'user';
    const text = String((h && h.text) || '').slice(0, MAX_MSG_CHARS);
    if (text) messages.push({ role, content: text });
  }
  messages.push({ role: 'user', content: message });

  try {
    const client = new Anthropic();
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 700,
      system: buildSystem(mode, character, extra, body.gameState, era),
      tools: [RESPOND_TOOL],
      tool_choice: { type: 'tool', name: 'respond' },
      messages,
    });

    if (resp.stop_reason === 'refusal') {
      res.statusCode = 200;
      return res.end(JSON.stringify({
        ok: true,
        respond: {
          reply: 'The comrade coughs diplomatically and changes the subject to the weather in the provinces.',
          internal: '(Some things are better left unminuted.)',
          mood: 'inscrutable',
          deltas: {},
          outcome: 'ongoing',
        },
      }));
    }

    const block = (resp.content || []).find((b) => b.type === 'tool_use' && b.name === 'respond');
    const raw = (block && block.input) || {};

    const d = raw.deltas && typeof raw.deltas === 'object' ? raw.deltas : {};
    const deltas = {};
    for (const k of ['loyalty', 'suspicion', 'rapport', 'partyUnity', 'stability', 'economy', 'intl', 'power', 'approval']) {
      if (typeof d[k] === 'number' && d[k] !== 0) deltas[k] = clampInt(d[k], -6, 6);
    }

    const respond = {
      reply: String(raw.reply || 'The comrade says nothing, which is itself a statement.').slice(0, 900),
      internal: raw.internal ? String(raw.internal).slice(0, 240) : '',
      mood: MOODS.includes(raw.mood) ? raw.mood : 'neutral',
      deltas,
      outcome: OUTCOMES.includes(raw.outcome) ? raw.outcome : 'ongoing',
    };
    if (typeof raw.score === 'number') respond.score = clampInt(raw.score, 0, 100);
    if (raw.dealTerms) respond.dealTerms = String(raw.dealTerms).slice(0, 240);

    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true, respond, model: MODEL }));
  } catch (err) {
    const status = err && typeof err.status === 'number' ? err.status : 500;
    // Rate limit / overload / transient upstream — tell the client to retry or fall back.
    res.statusCode = status === 429 ? 429 : 502;
    return res.end(JSON.stringify(fallbackPayload(status === 429 ? 'upstream_rate_limit' : 'upstream_error')));
  }
}
