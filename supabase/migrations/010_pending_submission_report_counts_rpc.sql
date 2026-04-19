-- Aggregate report counts for pending submissions without exposing individual report rows.
-- RLS on submission_reports only allows users to see their own rows; this RPC is safe to expose publicly.

create or replace function public.pending_submission_report_counts(p_ids uuid[])
returns table (submission_id uuid, report_count integer)
language sql
stable
security definer
set search_path = public
as $$
  select r.submission_id, (count(*)::integer) as report_count
  from public.submission_reports r
  inner join public.place_submissions ps on ps.id = r.submission_id
  where ps.status = 'pending'
    and r.submission_id = any(p_ids)
  group by r.submission_id;
$$;

revoke all on function public.pending_submission_report_counts(uuid[]) from public;
grant execute on function public.pending_submission_report_counts(uuid[]) to anon, authenticated;
