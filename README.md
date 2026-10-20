# Hephaestus

A simple gym log for you and your friends, built around a 3-week, 3-day 5/3/1 programme. Pick a week and day to see what to lift; for each 5/3/1 lift, mark the first two sets as made or missed and record your reps on the + set. Every + set is archived with its estimated 1-rep max and a suggested training-max change for the next cycle. You can also log anything by hand, track your body weight, and chart your progress.

It's a Progressive Web App: open the link on your phone and choose **Add to Home Screen** to get an app icon. No app store needed.

## Stack

- **Frontend:** React 19 + TypeScript + Vite, made installable with `vite-plugin-pwa`; charts with [Recharts](https://recharts.org)
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
2. In the dashboard, open **SQL Editor** and run each file in [`supabase/migrations/`](supabase/migrations/) in order (`0001_entries.sql`, `0002_programme.sql`, `0003_bodyweights.sql`). They create the `entries`, `training_maxes` and `bodyweights` tables and the rules that keep each person's data private.
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
    ProgrammeView.tsx     week/day picker and that day's exercises
    LiftSession.tsx       5/3/1 lift: made/missed per set, reps on the + set
    AccessorySession.tsx  other programme exercises, pre-filled
    MaxesEditor.tsx       each person's 1-rep maxes
    LogView.tsx           the logging form and today's entries
    HistoryView.tsx       entries grouped by day
    BodyView.tsx          body weight log, change between weigh-ins, chart
    ProgressView.tsx      switches between the two progress views below
    MainLiftProgress.tsx  5/3/1 archive: every + set, est. 1RM, next-cycle suggestion
    ExerciseProgress.tsx  heaviest weight per session for any exercise
    TrendChart.tsx        shared Recharts line chart with tooltip
    EntryList.tsx         entry rows with tap-twice delete
    SignIn.tsx            email magic-link sign-in
  lib/
    programme.ts          the programme: weeks, days, percentages, weight rounding
    useTrainingMaxes.ts   loads/saves 1-rep maxes
    useBodyweights.ts     loads/saves weigh-ins
    useEntries.ts         loads/saves entries (Supabase, or localStorage when signed out)
    useAuth.ts            Supabase session
    lifting.ts            unit conversion, PRs, Brzycki 1RM estimate, date helpers
    supabase.ts           client (null when no keys are configured)
supabase/migrations/      database schema and access rules
public/                   app icons (regenerate with `npx pwa-assets-generator --preset minimal-2023 public/logo.svg`)
legacy/                   the original single-file version, still live as a Claude artifact
```

Entries logged in device-only mode are uploaded to the account automatically the first time that person signs in.

## Changing the programme

The programme lives in [`src/lib/programme.ts`](src/lib/programme.ts): `WEEK_SETS` holds the percentages and reps for each week, and `DAYS` lists each day's exercises. Weights for the 5/3/1 lifts come from each person's 1-rep max (training max = 90%, rounded to 2.5 kg); other exercises use the fixed weights listed there. Everyone using the app shares the same programme.

## Scripts

| Command           | What it does                         |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the dev server                 |
| `npm run build`   | Type-check and build to `dist/`      |
| `npm run preview` | Serve the production build locally   |
| `npm run lint`    | Run ESLint                           |
