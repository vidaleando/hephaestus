# Hephaestus

A simple gym log for you and your friends. Log exercise, weight, reps and sets; browse your history by day; track your heaviest lifts and estimated one-rep max over time.

It's a Progressive Web App: open the link on your phone and choose **Add to Home Screen** to get an app icon. No app store needed.

## Stack

- **Frontend:** React 19 + TypeScript + Vite, made installable with `vite-plugin-pwa`
- **Backend:** [Supabase](https://supabase.com) (Postgres, email sign-in, row-level security). There's no custom server.
- **Hosting:** any static host (Vercel, Netlify, Cloudflare Pages)

## Run it locally

```sh
npm install
npm run dev
```

Without Supabase keys, the app runs in **device-only mode**: entries are saved in the browser's localStorage. That's enough to work on the UI.

To test on your phone, run `npm run dev -- --host` and open the "Network" URL it prints while you're on the same Wi-Fi.

## Connect Supabase (one time)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the dashboard, open **SQL Editor**, paste the contents of [`supabase/migrations/0001_entries.sql`](supabase/migrations/0001_entries.sql), and run it. This creates the `entries` table and the rules that keep each person's log private.
3. Under **Authentication → URL Configuration**, set **Site URL** to where the app lives (e.g. `https://hephaestus.vercel.app`). Add `http://localhost:5173` to **Redirect URLs** for local testing.
4. Copy `.env.example` to `.env.local` and fill in your values from **Project Settings → API**: the project URL and the publishable (or anon) key. Both are safe to ship in the browser; the row-level security rules are what protect the data.
5. Restart `npm run dev`. You'll see a sign-in screen; sign-in works by an emailed link.

The built-in Supabase email sender is rate-limited (a few emails per hour). That's fine for a handful of friends; for more, set up custom SMTP under **Authentication → Emails**.

## Deploy (Vercel)

1. Push this repo to GitHub.
2. In Vercel, **Add New → Project**, import the repo. It detects Vite automatically.
3. Add the two environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. Deploy, then put the deployed URL in Supabase's **Site URL** (step 3 above).

Every push to `main` redeploys.

## Project layout

```
src/
  App.tsx                 header, tabs, sign-in gate
  components/
    LogView.tsx           the logging form and today's entries
    HistoryView.tsx       entries grouped by day
    ProgressView.tsx      stats and chart for one exercise
    ProgressChart.tsx     SVG line chart
    EntryList.tsx         entry rows with tap-twice delete
    SignIn.tsx            email magic-link sign-in
  lib/
    useEntries.ts         loads/saves entries (Supabase, or localStorage when signed out)
    useAuth.ts            Supabase session
    lifting.ts            unit conversion, PRs, 1RM estimate, date helpers
    supabase.ts           client (null when no keys are configured)
supabase/migrations/      database schema and access rules
public/                   app icons (regenerate with `npx pwa-assets-generator --preset minimal-2023 public/logo.svg`)
legacy/                   the original single-file version, still live as a Claude artifact
```

Entries logged in device-only mode are uploaded to the account automatically the first time that person signs in.

## Scripts

| Command           | What it does                         |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the dev server                 |
| `npm run build`   | Type-check and build to `dist/`      |
| `npm run preview` | Serve the production build locally   |
| `npm run lint`    | Run ESLint                           |
