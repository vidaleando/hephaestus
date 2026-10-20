-- Programme support: link log entries to a programme week/day, record 5/3/1 set results,
-- and keep each user's 1-rep maxes.

alter table public.entries
  add column program_week smallint check (program_week between 1 and 3),
  add column program_day  smallint check (program_day between 1 and 3),
  -- One boolean per main set for a 5/3/1 lift, e.g. [true, true, false]
  add column set_results  jsonb check (set_results is null or jsonb_typeof(set_results) = 'array'),
  -- Reps achieved on the last (+) set
  add column amrap_reps   smallint check (amrap_reps between 0 and 100);

create table public.training_maxes (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  squat      numeric(6, 2) check (squat > 0),
  bench      numeric(6, 2) check (bench > 0),
  deadlift   numeric(6, 2) check (deadlift > 0),
  ohp        numeric(6, 2) check (ohp > 0),
  updated_at timestamptz not null default now()
);

alter table public.training_maxes enable row level security;

create policy "Users read their own maxes"
  on public.training_maxes for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users add their own maxes"
  on public.training_maxes for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users edit their own maxes"
  on public.training_maxes for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
