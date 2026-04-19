-- Structured review tags for approved places (fixed vocabulary via CHECK; list mirrors app constant).

create table if not exists public.place_review_tags (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  tag_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, place_id, tag_key),
  constraint place_review_tags_tag_key_allowed check (
    tag_key in (
      'cheap', 'fair', 'pricey', 'worth_it', 'bargain', 'filling', 'light', 'huge', 'small',
      'tasty', 'bland', 'salty', 'sweet', 'spicy', 'greasy', 'hot', 'cold', 'fresh', 'soggy',
      'fizzy', 'flat', 'friendly', 'rude', 'quick', 'slow', 'clean', 'dirty', 'cozy', 'loud',
      'crowded', 'quiet', 'takeaway', 'dine_in', 'student_friendly', 'late_night', 'good',
      'very_good', 'bad', 'very_bad', 'overrated', 'underrated', 'hits', 'slaps', 'missed',
      'waited', 'packed', 'sold_out', 'gone'
    )
  )
);

create index if not exists place_review_tags_place_id_idx on public.place_review_tags (place_id);
create index if not exists place_review_tags_place_tag_idx on public.place_review_tags (place_id, tag_key);

create or replace function public.place_review_tags_enforce_max_three()
returns trigger
language plpgsql
as $$
declare
  n integer;
begin
  select count(*)::integer into n
  from public.place_review_tags
  where user_id = new.user_id and place_id = new.place_id;
  if n >= 3 then
    raise exception 'At most 3 review tags per user per place' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists place_review_tags_max_three on public.place_review_tags;
create trigger place_review_tags_max_three
  before insert on public.place_review_tags
  for each row
  execute function public.place_review_tags_enforce_max_three ();

alter table public.place_review_tags enable row level security;

create policy "place_review_tags_select_approved"
  on public.place_review_tags
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.places p
      where p.id = place_review_tags.place_id and p.status = 'approved'
    )
  );

create policy "place_review_tags_insert_own"
  on public.place_review_tags
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.places p
      where p.id = place_review_tags.place_id and p.status = 'approved'
    )
  );

create policy "place_review_tags_delete_own"
  on public.place_review_tags
  for delete
  to authenticated
  using (user_id = auth.uid());

comment on table public.place_review_tags is 'Up to 3 fixed-label tags per user per approved place; vocabulary enforced by CHECK + app.';
