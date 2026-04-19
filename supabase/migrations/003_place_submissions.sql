-- Pending user-submitted venues (moderation queue). Public insert only; no public read by default.

create table if not exists public.place_submissions (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  review_ends_at timestamptz not null,
  submitted_by uuid null,

  place_name text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  category text not null check (category in ('pub', 'restaurant', 'cafe')),
  menu_item_name text not null,
  price_gbp numeric not null check (price_gbp > 0),
  description text null,
  area text null
);

create index if not exists place_submissions_status_idx on public.place_submissions (status);
create index if not exists place_submissions_submitted_at_idx on public.place_submissions (submitted_at desc);

alter table public.place_submissions enable row level security;

-- Anonymous / logged-in users can queue a tip (pending only). No SELECT policy = public cannot read the queue.
create policy "place_submissions_insert_pending"
  on public.place_submissions
  for insert
  to anon, authenticated
  with check (status = 'pending');

comment on table public.place_submissions is 'User-submitted cheap eats awaiting moderation before promotion to public.places.';
