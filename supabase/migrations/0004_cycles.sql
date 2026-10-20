-- Cycle tracking: each user's current 5/3/1 cycle, and which cycle each programme entry belongs to.

alter table public.training_maxes
  add column cycle            integer not null default 1 check (cycle >= 1),
  add column cycle_started_on date;

alter table public.entries
  add column cycle integer check (cycle >= 1);

-- Programme entries logged before cycles existed belong to the first cycle
update public.entries set cycle = 1 where program_week is not null and cycle is null;
