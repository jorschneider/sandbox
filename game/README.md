# 🛡️ Broker Battle

A two-player insurance-broker-exam study game built for **Jordan & Athena**.
No build step — open `game/index.html` (or visit `/game/` when deployed). Plays
great on a phone passed back and forth.

## Modes

| Mode | Players | The hook |
|------|---------|----------|
| ⚔️ **Versus + Steal** | competitive | Take turns. Miss a question and your rival can **steal** it. **Double-or-Nothing** wagers and a **50/50 lifeline** keep both players on the hook every turn. |
| 🐉 **Co-op Boss Battle** | cooperative | Team up against **The Examiner** — one shared HP bar, three shared lives. Hit a hard one? **Consult** your partner (talk it out for a 50/50 hint, at half damage). Best mode for actually learning together. |
| ⚡ **Reflex Duel** | fast & silly | Lay the phone flat between you. Two answers, split-screen, **race to tap** the right one. Wins on reflexes + recall. Ties go to sudden death. |
| 🎤 **Quizmaster** | couch mode | One person reads the question aloud, the other answers out loud, the host taps ✓/✗. The host sees the explanation too, so both people learn. |

## Why it teaches

Every answer — right, wrong, or timed-out — reveals a plain-English
**explanation**. The end screen tallies a **"topics to review"** list from the
categories you missed, so you know exactly what to hit next.

## Content

~90 questions across 7 topics: Principles, Risk, Contracts, Life, Health,
Property/Casualty, and Law & Ethics. These cover broadly-tested pre-licensing
fundamentals and are **study aids, not official exam questions** — cross-check
against Athena's state/line-specific study guide.

## Tech

Vanilla HTML/CSS/JS (ES modules). Synthesized sound (Web Audio, no asset
files), canvas confetti, screen shake, and mobile haptics — all dependency-free.
Tap the 🔊 button (top-right) to mute.

## Tweaks you might want

- Add your own questions: append to `questions.js` (each needs `cat`, `q`,
  4 `choices`, an `answer` index, and a `why`).
- Adjust match length / timer / topics from **⚙️ Match settings** on the home screen.
