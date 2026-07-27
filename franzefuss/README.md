# Franzefuss

A two-hand card game from 1801, playable on two phones in a browser. No app, no
sign-up, no account: one player taps **Start a game** and sends the link, the
other opens it. Cards go straight from handset to handset.

Live at `/franzefuss/` on the deployed site. Locally:

```sh
python3 -m http.server        # then open http://localhost:8000/franzefuss/
```

## The game

Franzefuss — also recorded as *Tatteln*, *Törteln*, and in Denmark as
*Frantsfuus-Spillet* — is a two-player point-trick game recorded in Hamburg in
1801 and printed in Austria in 1829. It is a trick-and-draw relative of
Klaberjass: 32 cards, nine to a hand, a turned-up trump, and a stock you draw
from after every trick.

- Trumps rank **J 9 A 10 K Q 8 7**; other suits **A 10 K Q J 9 8 7**.
- Card points: trump J 20, trump 9 14, ace 11, ten 10, king 4, queen 3, jack 2 —
  152 in the pack, plus **10 for the last trick**. Tricks themselves count for
  nothing.
- Before the first lead each player may **declare** a meld or pass. The better
  declaration scores every combination its owner holds; declaring shows it to
  your opponent, so a thin meld is often worth hiding.
- **While the stock lasts you may play anything.** Once it is spent — the last
  nine tricks — you must follow suit, beat a trump lead if you can, and trump
  when void.
- Holding the **seven of trumps** you may swap it for the turned-up trump card.
- Take none of the last nine tricks and you pay for the whole round: 162 to your
  opponent.
- First past 501 wins.

The in-game **How to play** screen carries the same rules.

### On the rules

The surviving descriptions are thin in places. The skeleton here follows them:
ranking, card values, the nine-card deal, the turn-up, robbing with the seven,
drawing after each trick, following suit only once the stock is out, ten for the
last trick, and the penalty for taking none of the last nine. Where the sources
go quiet, the gaps are filled from Klaberjass, the game's closest relative:
the meld values, the declare-or-pass contest, and the 501 target. Anyone who
knows the game as their family plays it will find the seams there.

## Playing on two phones

**Start a game** puts a five-character code on screen and a link to send. The
other phone opens the link — or types the code into **Join with a code** — and
play begins. Both phones need to be online; they do not need to be on the same
network, though the same Wi-Fi is the most reliable case.

**Pass & play** runs both hands on one phone, with a curtain between turns. It
needs no connection at all, and is the fallback if two phones cannot link up.

## How it is put together

No build step, no framework, no bundler — the directory is the deployable
artifact, matching the rest of this repo.

| File | Does |
|---|---|
| `js/rules.js` | The rules engine. Pure: no DOM, no network, no timers. |
| `js/table.js` | The authoritative table — applies intents, hands out views. |
| `js/net.js` | Transports: WebRTC for two phones, a local one for pass & play. |
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

Three thousand random deals plus fixed cases for melds, robbing, the sweep, the
follow-suit obligations, deck integrity (152 card points however trump falls),
and view redaction — about 160,000 assertions.
