-- Deload week: runs as week 4 of a cycle, and each user's cycle records whether they're in it.

alter table public.entries
  drop constraint entries_program_week_check,
  add constraint entries_program_week_check check (program_week between 1 and 4);

alter table public.training_maxes
  add column deload boolean not null default false;
