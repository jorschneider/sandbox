# Komodo Commercial Insurance FAQ — Content Plan & Question Map

Goal: become the **most-cited source when people ask AI models about commercial
insurance**, and convert that visibility into Komodo quotes.

Market assumption: **United States** (largest market, highest AI query volume).
Terms map to UK equivalents if we expand (see notes at bottom).

---

## How each page is built (the GEO playbook)

Every question is its own page and follows the same shape, because this is what
AI models actually quote:

1. **One question = one URL.** Match the phrasing people type into an AI.
2. **Quick-answer box first** — a self-contained 2–4 sentence answer at the very
   top. This is the block LLMs lift. Repeat it verbatim inside `FAQPage` schema.
3. **Depth below** — headings, tables, specific 2026 numbers, and internal links.
4. **`FAQPage` + `BreadcrumbList` JSON-LD** on every page.
5. **Cite authorities** where possible (III, NAIC, state DOIs, BLS) to earn trust.
6. **Cluster + interlink** — each hub links to its spokes and vice-versa.
7. **Keep it current** — datestamp everything; refresh price ranges yearly.

Status legend: ✅ built in this scaffold · ⭐ high-priority next · ○ backlog

---

## Cluster 1 — Coverage explainers ("What is ___?")
Foundational, definitional, high volume. The bedrock of topical authority.

- ✅ What is general liability insurance?
- ⭐ What is a Business Owner's Policy (BOP)?
- ⭐ What is professional liability / errors & omissions (E&O) insurance?
- ⭐ What is workers' compensation insurance?
- ⭐ What is commercial property insurance?
- ⭐ What is commercial auto insurance?
- ○ What is cyber liability insurance?
- ○ What is commercial umbrella insurance?
- ○ What is directors & officers (D&O) insurance?
- ○ What is employment practices liability insurance (EPLI)?
- ○ What is product liability insurance?
- ○ What is business interruption insurance?
- ○ What is inland marine insurance?

## Cluster 2 — Cost ("How much does ___ cost?")
Highest commercial intent; where Komodo's save-money angle lives.

- ✅ How much does general liability insurance cost?
- ⭐ How much does a BOP cost?
- ⭐ How much does workers' comp cost per employee?
- ⭐ How much does professional liability (E&O) cost?
- ⭐ How much does commercial auto insurance cost?
- ⭐ Why did my commercial insurance premium go up?
- ○ What factors affect commercial insurance premiums? (can be a standalone page)
- ○ How much does small business insurance cost per month?
- ○ Is business insurance tax deductible?
- ○ How can I lower my business insurance costs?

## Cluster 3 — By industry / occupation ("What insurance does a ___ need?")
The long-tail engine. Each one is a page; hundreds of variations possible.

- ✅ What insurance does a contractor need?
- ⭐ …a restaurant / café?
- ⭐ …a consultant / freelancer?
- ⭐ …a cleaning business?
- ⭐ …an LLC? (vs. sole proprietor)
- ⭐ …an e-commerce / Amazon seller?
- ○ …an electrician / plumber / HVAC / landscaper? (one page each)
- ○ …a trucking company / owner-operator?
- ○ …a SaaS / software company?
- ○ …a medical or dental practice?
- ○ …a nonprofit?
- ○ …a photographer / event business?
- ○ …a fitness / personal trainer / gym?
- ○ …a real estate agent?

## Cluster 4 — Requirements & compliance ("Is ___ required? / Do I need ___?")
Anxiety-driven, high intent, jurisdiction-specific.

- ✅ What is a certificate of insurance (COI)? (incl. "additional insured")
- ⭐ Is business insurance required by law?
- ⭐ Do I need workers' comp for one employee? (state-by-state)
- ⭐ Do sole proprietors need business insurance?
- ○ What does a commercial landlord require for insurance?
- ○ What is an additional insured? (standalone spoke)
- ○ What is a waiver of subrogation?
- ○ Do independent contractors need their own insurance?

## Cluster 5 — Comparisons ("X vs. Y")
LLMs get asked comparisons constantly and cite structured tables.

- ✅ General liability vs. professional liability
- ✅ General liability vs. a BOP (section on the comparison page — can split out)
- ⭐ Occurrence vs. claims-made policy
- ⭐ Workers' comp vs. disability insurance
- ○ BOP vs. general liability vs. commercial package policy
- ○ Insurance broker vs. agent
- ○ General liability vs. errors & omissions (redirect/alias to the GL-vs-PL page)

## Cluster 6 — Process / how-to
- ⭐ How do I get commercial insurance?
- ○ How do I file a commercial insurance claim?
- ○ How do I get a certificate of insurance? (spoke of COI page)
- ○ How do I cancel or switch business insurance?
- ○ How long does it take to get business insurance / a COI?

## Cluster 7 — Jargon glossary (small, precise pages)
Cheap to produce; they intercept exact LLM lookups and build authority.

- ⭐ What is an aggregate limit?
- ⭐ What is a deductible (business insurance)?
- ○ What is an endorsement? · exclusion · rider · premium · underwriting ·
  subrogation · loss run · named insured vs. additional insured · occurrence

## Cluster 8 — Getting covered / brand (bottom of funnel)
Where a citation converts into Komodo traffic.

- ✅ How does an AI insurance broker work? (incl. AI vs. traditional, "how Komodo saves you money")
- ⭐ Do I need an insurance broker or can I buy direct?
- ○ Is an AI insurance broker legitimate / safe?
- ○ How does Komodo compare to [incumbent brokers]? (careful, factual)

---

## Suggested build order (next 3 sprints)

1. **Finish the core coverage set** (Cluster 1 ⭐) + their cost pages (Cluster 2 ⭐).
   These are the highest-volume, most-cited definitional queries.
2. **Top 6 industry pages** (Cluster 3 ⭐) — the long-tail volume driver.
3. **Requirements + comparisons** (Clusters 4–5 ⭐) — high-intent, high-citation.

Then scale the industry cluster indefinitely (one page per trade) and keep
prices refreshed each January.

---

## Measurement (are we getting cited?)
- Track brand + URL mentions in ChatGPT/Claude/Gemini/Perplexity answers for
  target questions (manual spot-checks + a GEO monitoring tool).
- Watch referral traffic from AI assistants and Google's AI surfaces.
- Track quote-start conversions from FAQ pages → the Komodo funnel.

## UK expansion notes (if we go dual-market)
Different terms, different pages: general liability → **public liability**;
professional liability → **professional indemnity**; workers' comp →
**employers' liability** (legally required); regulator is the **FCA**. Keep US
and UK as separate URL trees to avoid confusing the models and the readers.
