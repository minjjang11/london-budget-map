-- Votes on approved map places (separate from submission_votes on the review queue).
-- created_at / updated_at support future weekly ranking from vote activity.

create table if not exists public.place_votes (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vote_type text not null check (vote_type in ('upvote', 'downvote')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (place_id, user_id)
);

create index if not exists place_votes_place_id_idx on public.place_votes (place_id);
create index if not exists place_votes_place_created_idx on public.place_votes (place_id, created_at desc);

create or replace function public.set_place_votes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists place_votes_set_updated_at on public.place_votes;
create trigger place_votes_set_updated_at
  before update on public.place_votes
  for each row
  execute function public.set_place_votes_updated_at ();

alter table public.place_votes enable row level security;

create policy "place_votes_select_approved_places"
  on public.place_votes
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.places p
      where p.id = place_votes.place_id and p.status = 'approved'
    )
  );

create policy "place_votes_insert_own"
  on public.place_votes
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "place_votes_update_own"
  on public.place_votes
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "place_votes_delete_own"
  on public.place_votes
  for delete
  to authenticated
  using (user_id = auth.uid());

comment on table public.place_votes is 'One vote per user per approved place; use created_at/updated_at for future time-windowed rankings.';
