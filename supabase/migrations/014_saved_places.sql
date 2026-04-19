-- Per-user bookmarks for approved map places (device-local saves stay in the app LS key).

create table if not exists public.saved_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, place_id)
);

create index if not exists saved_places_user_id_idx on public.saved_places (user_id);
create index if not exists saved_places_place_id_idx on public.saved_places (place_id);

alter table public.saved_places enable row level security;

create policy "saved_places_select_own"
  on public.saved_places
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "saved_places_insert_own_approved"
  on public.saved_places
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.places p
      where p.id = saved_places.place_id and p.status = 'approved'
    )
  );

create policy "saved_places_delete_own"
  on public.saved_places
  for delete
  to authenticated
  using (user_id = auth.uid());

comment on table public.saved_places is 'User bookmarks for approved places; one row per user per place.';
