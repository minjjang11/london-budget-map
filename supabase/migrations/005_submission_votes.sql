-- One vote per user per submission (up / down). Tallies visible for pending-queue rows only.

create table if not exists public.submission_votes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.place_submissions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vote_type text not null check (vote_type in ('upvote', 'downvote')),
  created_at timestamptz not null default now(),
  unique (submission_id, user_id)
);

create index if not exists submission_votes_submission_id_idx on public.submission_votes (submission_id);

alter table public.submission_votes enable row level security;

create policy "submission_votes_select_pending_queue"
  on public.submission_votes
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.place_submissions ps
      where ps.id = submission_votes.submission_id and ps.status = 'pending'
    )
  );

create policy "submission_votes_insert_own"
  on public.submission_votes
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "submission_votes_update_own"
  on public.submission_votes
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "submission_votes_delete_own"
  on public.submission_votes
  for delete
  to authenticated
  using (user_id = auth.uid());
