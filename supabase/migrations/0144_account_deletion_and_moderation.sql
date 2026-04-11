-- ============================================================================
-- Migration 0144: Account deletion + UGC moderation (App Store compliance)
--
-- Apple Guideline 5.1.1(v) — apps with account creation must provide an
-- in-app account deletion path.
--
-- Apple Guideline 1.2 — apps that host user-generated content must provide
-- (a) a way to report objectionable content and (b) a way to block abusive
-- users. The existing `comments.status = 'pending'` moderation queue covers
-- pre-publication filtering; this migration adds the reactive reporting and
-- blocking pieces.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. comment_reports — users flag a comment as abusive
-- ---------------------------------------------------------------------------
create table if not exists public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('spam', 'harassment', 'inappropriate', 'other')),
  details text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (comment_id, reporter_id)
);

create index if not exists idx_comment_reports_status on public.comment_reports(status) where status = 'pending';
create index if not exists idx_comment_reports_comment on public.comment_reports(comment_id);

alter table public.comment_reports enable row level security;

-- Authenticated users can report any comment (but only once per comment)
drop policy if exists "authenticated_can_report" on public.comment_reports;
create policy "authenticated_can_report"
  on public.comment_reports
  for insert
  to authenticated
  with check (reporter_id = auth.uid());

-- Users can see their own reports
drop policy if exists "own_reports_readable" on public.comment_reports;
create policy "own_reports_readable"
  on public.comment_reports
  for select
  to authenticated
  using (reporter_id = auth.uid());


-- ---------------------------------------------------------------------------
-- 2. user_blocks — reader blocks another user; blocked users' comments are
--    hidden client-side and server-side via the view below.
-- ---------------------------------------------------------------------------
create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists idx_user_blocks_blocker on public.user_blocks(blocker_id);

alter table public.user_blocks enable row level security;

drop policy if exists "blocks_own_rw" on public.user_blocks;
create policy "blocks_own_rw"
  on public.user_blocks
  for all
  to authenticated
  using (blocker_id = auth.uid())
  with check (blocker_id = auth.uid());


-- ---------------------------------------------------------------------------
-- 3. delete_my_account() — SECURITY DEFINER RPC that lets an authenticated
--    user remove their own account and all associated data. Called directly
--    from the mobile app via supabase.rpc('delete_my_account').
-- ---------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  -- Wipe user-owned rows. Wrapped in a single transaction implicitly by the
  -- function body; if any delete fails the whole thing rolls back.
  delete from public.comment_reports where reporter_id = v_user_id;
  delete from public.user_blocks where blocker_id = v_user_id or blocked_id = v_user_id;
  delete from public.comments where user_id = v_user_id;
  delete from public.ratings where user_id = v_user_id;
  delete from public.bookmarks where user_id = v_user_id;
  delete from public.reading_progress where user_id = v_user_id;
  delete from public.reading_sessions where user_id = v_user_id;
  delete from public.chapter_reads where user_id = v_user_id;
  delete from public.user_notifications where user_id = v_user_id;
  delete from public.tts_usage where user_id = v_user_id;
  delete from public.download_usage where user_id = v_user_id;
  delete from public.credit_transactions where user_id = v_user_id;
  delete from public.user_subscriptions where user_id = v_user_id;
  delete from public.vip_orders where user_id = v_user_id;
  delete from public.profiles where id = v_user_id;

  -- Finally remove the auth record itself. auth.users is owned by the
  -- supabase_auth_admin role, but SECURITY DEFINER runs as the function
  -- owner (postgres) which has the grants to touch it.
  delete from auth.users where id = v_user_id;
end;
$$;

grant execute on function public.delete_my_account() to authenticated;


-- ---------------------------------------------------------------------------
-- 4. report_comment() — helper RPC so the mobile app doesn't need to know
--    the table name and RLS specifics. Also dedups against existing reports.
-- ---------------------------------------------------------------------------
create or replace function public.report_comment(
  p_comment_id uuid,
  p_reason text,
  p_details text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_report_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if p_reason not in ('spam', 'harassment', 'inappropriate', 'other') then
    raise exception 'invalid reason';
  end if;

  insert into public.comment_reports (comment_id, reporter_id, reason, details)
  values (p_comment_id, v_user_id, p_reason, p_details)
  on conflict (comment_id, reporter_id)
    do update set reason = excluded.reason, details = excluded.details
  returning id into v_report_id;

  return v_report_id;
end;
$$;

grant execute on function public.report_comment(uuid, text, text) to authenticated;


-- ---------------------------------------------------------------------------
-- 5. block_user() / unblock_user() — self-service user blocking
-- ---------------------------------------------------------------------------
create or replace function public.block_user(p_blocked_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if v_user_id = p_blocked_id then
    raise exception 'cannot block yourself';
  end if;

  insert into public.user_blocks (blocker_id, blocked_id)
  values (v_user_id, p_blocked_id)
  on conflict do nothing;
end;
$$;

grant execute on function public.block_user(uuid) to authenticated;
