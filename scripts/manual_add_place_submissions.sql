-- Manual seed-style inserts into public.place_submissions
-- Notes:
-- 1) This table currently has no `source` column, so `source = manual_add` cannot be stored directly.
-- 2) Rows are inserted as pending with a 7-day review window.
-- 3) Dedupe check is case-insensitive against both place_submissions.place_name and places.name.

with seed_rows (
  place_name,
  address,
  lat,
  lng,
  category,
  menu_item_name,
  price_gbp,
  description,
  area,
  photo,
  google_place_id
) as (
  values
    ('Ngon Ngon', 'Soho, London', 51.5136, -0.1365, 'restaurant', 'Pho', 11.50, 'Vietnamese mains usually under twelve pounds.', 'Soho', null, null),
    ('Mr Wu', 'Soho, London', 51.5138, -0.1362, 'restaurant', 'Roast duck rice', 9.50, 'Quick Chinese rice plates at student-friendly prices.', 'Soho', null, null),
    ('3 Mien', 'Shoreditch, London', 51.5246, -0.0784, 'restaurant', 'Bun bo hue', 11.00, 'Casual noodle soups with straightforward portions.', 'Shoreditch', null, null),
    ('My Old Place', 'Shoreditch, London', 51.5239, -0.0778, 'restaurant', 'Hand-pulled noodles', 10.50, 'Simple Chinese comfort dishes and noodle bowls.', 'Shoreditch', null, null),
    ('Wok The Pho', 'Borough, London', 51.5012, -0.0933, 'restaurant', 'Beef pho', 11.50, 'Solid pho and wok dishes with low-key pricing.', 'Borough', null, null),
    ('Marie''s Cafe', 'Borough, London', 51.5015, -0.0929, 'restaurant', 'Full English', 9.50, 'Classic cafe plates with predictable value.', 'Borough', null, null),
    ('Bento Bab', 'Soho, London', 51.5142, -0.1359, 'restaurant', 'Bibimbap', 9.90, 'Korean rice bowls and bento style mains.', 'Soho', null, null),
    ('On The Bab', 'Shoreditch, London', 51.5242, -0.0791, 'restaurant', 'Chicken rice bowl', 11.90, 'Fast Korean bowls and fried options under budget.', 'Shoreditch', null, null),
    ('Dan Dan', 'Soho, London', 51.5133, -0.1356, 'restaurant', 'Dan dan noodles', 11.50, 'Noodle-focused menu with reliable mid-range portions.', 'Soho', null, null),
    ('KoKoDoo', 'Borough, London', 51.5009, -0.0938, 'restaurant', 'Korean chicken over rice', 10.90, 'Korean comfort meals that usually stay affordable.', 'Borough', null, null)
)
insert into public.place_submissions (
  status,
  submitted_at,
  review_ends_at,
  submitted_by,
  place_name,
  address,
  lat,
  lng,
  category,
  menu_item_name,
  price_gbp,
  description,
  area,
  photo,
  google_place_id
)
select
  'pending',
  now(),
  now() + interval '7 days',
  null,
  s.place_name,
  s.address,
  s.lat,
  s.lng,
  s.category,
  s.menu_item_name,
  s.price_gbp,
  s.description,
  s.area,
  s.photo,
  s.google_place_id
from seed_rows s
where not exists (
  select 1
  from public.place_submissions ps
  where lower(trim(ps.place_name)) = lower(trim(s.place_name))
)
and not exists (
  select 1
  from public.places p
  where lower(trim(p.name)) = lower(trim(s.place_name))
);
