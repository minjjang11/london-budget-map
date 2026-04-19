-- Optional Google Place ID for future duplicate detection / linking.
alter table public.place_submissions
  add column if not exists google_place_id text null;
