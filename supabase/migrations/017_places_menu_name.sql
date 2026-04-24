alter table public.places
  add column if not exists menu_name text null;

-- Backfill from existing submissions JSON when a verified menu item already exists there.
update public.places
set menu_name = nullif(trim(submissions -> 0 -> 'items' -> 0 ->> 'name'), '')
where menu_name is null
  and jsonb_typeof(submissions) = 'array'
  and jsonb_array_length(submissions) > 0
  and jsonb_typeof(submissions -> 0 -> 'items') = 'array'
  and jsonb_array_length(submissions -> 0 -> 'items') > 0;
