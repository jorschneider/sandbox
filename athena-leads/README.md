# Athena Leads

A small password-gated site presenting the insurance-exec outreach shortlist
built from the ChinaTalk subscriber export.

## How the gate works

This is a **server-side** gate, not a client-side trick:

- `index.html` / `app.js` / `styles.css` are static and contain **no data and no
  password**.
- `api/leads.js` is a Vercel serverless function that holds the contact data and
  the password. It only returns the data on a correct `POST { password }`.

So the real contact details (emails) never reach the browser until the correct
password is entered.

- **Password:** `athenaleads` (default). Override it by setting a `SITE_PASSWORD`
  environment variable on the Vercel project.

## Deploy (separate Vercel project — does NOT touch the Death of Mao site)

From the repo root, with `VERCEL_TOKEN` set in the environment:

```sh
# first time only: create/link a dedicated project for this directory
npx -y vercel link --yes --cwd athena-leads --project athena-leads --token "$VERCEL_TOKEN"

# preview deploy
npx -y vercel deploy athena-leads --yes --token "$VERCEL_TOKEN"

# production deploy
npx -y vercel deploy athena-leads --prod --yes --token "$VERCEL_TOKEN"
```

The site is `noindex`'d and intended for private sharing.
