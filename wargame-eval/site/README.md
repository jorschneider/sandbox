# WarBench site

A static, single-page explainer + leaderboard for the eval — what the wargame
is, how the coded-umpire adjudication works, what's faithful to the CSIS
tables, how scoring works, and the live-API results. Modeled loosely on
[ceobench.com](https://ceobench.com/)'s narrative style.

Three files, no build step or framework:

- `index.html` — narrative content + a small vanilla-JS renderer for the tables
- `style.css` — the design (Red/Blue wargame palette)
- `data.js` — `window.WARBENCH_DATA` generated from the saved tournament runs

## Regenerate the data

```sh
cd wargame-eval
python analysis/build_site.py     # reads analysis/real_run*/summary.json -> site/data.js
```

`data.js` is embedded as a script (not fetched), so the page works over
`file://` and any static host without CORS issues.

## Preview / deploy

```sh
# preview locally
python -m http.server -d site 8000     # then open http://localhost:8000

# deploy the site directory (Vercel)
npx -y vercel deploy site --yes --token "$VERCEL_TOKEN"
```
