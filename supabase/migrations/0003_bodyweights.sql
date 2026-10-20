-- Body weight log: one row per weigh-in. Each user sees only their own.

create table public.bodyweights (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  weight      numeric(6, 2) not null check (weight > 0),
  unit        text not null default 'kg' check (unit in ('kg', 'lb')),
  measured_on date not null default current_date,
  created_at  timestamptz not null default now()
);

create index bodyweights_user_date_idx on public.bodyweights (user_id, measured_on desc, created_at desc);

alter table public.bodyweights enable row level security;

create policy "Users read their own body weights"
  on public.bodyweights for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users add their own body weights"
  on public.bodyweights for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users delete their own body weights"
  on public.bodyweights for delete to authenticated
  using ((select auth.uid()) = user_id);
