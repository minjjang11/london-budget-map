-- One-time backfill: every submission still in the community queue becomes a registered (green) place.
-- Skips creating a duplicate `places` row when an approved place already matches google_place_id or lat/lng+name.
-- Safe to re-run: duplicate guard prevents double inserts; already-approved submissions are no-ops.

do $$
declare
  r record;
  v_submissions jsonb;
begin
  for r in
    select * from public.place_submissions
    where status in ('pending', 'needs_review')
    order by submitted_at asc
  loop
    if exists (
      select 1
      from public.places p
      where p.status = 'approved'
        and (
          (
            r.google_place_id is not null
            and trim(r.google_place_id) <> ''
            and p.google_place_id is not null
            and p.google_place_id = trim(r.google_place_id)
          )
          or (
            abs(p.lat - r.lat) < 0.00002
            and abs(p.lng - r.lng) < 0.00002
            and lower(trim(p.name)) = lower(trim(r.place_name))
          )
        )
    ) then
      update public.place_submissions
      set status = 'approved'
      where id = r.id
        and status in ('pending', 'needs_review');
      continue;
    end if;

    v_submissions := jsonb_build_array(
      jsonb_strip_nulls(
        jsonb_build_object(
          'id', 'psub_' || replace(r.id::text, '-', ''),
          'items',
          jsonb_build_array(
            jsonb_build_object(
              'name', trim(r.menu_item_name),
              'price', r.price_gbp
            )
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
      trim(r.menu_item_name),
      r.lat,
      r.lng,
      r.price_gbp,
      nullif(trim(coalesce(r.description, '')), ''),
      nullif(trim(coalesce(r.google_place_id, '')), ''),
      v_submissions,
      r.submitted_at,
      0,
      0,
      '[]'::jsonb
    );

    update public.place_submissions
    set status = 'approved'
    where id = r.id
      and status in ('pending', 'needs_review');
  end loop;
end $$;
