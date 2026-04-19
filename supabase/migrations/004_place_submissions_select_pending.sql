-- Allow public read of the moderation queue (pending only) for the Review tab.
-- Rejected / non-pending rows stay hidden from this policy.

create policy "place_submissions_select_pending"
  on public.place_submissions
  for select
  to anon, authenticated
  using (status = 'pending');
