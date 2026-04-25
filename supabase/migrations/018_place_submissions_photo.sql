alter table public.place_submissions
  add column if not exists photo text null;
