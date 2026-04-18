-- London Budget Map — approved places on the public map.
-- Run in Supabase SQL Editor or via CLI migrate.

create extension if not exists "pgcrypto";

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  name text not null,
  category text not null check (category in ('pub', 'restaurant', 'cafe')),
  area text not null,
  address text,
  lat double precision not null,
  lng double precision not null,
  lowest_price_gbp numeric,
  submissions jsonb not null default '[]'::jsonb,
  registered_at timestamptz default now(),
  upvotes integer not null default 0,
  comments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists places_status_idx on public.places (status);

alter table public.places enable row level security;

-- Public read: only approved rows (for anonymous map browsing).
create policy "places_select_approved"
  on public.places
  for select
  to anon, authenticated
  using (status = 'approved');

-- Phase 2+: tighten writes to service role or authenticated policies as you add auth.
-- For seeding from the dashboard you can temporarily use the SQL editor as postgres role (bypasses RLS)
-- or add an insert policy for service_role only.

comment on table public.places is 'Approved cheap-eat venues shown on the map; pending/rejected hidden from public select.';
