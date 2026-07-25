# Bad Faith — Animal Insurance Division 🐾

A 4-player, same-room mobile party game about insurance brokers. Four rival
brokers compete over five quarters to insure deeply uninsurable animal
clients — an escape-artist octopus, a violent swan HOA, a komodo dragon
day spa, one extremely expensive goldfish. Whoever ends the year richest
wins.

Three modes, picked by the host when creating a game:

- **🏪 Open Market** (default) — everyone's a broker. Two rulebooks,
  picked at creation: **🌱 Rookie Desk** (the default for a first table:
  intel, sealed quotes, the deal floor, claims drama, awards — nothing
  else) and **🌶 Full Market** (adds coverage tiers, syndicated clients,
  the short desk, office overhead, Broker of the Quarter, solvency
  caps, and renewals — each quarter, the biggest policy that survived
  claims returns to the market as that broker's client to keep: poachers
  must beat the incumbent's old rate by 10% or the client stays loyal).
  2–4 players, 5 quarters. The rookie finale points the table at the
  full rulebook when they're ready.
- **⚔️ The Slip** — head-to-head, exactly 2 players, 6 rounds. Two
  mismatched clients are already written at the asking price; the dealer
  says who pays whom to even the book up ("whoever carries the whale
  hands over $300"), and the rival takes a side — or refuses both and
  leaves the dealer holding everything. Each broker holds intel on both
  lots, so the argument is about what you each know.
- **🤝 The Middleman** — the real insurance food chain, with rotating
  roles (3–4 players, one round per player). Each round one player's
  **the Customer** (it's their business — they see all its intel), one's
  **the Broker**, the rest are **Carriers**. Carriers privately quote the
  broker wholesale; the broker picks one and marks it up; the customer
  sees only the retail price and signs or goes bare. Then the claim rolls
  and the whole price chain goes public — spread and all.

Two editions, picked by the host when creating a game:

- **🐾 Animal Kingdom** (default) — the classic deck, quarters Q1–Year-End.
- **🗽 New York City** — Pizza Rat Logistics, the Bodega Cat Collective,
  the Sewer Alligator (Allegedly), Subway Rats Local 456… plus a
  taxi-yellow-on-asphalt skin, and each round is a borough.

The phones hold the secrets and the math. The game happens out loud, at the
table: bluff during quoting, haggle on the deal floor, gloat during claims
season. **Eyes up, not down.**

## How to play

1. One player opens the site and taps **Start a new firm** — they're the host.
2. The other three scan the QR code (or enter the room code) and join.
3. Each quarter:
   - **The Market** — three animal clients want coverage. Everyone holds
     private intel cards; talk the clients up or down. Each brochure
     advertises a risk rating with claim odds: Low ~15–25%, Moderate
     ~25–35%, High 35%+. The brochure is the client's own marketing —
     some of them are lying, and intel is how you find out.
   - **🔨 Open Outcry** (Full Market) — the syndicated whale is sold live
     instead of by sealed quote. It opens at the client's top price and
     brokers publicly undercut each other; every bid resets a short
     anti-snipe clock, so the lot only closes when nobody dares go lower.
     Whoever holds the low bid when the gavel falls signs it — and still
     owes the 40% layoff on the deal floor.
   - **Sealed Quotes** — pick how much of the client's asked coverage
     you'll write (50% / 75% / Full) and quote your premium. The client
     signs whoever offers the cheapest rate per dollar of coverage (rate
     ties go to the bigger policy): you pocket the premium, you carry the
     claim on the coverage you sold.
   - **The Deal Floor** — 90 seconds of open negotiation, made binding
     in-app: reinsure each other's policies, sell intel, wire bribes.
     Each round's biggest client is **syndicated** — too big for one firm.
     Its winner must lay off ≥40% in reinsurance before the floor closes
     or the contract voids (premium clawed back, plus a fine), so the
     table can squeeze them on price. And once per round, anyone can hit
     the **short desk**: a public bet that a client claims this quarter,
     paid at brochure-implied odds. Shorts are information, intimidation,
     or bluff — the table decides which.
   - **Claims Season** — disasters resolve one file at a time, on every
     phone. Phones up. Someone screams.
   - **The Ledger** — the receipts, then the grudges.
4. Nobody gets to just watch: write no business in a quarter (a policy or
   a reinsurance share both count) and you pay $100 office overhead. The
   most premium written each quarter earns the $150 **Broker of the
   Quarter** bonus. And the regulator caps what you can sign at 3× your
   capital ($1,000 floor) — overextended bids get blocked at signing, so
   laying risk off is also how you free up capacity to write more.
5. After five quarters, the richest broker runs the market. Go negative and
   you play on as a *desperate broker* — desperate brokers hear everything
   (extra intel).

Best with 4 players; playable with 2–3.

## If a phone drops

Seats survive interruptions. A phone keeps a per-tab seat key, so a
reload, a locked screen, a discarded tab or a network blip rebinds to the
same seat — same money, same intel — instead of locking the player out.
If the **host's** phone dies, the room isn't lost: the host snapshots the
game continuously, and reopening the app offers "Resume hosting" for up to
three hours. Everyone else's phone keeps knocking for 90 seconds and
rejoins the restored room on its own.

## Tech

Static web app, no build step, no backend. Phones sync through free public
MQTT relays over secure WebSockets (no WebRTC — works across any WiFi/
cellular mix, in-app browsers, and strict networks, anywhere HTTPS works).
The host's phone is the authoritative game server; joiners automatically
cycle through the relay list until they find the host. `vendor/` contains
the two runtime deps (mqtt.js, qrcode-generator), checked in.

- `js/content.js` — client/intel decks. All the comedy lives here; add
  clients freely, the engine picks 3 per round.
- `js/game.js` — authoritative game state machine (host only).
- `js/net.js` — transport: PeerJS for real play, BroadcastChannel
  (`?local=1`) for same-browser testing.
- `js/ui.js`, `js/main.js`, `css/style.css` — the app.

## Local dev

```sh
python3 -m http.server 8087   # from the repo root
# open http://localhost:8087/bad-faith/
```

Multi-player without four phones: open four tabs with `?local=1`.
Testing hooks: `?local=1&code=TEST&as=host&name=Ana` /
`?local=1&join=TEST&as=join&name=Ben`.

## Tests

`node tools/test.mjs` runs the engine rules suite (no browser, well under a
second): reveal-time settlement, timer handoff, solvency caps, rookie
gating, the auction, renewals/poaching, ledger arithmetic, and that every
mode terminates. Run it on every engine change — the browser E2E suites in
the scratchpad are the slow backstop, not the first line of defence.

## Economy tuning

`node tools/sim.mjs [games] [theme]` plays thousands of headless games with
four bot archetypes (passer / reckless undercutter / naive / intel-aware)
and reports claim rates, per-client margins, bankruptcies, and per-strategy
results. Targets: ~30% claim rate, near-zero average insurer margin,
intel-aware play beating both naive play and sitting out, and one deliberate
trap client per deck (Swan Lake: rated Low, priced Low, is not Low).
Set `SEAT=passer,naive,informed,informed` to control the table makeup.
