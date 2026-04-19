-- Require signed-in users to queue new tips; bind row to auth.uid().

drop policy if exists "place_submissions_insert_pending" on public.place_submissions;

create policy "place_submissions_insert_authenticated"
  on public.place_submissions
  for insert
  to authenticated
  with check (
    status = 'pending'
    and submitted_by = auth.uid()
  );
