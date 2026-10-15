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
**explanation**. After a match you can hit **"Review the ones you missed"** to
step back through every missed question with the correct answer and the why.

Progress is saved on the device (localStorage):

- **📈 Athena's progress** on the home screen shows **per-topic mastery bars**,
  sorted weakest-first, so you always know what to drill next.
- A running **series tally** (🏆 head-to-head, 🐉 record vs. The Examiner)
  persists across matches.
- Names, avatars, settings, and the mute toggle are remembered too.

## Install it on your phone

It's a **PWA** — open it on a phone, then "Add to Home Screen." It launches
full-screen and **works offline** (service worker caches everything), so you can
quiz on a plane or with spotty signal.

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
