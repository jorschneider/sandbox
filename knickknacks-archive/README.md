# Knick-Knacks — Site Archive

A self-contained offline archive of **https://knickknacks.nyc/**
("Knick-Knacks — Unofficial New York Knicks Bootleg Merch Guide"),
captured **2026-06-24**.

## What's here

- `index.html` — the full homepage, with every asset reference rewritten to
  point at local copies so the page renders completely offline.
- `assets/` — all locally-hosted files:
  - `knicks-logo.png` — site logo / favicon (from the original site)
  - `throwbacks1.png`, `throwbacks2.jpg` — product images that were hosted on
    the original site
  - `fonts.css` + `press-start-2p.ttf` — the "Press Start 2P" web font, pulled
    down from Google Fonts and rewritten to load locally
  - the 16 external product images referenced in the merch grid, downloaded
    from their third-party CDNs (Cookies Hoops, NBA Paint, ONLY NY, Trillblazin,
    Etsy, Wu-Tang Clan, Homage, etc.) and saved with readable filenames

## What was preserved as-is (external links)

These point to third-party destinations and were intentionally **not**
duplicated (they live on other people's servers):

- The 18 "Shop Now" product links in the merch grid.
- The guestbook: `https://www.yourworldoftext.com/~bagelday/knickknacks`
- The contact form (Google Forms).

The page's JavaScript (item grid + shuffle, archive tab, blog, hit counter,
Windows-98 popup) is unchanged and runs entirely client-side.

## Viewing it

Open `index.html` directly in a browser, or serve the folder:

```sh
cd knickknacks-archive
python3 -m http.server
# then open http://localhost:8000/
```

The original site is on Neocities; this archive is a faithful point-in-time
snapshot. Not affiliated with the New York Knicks or any listed brand — all
trademarks belong to their respective owners.
