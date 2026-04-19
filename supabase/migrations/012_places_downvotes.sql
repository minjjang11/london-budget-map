-- Cumulative place-level downvotes for rankings / map social proof (defaults 0; no time-series yet).
alter table public.places
  add column if not exists downvotes integer not null default 0;

comment on column public.places.downvotes is 'Cumulative downvotes on the approved place; adjust via trusted writes / future vote APIs.';
