# THE DEATH OF MAO — Official Teaser Trailer

> *A comedy of succession.* Nobody is in charge. Everybody is in trouble.

A 3-minute, fully 3D animated teaser trailer in the satirical spirit of
**The Death of Stalin** (2017) — same gallows-comedy register, same
red/cream/black constructivist title cards, pointed at a different
politburo. September 1976: the Chairman is dead, which is officially a
problem, because nobody wants to be the one to announce it.

Everything is rendered **live in the browser**: no video file, no build
step, no external assets beyond two Google Fonts. Three.js is vendored.

![poster](assets/stills/poster.png)

## The production

| | |
|---|---|
| ![corridor](assets/stills/corridor.png) | ![square](assets/stills/square.png) |
| ![cast card](assets/stills/cast-card.png) | ![title](assets/stills/title.png) |

- **Eight 3D sets** — the Zhongnanhai compound at night, the Chairman's
  study (doctors chosen for loyalty, not medicine), a corridor sprint,
  the politburo meeting room, the Square in mourning, a nocturnal
  arrest conducted at a brisk jog, one very lonely desk, and a finale
  of wind-simulated flags.
- **A scripted 180-second edit** — 18 camera-animated shots cut against
  26 title cards, including a *Death of Stalin*-style cast sequence
  (The Widow, The Successor, The Marshal, The Exile, …and the Gang of
  Four — they counted themselves).
- **A procedural orchestral score** — ~3,000 notes of pseudo-Shostakovich
  (drones, gallops, timpani rolls, a state-funeral choir, one comedic
  silence) composed in code and scheduled sample-accurately through
  WebAudio. Visuals are clocked off the audio context, so picture and
  music cannot drift.
- **Cinematic dressing** — 2.39:1 letterbox, animated film grain,
  vignette, ACES tone mapping, a breath of handheld camera.

## Running it

Any static file server works:

```sh
npx serve .        # or: python3 -m http.server
```

Open the page, press **▶ PLAY TRAILER** (audio needs one click).

- `Space` pauses. Digits `1`–`9` seek to 10%–90%. The progress bar is clickable.
- `?t=95` starts at a given second; add `&mute=1` for silent autoplay (used for testing).

## Deploying

A GitHub Actions workflow (`.github/workflows/pages.yml`) deploys the
site to **GitHub Pages** on every push. It also works on Vercel as a
static site — `vercel deploy` from the repo root, or import the repo at
vercel.com; no configuration needed beyond the included `vercel.json`.

## Also in this repo

Static microsites that share the root, each self-contained and deployed with it:

- [`franzefuss/`](franzefuss/) — **Franzefuß**, the Austrian two-hand card game
  last codified in 1890, played over the internet on two phones. One player sends a link, the other
  opens it, and the cards travel straight between the handsets. Since nobody has
  heard of the game, it teaches itself: play a hand and it explains each rule at
  the moment that rule first matters. Also plays pass-and-play on one phone, or
  solo against a practice opponent. `npm test` runs its rules engine.
- [`rayray-outdoor-weekend/`](rayray-outdoor-weekend/) — a three-day guide to
  outdoor events in New York City.

---

*This is a work of satire. All low-poly persons depicted are 14
centimetres tall and entirely fictional. No historical accuracy was
harmed in the making of this trailer — it was never consulted.*
