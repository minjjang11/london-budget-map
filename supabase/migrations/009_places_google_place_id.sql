-- Optional link to Google Place for duplicate detection against submissions.
alter table public.places
  add column if not exists google_place_id text null;

create index if not exists places_google_place_id_idx on public.places (google_place_id)
  where google_place_id is not null;
