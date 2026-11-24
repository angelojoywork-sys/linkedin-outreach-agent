-- Run this once in Supabase: SQL Editor > New query > paste > Run.
-- Visitors can only ADD rows. Nobody can read the table directly.
-- The results page reads totals through get_results(), which returns counts
-- and the latest comments, never session ids.

create table if not exists public.feedback_events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  session_id  text not null check (char_length(session_id) between 8 and 64),
  type        text not null check (type in ('visit', 'try', 'send', 'rating', 'comment')),
  action      text check (char_length(action) <= 40),
  helpful     boolean,
  comment     text check (char_length(comment) <= 500)
);

alter table public.feedback_events enable row level security;

drop policy if exists "anyone can add events" on public.feedback_events;
create policy "anyone can add events"
  on public.feedback_events for insert
  to anon
  with check (true);

revoke all on public.feedback_events from anon, authenticated;
grant insert on public.feedback_events to anon;

create or replace function public.get_results()
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'visitors', (select count(distinct session_id) from feedback_events where type = 'visit'),
    'tried',    (select count(distinct session_id) from feedback_events where type in ('try', 'send')),
    'sent',     (select count(distinct session_id) from feedback_events where type = 'send'),
    'rated',    (select count(distinct session_id) from feedback_events where type = 'rating'),
    'helpful',  (select count(distinct session_id) from feedback_events where type = 'rating' and helpful),
    'actions',  (select coalesce(json_object_agg(action, n), '{}'::json)
                 from (select action, count(distinct session_id) as n
                       from feedback_events
                       where type = 'try' and action is not null
                       group by action) a),
    'comments', (select coalesce(json_agg(c), '[]'::json)
                 from (select comment, created_at
                       from feedback_events
                       where type = 'comment' and comment is not null and btrim(comment) <> ''
                       order by created_at desc
                       limit 20) c)
  );
$$;

revoke all on function public.get_results() from public;
grant execute on function public.get_results() to anon;
