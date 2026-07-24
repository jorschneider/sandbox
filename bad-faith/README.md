# Bad Faith — Animal Insurance Division 🐾

A 4-player, same-room mobile party game about insurance brokers. Four rival
brokers compete over five quarters to insure deeply uninsurable animal
clients — an escape-artist octopus, a violent swan HOA, one extremely
expensive goldfish. Whoever ends the year richest wins.

The phones hold the secrets and the math. The game happens out loud, at the
table: bluff during quoting, haggle on the deal floor, gloat during claims
season. **Eyes up, not down.**

## How to play

1. One player opens the site and taps **Start a new firm** — they're the host.
2. The other three scan the QR code (or enter the room code) and join.
3. Each quarter:
   - **The Market** — three animal clients want coverage. Everyone holds
     private intel cards; talk the clients up or down.
   - **Sealed Quotes** — quote a premium for any client. Lowest quote signs
     them: you pocket the premium, you carry the risk.
   - **The Deal Floor** — 90 seconds of open negotiation, made binding
     in-app: reinsure each other's policies, sell intel, wire bribes.
   - **Claims Season** — disasters resolve one file at a time, on every
     phone. Phones up. Someone screams.
   - **The Ledger** — the receipts, then the grudges.
4. After five quarters, the richest broker runs the market. Go negative and
   you play on as a *desperate broker* — desperate brokers hear everything
   (extra intel).

Best with 4 players; playable with 2–3.

## Tech

Static web app, no build step, no backend. Phones sync peer-to-peer over
WebRTC (PeerJS + the free public PeerServer for signaling); the host's phone
is the authoritative game server. `vendor/` contains the two runtime deps
(peerjs, qrcode-generator), checked in.

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
