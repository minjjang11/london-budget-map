-- Optional short blurb for compact map preview (safe additive migration).
alter table public.places
  add column if not exists description text;

comment on column public.places.description is 'Short public text shown on marker tap preview.';
