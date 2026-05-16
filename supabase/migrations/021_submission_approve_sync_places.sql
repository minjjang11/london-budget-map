-- When a place_submissions row becomes approved, ensure a matching public.places row exists.
-- Fixes manual SQL / dashboard updates that set status = 'approved' without inserting into places.
-- Dedupe (skip insert) when an approved place already matches:
--   1) google_place_id (trimmed, both non-empty)
--   2) same name (case-insensitive) + ~same lat/lng as 019 backfill
--   3) same name + same address (case-insensitive, non-empty address)

create or replace function public.ensure_place_from_submission_row(r public.place_submissions)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing uuid;
  v_json jsonb;
  v_menu text;
  v_sid text;
begin
  if r.status <> 'approved' then
    return null;
  end if;

  select p.id
    into v_existing
  from public.places p
  where p.status = 'approved'
    and (
      (
        trim(coalesce(r.google_place_id, '')) <> ''
        and trim(coalesce(p.google_place_id, '')) <> ''
        and trim(p.google_place_id) = trim(r.google_place_id)
      )
      or (
        abs(p.lat - r.lat) < 0.00002
        and abs(p.lng - r.lng) < 0.00002
        and lower(trim(p.name)) = lower(trim(r.place_name))
      )
      or (
        trim(coalesce(r.address, '')) <> ''
        and lower(trim(coalesce(p.address, ''))) = lower(trim(r.address))
        and lower(trim(p.name)) = lower(trim(r.place_name))
      )
    )
  order by p.created_at asc
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  v_menu := trim(r.menu_item_name);
  v_sid := substring(replace(r.id::text, '-', '') from 1 for 12);

  v_json := jsonb_build_array(
    jsonb_strip_nulls(
      jsonb_build_object(
        'id', 'psub_' || v_sid,
        'items',
        jsonb_build_array(
          jsonb_build_object('name', v_menu, 'price', r.price_gbp)
        ),
        'date', to_char((r.submitted_at at time zone 'utc'), 'YYYY-MM-DD'),
        'review', nullif(trim(coalesce(r.description, '')), ''),
        'photo', nullif(trim(coalesce(r.photo, '')), '')
      )
    )
  );

  insert into public.places (
    status,
    submitted_by,
    name,
    category,
    area,
    address,
    menu_name,
    lat,
    lng,
    lowest_price_gbp,
    description,
    google_place_id,
    submissions,
    registered_at,
    upvotes,
    downvotes,
    comments
  )
  values (
    'approved',
    r.submitted_by,
    trim(r.place_name),
    r.category,
    coalesce(nullif(trim(coalesce(r.area, '')), ''), 'London'),
    nullif(trim(coalesce(r.address, '')), ''),
    v_menu,
    r.lat,
    r.lng,
    r.price_gbp,
    nullif(trim(coalesce(r.description, '')), ''),
    nullif(trim(coalesce(r.google_place_id, '')), ''),
    v_json,
    r.submitted_at,
    0,
    0,
    '[]'::jsonb
  )
  returning id into v_existing;

  return v_existing;
end;
$$;

comment on function public.ensure_place_from_submission_row(public.place_submissions) is
  'Idempotent: inserts an approved places row from a submission row when no dedupe match exists; returns place id.';

create or replace function public.trg_place_submissions_approved_sync_places()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  if new.status is not distinct from old.status then
    return new;
  end if;
  if new.status <> 'approved' or old.status = 'approved' then
    return new;
  end if;

  perform public.ensure_place_from_submission_row(new);
  return new;
end;
$$;

drop trigger if exists place_submissions_approved_sync_places on public.place_submissions;

create trigger place_submissions_approved_sync_places
  after update of status on public.place_submissions
  for each row
  when (new.status = 'approved' and old.status is distinct from 'approved')
  execute procedure public.trg_place_submissions_approved_sync_places();

-- Optional idempotent repair (service role / jobs); not exposed to anon.
create or replace function public.sync_place_for_approved_submission(p_submission_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.place_submissions%rowtype;
begin
  select * into r from public.place_submissions where id = p_submission_id;
  if not found then
    return null;
  end if;
  if r.status <> 'approved' then
    return null;
  end if;
  return public.ensure_place_from_submission_row(r);
end;
$$;

revoke all on function public.ensure_place_from_submission_row(public.place_submissions) from public;
revoke all on function public.trg_place_submissions_approved_sync_places() from public;
revoke all on function public.sync_place_for_approved_submission(uuid) from public;
grant execute on function public.sync_place_for_approved_submission(uuid) to service_role;

-- One-time repair: approved submissions with no dedupe-matching approved place row.
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
