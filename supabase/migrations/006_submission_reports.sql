-- User reports on pending submissions (moderator follow-up via dashboard / service role).

create table if not exists public.submission_reports (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.place_submissions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists submission_reports_submission_id_idx on public.submission_reports (submission_id);

alter table public.submission_reports enable row level security;

create policy "submission_reports_insert_own"
  on public.submission_reports
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "submission_reports_select_own"
  on public.submission_reports
  for select
  to authenticated
  using (user_id = auth.uid());
