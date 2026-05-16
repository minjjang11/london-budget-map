-- General safety / policy reports (not tied to a pending submission).
-- Team reads rows in Supabase Table Editor or via service role; optional: add a Database Webhook to forward to email.

create table if not exists public.general_content_reports (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists general_content_reports_created_at_idx
  on public.general_content_reports (created_at desc);

alter table public.general_content_reports enable row level security;

-- Anonymous + signed-in users may file a report; body length limits reduce empty spam.
create policy "general_content_reports_insert"
  on public.general_content_reports
  for insert
  to anon, authenticated
  with check (
    char_length(trim(body)) >= 10
    and char_length(body) <= 8000
    and (user_id is null or user_id = (select auth.uid()))
  );

comment on table public.general_content_reports is
  'In-app content/safety reports; optional Database Webhook can email contact@maimomap.com.';
