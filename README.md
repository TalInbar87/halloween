# מפת הממתקים — Halloween neighbourhood map

Kids open the site, allow GPS, and see every house giving out candy as a pin, plus their own
progress. Neighbours add their house through a form; it appears on the map immediately.

**Stack:** Vite + React + TypeScript · Leaflet + OpenStreetMap · Supabase (Postgres) · Vercel. All free tiers.

## Privacy & security

- **Kids' location never leaves the phone.** GPS is read in the browser only; visited houses are stored in `localStorage`.
- No user accounts. The browser uses the Supabase *publishable* key; access is enforced in the DB:
  - `houses` is **not** readable through the API. The map loads only via `list_houses()`, which
    requires the shared **neighbourhood password** (or the adults password). The phone remembers
    it after the first correct entry and asks again if it stops working;
  - adding or removing a house requires the shared **adults password**, checked inside the
    `add_house()` / `remove_house()` SQL functions against a bcrypt hash in `app_secret`
    (not readable through the API). Wrong guesses: max 10/hour per IP, 50/hour overall;
  - `add_house` also validates input, rejects duplicates (address + apartment) and caps volume;
  - raw IPs are never stored — only SHA-256 hashes.
- Neither password is in this repo. Set or change them in the Supabase SQL editor:
  ```sql
  -- adults password (add/edit/remove houses)
  insert into public.app_secret (id, password_hash)
  values (1, extensions.crypt('<password>', extensions.gen_salt('bf', 10)))
  on conflict (id) do update set password_hash = excluded.password_hash;

  -- neighbourhood password (see the map)
  update public.app_secret
  set view_password_hash = extensions.crypt('<password>', extensions.gen_salt('bf', 10))
  where id = 1;
  ```
- Kids can switch the map tab between a map and a table (sorted by address; can sort by floor & apartment, or by distance when GPS is on). A building's pumpkin popup lists apartments by floor, then apartment.
- Security headers / CSP in `vercel.json`.

## Setup

```bash
npm install
cp .env.example .env.local   # fill VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY
supabase link --project-ref <ref>
supabase db push             # applies supabase/migrations
npm run dev
```

The map opens on Ever HaYarden, Kiryat Ono (override with `VITE_MAP_CENTER=lat,lng`) until houses exist, then fits to them.

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
