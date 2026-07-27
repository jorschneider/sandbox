# Franzefuß

An Austrian card game for two, last printed in 1890, playable on two phones in a browser. No app, no
sign-up, no account: one player taps **Start a game** and sends the link, the
other opens it. Cards go straight from handset to handset.

Live at `/franzefuss/` on the deployed site. Locally:

```sh
python3 -m http.server        # then open http://localhost:8000/franzefuss/
```

## The game

Franzefuß — also *Tatteln*, *Törteln*, *Därde*; in Denmark *Frantsfuus-Spillet* —
is a two-hand point-trick game of the Austrian nineteenth century. The
*Oeconomische Encyclopädie* of 1842 describes it as "ein im Oesterreichischen
sehr beliebtes Kartenspiel … aus dem bekannten Piquet und dem veralteten Mariage
zusammengesetzt": assembled out of Piquet and Mariage. That is exactly its shape.
**The trick play is Mariage's; the combinations and their scoring are Piquet's.**

- 32 cards, nine to a hand, a turned-up trump, and a stock you draw from after
  every trick.
- Trumps rank **J 9 A 10 K Q 8 7**; other suits **A 10 K Q J 9 8 7**.
- Card points: trump J 20, trump 9 14, ace 11, ten 10, king 4, queen 3, jack 2 —
  152 in the pack, plus **10 for the last trick**. Tricks themselves count for
  nothing.
- **Whenever you lead** you may first announce a combination. Your opponent
  judges it against their own hand and says good or not good: if theirs is better
  you score *nothing* of that class; if yours is better you score every
  combination of that class you hold. Sequences and sets are judged separately,
  and a tie scores for neither.
- A run pays for every shorter run inside it — "eine Quart zählt nicht nur als
  solche, sondern auch als zwei Tattel, ein Fuß ebenso als drei Tattel und zwei
  Quarten". So a Tattel is 3, a Quart 4 + 3 + 3 = **10**, and a Fuß —
  the combination the game is named after — 15 + 4 + 4 + 3 + 3 + 3 = **32**.
  Three of a kind 3, four of a kind 14, tens and above only.
- Because a growing run keeps paying, a Tattel announced now and extended later
  scores again when the card arrives.
- **While the stock lasts you may play anything.** Once it is spent — the last
  nine tricks — you must follow suit, beat a trump lead if you can, and trump
  when void.
- Holding the **seven of trumps** you may swap it for the turned-up trump card.
- Take none of the last nine tricks and you pay for the whole round: 162 to your
  opponent.
- A partie is played to **100**, as in Piquet. Deals are large, so a partie is
  short; they were played one after another for stakes, and the app keeps a count
  of parties won.

### Which ruleset this is

The target is the last codification for the Austro-Hungarian market: **S. Ulmann,
*Das Buch der Familienspiele*, A. Hartleben, Wien/München/Pest 1890** — the
edition that called the game Franzefuß, following the 1829 Vienna rulebook and
the many that copied its wording. The nine-card deal is that newer form; eight
cards is the older one.

Those rulebooks omit the value of the combinations entirely. The encyclopedia
tells you where to look instead: *"die Berechnung der Sequenzen, Stiche und
Punktezahl, bis zu der man die ganze Partie spielt, ist genau wie beim Pikett."*
So the values here are Piquet's, as printed in German in 1883: *"die Octave zählt
18; die Septime 17; die Sixte 16, die Quinte 15, die Quarte 4 und die Terze 3
Punkte, vorausgesetzt, daß sie vom Gegner gutgeheißen werden"*, with four of a
kind at 14 and three at 3, down to the tens and no further.

Being straight about it: the game barely outlived the century that produced it.
It survived as *Tärtele* in Alsace until the second war, and lives on as Austrian
*Tartl* and Hungarian *Tartli*. Anyone dealt a hand of this in Prague in 1910
would have been playing something already old-fashioned — and would have held a
German-suited pack, not a French-suited one.

## Learning it

Nobody has played this game, so the app teaches it rather than assuming it.

**Learn by playing** deals you a hand against a practice opponent and explains
each rule at the moment that rule first decides something: what the cards are
worth before you must value a trick, why trumps rank J 9 A 10 K Q 8 7 while you
are looking at your trumps, the announce-or-stay-quiet tradeoff the first time
you are on lead holding a combination, and the tightening of the rules the
instant the stock runs dry. Eleven lessons, one tap each, in the order the game
raises them. The first deal is stacked so you actually get a combination to weigh
up and the trump seven to rob with.

Lessons never repeat: each is remembered once dismissed, and **Stop coaching me**
on any lesson ends them. The rules screen can replay them or turn them back on.

The coach runs in every mode, so someone handed a link with no explanation gets
taught too. Tapping a dimmed card always says why it cannot be played —
*"You must follow ♥ — the stock is empty."*

The rules screen is the reference for anything else, reachable from the home
screen and from **?** at the table.

## Playing on two phones

**Start a game** puts a five-character code on screen and a link to send. The
other phone opens the link — or types the code into **Join with a code** — and
play begins. Both phones need to be online; they do not need to be on the same
network, though the same Wi-Fi is the most reliable case.

**Pass & play** runs both hands on one phone, with a curtain between turns. It
needs no connection at all, and is the fallback if two phones cannot link up.

**Learn by playing** is a solo game against the practice opponent, coached.

## How it is put together

No build step, no framework, no bundler — the directory is the deployable
artifact, matching the rest of this repo.

| File | Does |
|---|---|
| `js/rules.js` | The rules engine. Pure: no DOM, no network, no timers. |
| `js/table.js` | The authoritative table — applies intents, hands out views. |
| `js/net.js` | Transports: WebRTC, solo-vs-bot, and local pass & play. |
| `js/coach.js` | The lessons, each a predicate over the view that renders the table. |
| `js/bot.js` | The practice opponent. Deterministic; follows the rules exactly. |
| `js/app.js` | Screens, rendering, input. |
| `vendor/peerjs.min.js` | PeerJS 1.5.4, vendored. |

One phone is authoritative. It owns the deck and both hands, accepts *intents*
("play this card") from the other, runs them through the engine, and sends each
player a **redacted view** — their own hand, and only a count of their
opponent's. The other hand and the order of the stock never cross the wire, so
there is nothing to read out of the console on the other phone. A test asserts
this directly against the view.

Signalling uses the public PeerJS broker, which introduces the two phones and
then steps out of the way; the cards themselves travel peer-to-peer. To point at
your own broker instead, set `window.FRANZEFUSS_PEER` before `js/app.js` loads:

```html
<script>window.FRANZEFUSS_PEER = { host: 'peer.example.com', port: 443, secure: true };</script>
```

Phones lock their screens and change networks mid-game, so each side pings the
other every three seconds; a link that goes quiet for ten is dropped and rebuilt.
A returning player is recognised by a stored token rather than turned away as a
third player, and the host holds the full game state while they are gone.

## Tests

```sh
node franzefuss/rules.test.mjs
```

Three thousand random deals plus fixed cases for the Piquet combination values
(a Quart pays 10, a Fuß 32, four of a kind beats three whatever the rank, sets
stop at the tens), announcing on the lead and only on the lead, good-and-not-good
against the other hand, a run that grows paying again, robbing, the sweep, the
follow-suit obligations, deck integrity (152 card points however trump falls),
and view redaction — about 174,000 assertions.
