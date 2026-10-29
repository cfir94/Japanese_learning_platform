-- ことば — learning record for the Japanese site.
-- Run once in the Supabase SQL editor of the shared project (dendxtbaxiszohjjsdtd).
--
-- Append-only: every answer, grade, checked task and conversation log is one row.
-- The browser derives all progress from these rows, so two devices never overwrite
-- each other and nothing is ever lost. Rows can only be read and added by their owner.

create table if not exists public.jp_events (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (char_length(kind) between 1 and 32),
  data jsonb not null default '{}'::jsonb,
  at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists jp_events_user_at on public.jp_events (user_id, at);

alter table public.jp_events enable row level security;

drop policy if exists jp_events_select_own on public.jp_events;
create policy jp_events_select_own on public.jp_events
  for select using (auth.uid() = user_id);

drop policy if exists jp_events_insert_own on public.jp_events;
create policy jp_events_insert_own on public.jp_events
  for insert with check (auth.uid() = user_id);

-- No update or delete policies: the record is append-only by design.
