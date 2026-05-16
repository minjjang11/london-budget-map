-- Harden place_submissions → places sync:
-- 1) Trigger also runs on INSERT when a row is created already approved (SQL editor / imports).
-- 2) Re-run orphan repair: approved submissions with no dedupe-matching approved places row.
--    (021's DO block only ran once at migrate time; this catches rows approved later or if 021
--    was never applied / failed before the DO block.)

create or replace function public.trg_place_submissions_approved_sync_places()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'approved' then
      perform public.ensure_place_from_submission_row(new);
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.status is not distinct from old.status then
      return new;
    end if;
    if new.status = 'approved' and old.status is distinct from 'approved' then
      perform public.ensure_place_from_submission_row(new);
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists place_submissions_approved_sync_places on public.place_submissions;

create trigger place_submissions_approved_sync_places
  after insert or update of status on public.place_submissions
  for each row
  execute function public.trg_place_submissions_approved_sync_places();

comment on function public.trg_place_submissions_approved_sync_places() is
  'After INSERT (approved) or UPDATE of status → approved, ensure public.places row via ensure_place_from_submission_row.';

-- Idempotent repair (same predicate as 021).
do $$
declare
  r public.place_submissions%rowtype;
begin
  for r in
    select s.*
    from public.place_submissions s
    where s.status = 'approved'
      and not exists (
        select 1
        from public.places p
        where p.status = 'approved'
          and (
            (
              trim(coalesce(s.google_place_id, '')) <> ''
              and trim(coalesce(p.google_place_id, '')) <> ''
              and trim(p.google_place_id) = trim(s.google_place_id)
            )
            or (
              abs(p.lat - s.lat) < 0.00002
              and abs(p.lng - s.lng) < 0.00002
              and lower(trim(p.name)) = lower(trim(s.place_name))
            )
            or (
              trim(coalesce(s.address, '')) <> ''
              and lower(trim(coalesce(p.address, ''))) = lower(trim(s.address))
              and lower(trim(p.name)) = lower(trim(s.place_name))
            )
          )
      )
  loop
    perform public.ensure_place_from_submission_row(r);
  end loop;
end $$;
