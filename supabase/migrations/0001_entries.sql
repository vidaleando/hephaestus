-- Hephaestus: one row per logged exercise. Each user can only see and change their own rows.

create table public.entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise     text not null check (char_length(exercise) between 1 and 80),
  weight       numeric(6, 2) not null default 0 check (weight >= 0),
  unit         text not null default 'kg' check (unit in ('kg', 'lb')),
  reps         integer not null check (reps between 1 and 1000),
  sets         integer not null check (sets between 1 and 100),
  performed_on date not null default current_date,
  created_at   timestamptz not null default now()
);

create index entries_user_date_idx on public.entries (user_id, performed_on desc, created_at desc);

alter table public.entries enable row level security;

create policy "Users read their own entries"
  on public.entries for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users add their own entries"
  on public.entries for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users edit their own entries"
  on public.entries for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete their own entries"
  on public.entries for delete to authenticated
  using ((select auth.uid()) = user_id);
