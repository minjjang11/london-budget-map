-- Outcome bucket: needs_review (human moderation). Auto-eval moves expired pending rows here or to approved.
-- Extend status enum; keep queue visible for pending + needs_review.

alter table public.place_submissions
  drop constraint if exists place_submissions_status_check;

alter table public.place_submissions
  add constraint place_submissions_status_check
  check (status in ('pending', 'needs_review', 'approved', 'rejected'));

drop policy if exists "place_submissions_select_pending" on public.place_submissions;

create policy "place_submissions_select_review_queue"
  on public.place_submissions
  for select
  to anon, authenticated
  using (status in ('pending', 'needs_review'));

-- Votes were only visible when submission was pending; allow needs_review too so engagement continues.
drop policy if exists "submission_votes_select_pending_queue" on public.submission_votes;

create policy "submission_votes_select_review_queue"
  on public.submission_votes
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.place_submissions ps
      where ps.id = submission_votes.submission_id
        and ps.status in ('pending', 'needs_review')
    )
  );
