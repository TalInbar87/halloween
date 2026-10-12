# מפת הממתקים — Halloween neighbourhood map

Kids open the site, allow GPS, and see every house giving out candy as a pin, plus their own
progress. Neighbours add their house through a form; it appears on the map immediately.

**Stack:** Vite + React + TypeScript · Leaflet + OpenStreetMap · Supabase (Postgres) · Vercel. All free tiers.

## Privacy & security

- **Kids' location never leaves the phone.** GPS is read in the browser only; visited houses are stored in `localStorage`.
- No user accounts. The browser uses the Supabase *publishable* key; access is enforced in the DB:
  - anyone can read `houses` (public columns only);
  - nobody can write the table directly — only via `add_house()` / `remove_house()` SQL functions;
  - `add_house` validates input, rejects duplicates, and rate-limits (5/hour per IP, 20/min overall, 500 max);
  - raw IPs and removal tokens are never stored — only SHA-256 hashes.
- Whoever adds a house gets a removal token saved on their device ("הבתים שלי" tab).
- Admin cleanup: delete rows in the Supabase dashboard → Table Editor → `houses`.
- Security headers / CSP in `vercel.json`.

## Setup

```bash
npm install
cp .env.example .env.local   # fill VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY
supabase link --project-ref <ref>
supabase db push             # applies supabase/migrations
npm run dev
```

Optional: `VITE_MAP_CENTER=lat,lng` sets where the map opens before any houses exist.

## Scripts

| Command | |
|---|---|
| `npm run dev` | dev server |
| `npm test` / `npm run test:coverage` | Vitest (80% threshold) |
| `npm run build` | type-check + production build |

## Deploy (Vercel)

Import the GitHub repo in Vercel (framework: Vite), add the two `VITE_SUPABASE_*` env vars, deploy.
GPS requires HTTPS — the `*.vercel.app` URL has it.

## Free-tier gotcha

Supabase pauses free projects after 7 days without traffic. Open the site at least once a week until Halloween.
