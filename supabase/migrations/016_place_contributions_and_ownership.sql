-- Track ownership of approved places and allow user add-ons on existing places.

alter table public.places
  add column if not exists submitted_by uuid references auth.users(id) on delete set null;

create index if not exists places_submitted_by_idx on public.places (submitted_by);

create policy "places_delete_own"
  on public.places
  for delete
  to authenticated
  using (submitted_by = auth.uid());

create table if not exists public.place_contributions (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  menu_item_name text not null,
  price_gbp numeric not null check (price_gbp > 0),
  comment text null,
  photo text null,
  created_at timestamptz not null default now()
);

create index if not exists place_contributions_place_id_idx on public.place_contributions (place_id);
create index if not exists place_contributions_user_id_idx on public.place_contributions (user_id);
create index if not exists place_contributions_created_at_idx on public.place_contributions (created_at desc);

alter table public.place_contributions enable row level security;

create policy "place_contributions_select_approved"
  on public.place_contributions
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.places p
      where p.id = place_contributions.place_id
        and p.status = 'approved'
    )
  );

create policy "place_contributions_insert_own"
  on public.place_contributions
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.places p
      where p.id = place_contributions.place_id
        and p.status = 'approved'
    )
  );

create policy "place_contributions_delete_own"
  on public.place_contributions
  for delete
  to authenticated
  using (user_id = auth.uid());

create policy "place_submissions_select_own"
  on public.place_submissions
  for select
  to authenticated
  using (submitted_by = auth.uid());

create policy "place_submissions_delete_own"
  on public.place_submissions
  for delete
  to authenticated
  using (
    submitted_by = auth.uid()
    and status in ('pending', 'needs_review')
  );
