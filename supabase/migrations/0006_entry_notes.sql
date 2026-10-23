-- Free-text notes on any logged exercise.

alter table public.entries
  add column notes text check (char_length(notes) <= 1000);
