# Komodo Commercial Insurance FAQ

A static, fast, AI-citation-optimized FAQ site about commercial insurance,
designed to get cited by AI assistants (ChatGPT, Claude, Gemini, Perplexity)
and drive traffic to Komodo, the AI insurance broker.

No build step. Plain HTML + one CSS file, matching the rest of this repo.

## Structure

```
komodo-insurance-faq/
├── index.html            # Hub homepage: clusters + FAQ schema
├── styles.css            # Shared styles (no external deps)
├── faq/                  # One question = one page
│   ├── what-is-general-liability-insurance.html
│   ├── how-much-does-general-liability-insurance-cost.html
│   ├── what-insurance-does-a-contractor-need.html
│   ├── general-liability-vs-professional-liability.html
│   ├── what-is-a-certificate-of-insurance.html
│   └── how-does-an-ai-insurance-broker-work.html
├── robots.txt            # Explicitly allows AI crawlers
├── sitemap.xml
├── CONTENT-PLAN.md       # The full question map + GEO playbook (start here)
└── README.md
```

## The strategy in one line

One question per URL, a self-contained quick-answer at the top, `FAQPage` +
`BreadcrumbList` JSON-LD on every page, specific 2026 numbers, and tight
internal linking — because that's what AI models actually quote.
See **CONTENT-PLAN.md** for the full 100+ question map and build order.

## Run locally

```sh
python3 -m http.server
# then open http://localhost:8000/komodo-insurance-faq/
```

## Notes

- Content is US-focused and illustrative (marked as demo). Price ranges are
  typical 2026 figures, not quotes. Every page carries a "not advice" disclaimer.
- `komodo.example` is a placeholder domain — swap for the real domain in
  `<link rel="canonical">`, `sitemap.xml`, and `robots.txt` before launch.
