-- Publication is deliberately separate from generation.  A reader can only see a
-- complete, reviewed window; the factory can still advance its private state while
-- producing the next draft in that window.
SET lock_timeout = '5s';

ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS publication_state text NOT NULL DEFAULT 'published'
  CHECK (publication_state IN ('draft', 'published')),
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

UPDATE public.chapters
SET published_at = COALESCE(published_at, created_at, now())
WHERE publication_state = 'published' AND published_at IS NULL;

CREATE TABLE IF NOT EXISTS public.story_factory_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.story_factory_jobs(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.ai_story_projects(id) ON DELETE CASCADE,
  novel_id uuid NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  start_chapter integer NOT NULL CHECK (start_chapter > 0),
  end_chapter integer NOT NULL CHECK (end_chapter >= start_chapter),
  status text NOT NULL CHECK (status IN ('generating', 'reviewing', 'published', 'blocked')),
  checkpoint_state jsonb NOT NULL,
  final_state jsonb,
  rolling_plan jsonb,
  review jsonb,
  review_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  review_digest text,
  repair_attempts integer NOT NULL DEFAULT 0 CHECK (repair_attempts BETWEEN 0 AND 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  published_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id, start_chapter)
);
CREATE INDEX IF NOT EXISTS idx_story_factory_windows_job_open
  ON public.story_factory_windows(job_id, status, start_chapter DESC);
ALTER TABLE public.story_factory_windows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.story_factory_windows FROM anon, authenticated;
GRANT ALL ON public.story_factory_windows TO service_role;
DROP POLICY IF EXISTS story_factory_windows_service_only ON public.story_factory_windows;
CREATE POLICY story_factory_windows_service_only ON public.story_factory_windows
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Reader access is public only for released content.  The service role continues
-- to bypass RLS for the factory and admin API.
DROP POLICY IF EXISTS allow_public_read_novels ON public.novels;
CREATE POLICY allow_public_read_novels ON public.novels
  FOR SELECT TO anon, authenticated
  USING (hidden = false);
DROP POLICY IF EXISTS allow_public_read_chapters ON public.chapters;
CREATE POLICY allow_public_read_chapters ON public.chapters
  FOR SELECT TO anon, authenticated
  USING (
    publication_state = 'published'
    AND EXISTS (SELECT 1 FROM public.novels n WHERE n.id = chapters.novel_id AND n.hidden = false)
  );

-- A previous install can carry policy names from an older migration.  SELECT
-- policies compose with OR, so remove every reader-facing legacy policy before
-- relying on the restricted rules above.
DO $$
DECLARE v_policy record;
BEGIN
  FOR v_policy IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('novels', 'chapters')
      AND policyname NOT IN ('allow_public_read_novels', 'allow_public_read_chapters')
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_policy.policyname, v_policy.tablename);
  END LOOP;
END $$;

-- A client may change its profile but may never set or promote its own role.
CREATE OR REPLACE FUNCTION public.guard_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' AND COALESCE(NEW.role, 'user') <> 'user' THEN
    RAISE EXCEPTION 'PROFILE_ROLE_SERVER_ONLY';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'PROFILE_ROLE_SERVER_ONLY';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_profile_role ON public.profiles;
CREATE TRIGGER trg_guard_profile_role
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_role();
REVOKE ALL ON FUNCTION public.guard_profile_role() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_profile_role() TO service_role;

-- Preserve mobile RPC signatures but bind their target user to the JWT caller.
CREATE OR REPLACE FUNCTION public.assert_reader_rpc_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'READER_RPC_USER_MISMATCH';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.assert_reader_rpc_user(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assert_reader_rpc_user(uuid) TO service_role;

-- These functions keep their existing body and public signature.  The small JWT
-- guard is intentionally first so a caller cannot consume another reader's quota.
CREATE OR REPLACE FUNCTION public.get_reader_status(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reader_tier reader_tier; v_expires_at timestamptz; v_limits record;
  v_tts_used integer; v_dl_used integer; v_boost_cards integer; v_active_boosts jsonb;
BEGIN
  PERFORM public.assert_reader_rpc_user(p_user_id);
  SELECT us.reader_tier, us.reader_tier_expires_at, us.boost_cards_remaining INTO v_reader_tier, v_expires_at, v_boost_cards FROM public.user_subscriptions us WHERE us.user_id = p_user_id;
  IF v_reader_tier IS NULL THEN v_reader_tier := 'free'; v_boost_cards := 0; END IF;
  IF v_reader_tier IN ('vip', 'super_vip') AND v_expires_at IS NOT NULL AND v_expires_at < now() THEN
    UPDATE public.user_subscriptions SET reader_tier = 'free', reader_tier_auto_renew = false, reader_tier_expires_at = NULL WHERE user_id = p_user_id;
    v_reader_tier := 'free';
  END IF;
  SELECT * INTO v_limits FROM public.reader_tier_limits WHERE tier = v_reader_tier;
  SELECT COALESCE(seconds_used, 0) INTO v_tts_used FROM public.tts_usage WHERE user_id = p_user_id AND usage_date = current_date;
  SELECT COALESCE(chapters_downloaded, 0) INTO v_dl_used FROM public.download_usage WHERE user_id = p_user_id AND usage_date = current_date;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('novel_id', nb.novel_id, 'novel_title', n.title, 'expires_at', nb.expires_at, 'multiplier', nb.multiplier)), '[]'::jsonb)
    INTO v_active_boosts FROM public.novel_boosts nb JOIN public.novels n ON n.id = nb.novel_id
    WHERE nb.user_id = p_user_id AND nb.status = 'active' AND nb.expires_at > now();
  RETURN jsonb_build_object(
    'reader_tier', v_reader_tier, 'expires_at', v_expires_at,
    'show_ads', COALESCE(v_limits.show_ads, true),
    'daily_download_limit', COALESCE(v_limits.daily_download_limit, 0),
    'daily_tts_limit_seconds', COALESCE(v_limits.daily_tts_limit_seconds, 3600),
    'downloads_used_today', COALESCE(v_dl_used, 0),
    'tts_seconds_used_today', COALESCE(v_tts_used, 0),
    'has_exclusive_themes', COALESCE(v_limits.has_exclusive_themes, false),
    'has_early_access', COALESCE(v_limits.has_early_access, false),
    'has_badge', COALESCE(v_limits.has_badge, false),
    'can_download', COALESCE(v_limits.daily_download_limit, 0) = -1 OR COALESCE(v_dl_used, 0) < COALESCE(v_limits.daily_download_limit, 0),
    'can_use_tts', COALESCE(v_limits.daily_tts_limit_seconds, 3600) = -1 OR COALESCE(v_tts_used, 0) < COALESCE(v_limits.daily_tts_limit_seconds, 3600),
    'boost_cards_remaining', COALESCE(v_boost_cards, 0), 'active_boosts', v_active_boosts
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_tts_usage(p_user_id uuid, p_seconds integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tier reader_tier; v_expires timestamptz; v_limit integer; v_used integer;
BEGIN
  PERFORM public.assert_reader_rpc_user(p_user_id); p_seconds := GREATEST(COALESCE(p_seconds, 0), 0);
  SELECT reader_tier, reader_tier_expires_at INTO v_tier, v_expires FROM public.user_subscriptions WHERE user_id = p_user_id;
  IF v_tier IS NULL OR (v_tier IN ('vip','super_vip') AND v_expires < now()) THEN v_tier := 'free'; END IF;
  SELECT daily_tts_limit_seconds INTO v_limit FROM public.reader_tier_limits WHERE tier = v_tier;
  INSERT INTO public.tts_usage(user_id, usage_date, seconds_used, updated_at) VALUES (p_user_id, current_date, p_seconds, now())
  ON CONFLICT (user_id, usage_date) DO UPDATE SET seconds_used = public.tts_usage.seconds_used + EXCLUDED.seconds_used, updated_at = now()
  RETURNING seconds_used INTO v_used;
  RETURN jsonb_build_object('seconds_used_today', v_used, 'daily_limit', COALESCE(v_limit, 3600), 'can_continue', COALESCE(v_limit, 3600) = -1 OR v_used < COALESCE(v_limit, 3600));
END;
$$;

CREATE OR REPLACE FUNCTION public.record_download_usage(p_user_id uuid, p_chapters integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tier reader_tier; v_expires timestamptz; v_limit integer; v_used integer;
BEGIN
  PERFORM public.assert_reader_rpc_user(p_user_id); p_chapters := GREATEST(COALESCE(p_chapters, 0), 0);
  SELECT reader_tier, reader_tier_expires_at INTO v_tier, v_expires FROM public.user_subscriptions WHERE user_id = p_user_id;
  IF v_tier IS NULL OR (v_tier IN ('vip','super_vip') AND v_expires < now()) THEN v_tier := 'free'; END IF;
  SELECT daily_download_limit INTO v_limit FROM public.reader_tier_limits WHERE tier = v_tier;
  INSERT INTO public.download_usage(user_id, usage_date, chapters_downloaded, updated_at) VALUES (p_user_id, current_date, p_chapters, now())
  ON CONFLICT (user_id, usage_date) DO UPDATE SET chapters_downloaded = public.download_usage.chapters_downloaded + EXCLUDED.chapters_downloaded, updated_at = now()
  RETURNING chapters_downloaded INTO v_used;
  RETURN jsonb_build_object('chapters_downloaded_today', v_used, 'daily_limit', COALESCE(v_limit, 0), 'can_download_more', COALESCE(v_limit, 0) = -1 OR v_used < COALESCE(v_limit, 0));
END;
$$;

CREATE OR REPLACE FUNCTION public.use_boost_card(p_user_id uuid, p_novel_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tier reader_tier; v_cards integer; v_boost_id uuid; v_expires timestamptz;
BEGIN
  PERFORM public.assert_reader_rpc_user(p_user_id);
  SELECT reader_tier, boost_cards_remaining INTO v_tier, v_cards FROM public.user_subscriptions WHERE user_id = p_user_id FOR UPDATE;
  IF v_tier IS DISTINCT FROM 'super_vip' THEN RETURN jsonb_build_object('error','Chỉ Super VIP mới sử dụng được thẻ thúc chương'); END IF;
  IF COALESCE(v_cards, 0) <= 0 THEN RETURN jsonb_build_object('error','Bạn đã hết thẻ thúc chương tháng này'); END IF;
  IF EXISTS (SELECT 1 FROM public.novel_boosts WHERE user_id=p_user_id AND novel_id=p_novel_id AND status='active' AND expires_at>now()) THEN RETURN jsonb_build_object('error','Truyện này đang được thúc chương rồi'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.novels WHERE id=p_novel_id AND hidden=false) THEN RETURN jsonb_build_object('error','Truyện không tồn tại'); END IF;
  UPDATE public.user_subscriptions SET boost_cards_remaining = boost_cards_remaining - 1 WHERE user_id=p_user_id;
  v_expires := now() + interval '7 days';
  INSERT INTO public.novel_boosts(user_id, novel_id, expires_at, multiplier) VALUES(p_user_id,p_novel_id,v_expires,2) RETURNING id INTO v_boost_id;
  RETURN jsonb_build_object('success',true,'boost_id',v_boost_id,'expires_at',v_expires,'cards_remaining',v_cards-1);
END;
$$;

-- Replace per-chapter public publishing with an idempotent draft append.  The
-- factory state advances, but reader-facing rows and counts do not.
CREATE OR REPLACE FUNCTION public.commit_story_factory_draft_chapter(
  p_job_id uuid, p_lease_token uuid, p_run_id uuid, p_expected_chapter integer,
  p_title text, p_content text, p_state_after jsonb, p_remaining_plan jsonb,
  p_events jsonb, p_assessment jsonb, p_context_manifest jsonb, p_usage jsonb,
  p_cost_usd numeric, p_word_count integer, p_revision_count integer,
  p_attempt_telemetry jsonb, p_engine_release text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_job public.story_factory_jobs; v_project public.ai_story_projects; v_event jsonb;
  v_window public.story_factory_windows; v_drafts integer; v_local_date date := timezone('Asia/Ho_Chi_Minh', now())::date;
  v_today integer; v_next_stage text;
BEGIN
  SELECT * INTO v_job FROM public.story_factory_jobs WHERE id=p_job_id FOR UPDATE;
  IF NOT FOUND OR v_job.lease_token IS DISTINCT FROM p_lease_token OR v_job.lease_until < now() THEN RAISE EXCEPTION 'FACTORY_LEASE_INVALID'; END IF;
  SELECT * INTO v_project FROM public.ai_story_projects WHERE id=v_job.project_id FOR UPDATE;
  IF v_project.engine_release IS DISTINCT FROM p_engine_release THEN RAISE EXCEPTION 'FACTORY_RELEASE_MISMATCH'; END IF;
  IF v_job.current_chapter + 1 <> p_expected_chapter OR v_project.current_chapter + 1 <> p_expected_chapter THEN RAISE EXCEPTION 'FACTORY_CHAPTER_SEQUENCE_MISMATCH'; END IF;
  IF EXISTS (SELECT 1 FROM public.chapters WHERE novel_id=v_job.novel_id AND chapter_number=p_expected_chapter) THEN RAISE EXCEPTION 'FACTORY_CHAPTER_ALREADY_EXISTS'; END IF;
  SELECT * INTO v_window FROM public.story_factory_windows WHERE job_id=p_job_id AND status IN ('generating','reviewing') ORDER BY start_chapter DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.story_factory_windows(job_id,project_id,novel_id,start_chapter,end_chapter,status,checkpoint_state,rolling_plan)
      VALUES(p_job_id,v_job.project_id,v_job.novel_id,p_expected_chapter,p_expected_chapter+4,'generating',v_project.story_state,v_job.rolling_plan)
      RETURNING * INTO v_window;
  END IF;
  IF p_expected_chapter > v_window.end_chapter THEN RAISE EXCEPTION 'FACTORY_DRAFT_WINDOW_FULL'; END IF;
  INSERT INTO public.chapters(novel_id,chapter_number,title,content,quality_score,publication_state) VALUES(v_job.novel_id,p_expected_chapter,p_title,p_content,NULL,'draft');
  FOR v_event IN SELECT value FROM jsonb_array_elements(p_events) LOOP
    INSERT INTO public.story_state_events(project_id,chapter_number,delta_id,kind,entity_id,before_value,after_value,source)
      VALUES(v_job.project_id,p_expected_chapter,v_event->>'deltaId',v_event->>'kind',v_event->>'entityId',v_event->'before',v_event->'after',NULLIF(v_event->>'source',''));
  END LOOP;
  UPDATE public.ai_story_projects SET story_state=p_state_after,current_chapter=p_expected_chapter,updated_at=now() WHERE id=v_project.id;
  SELECT count(*) INTO v_drafts FROM public.chapters WHERE novel_id=v_job.novel_id AND publication_state='draft';
  v_today := CASE WHEN v_job.quota_date=v_local_date THEN v_job.chapters_today+1 ELSE 1 END;
  v_next_stage := CASE WHEN v_drafts >= 5 THEN 'window_review' WHEN jsonb_array_length(COALESCE(p_remaining_plan->'plans','[]'::jsonb))=0 THEN 'plan' ELSE 'write' END;
  UPDATE public.story_factory_jobs SET current_chapter=p_expected_chapter,rolling_plan=p_remaining_plan,plan_feedback=NULL,retry_count=0,
    status='ready',stage=v_next_stage,chapters_today=v_today,quota_date=v_local_date,next_run_at=now(),lease_owner=NULL,lease_token=NULL,lease_until=NULL,last_run_id=p_run_id,updated_at=now() WHERE id=p_job_id;
  UPDATE public.story_factory_windows SET final_state=p_state_after,updated_at=now() WHERE id=v_window.id;
  UPDATE public.story_factory_runs SET status='passed',output_artifact=jsonb_build_object('title',p_title,'stateAfter',p_state_after,'attemptTelemetry',p_attempt_telemetry,'publication','draft'),editor_assessment=p_assessment,context_manifest=p_context_manifest,usage=p_usage,estimated_cost_usd=p_cost_usd,word_count=p_word_count,revision_count=p_revision_count,draft_attempts=1+p_revision_count,first_pass=(p_revision_count=0),published_after_rewrite=false,error_code=NULL,error_message=NULL,finished_at=now() WHERE id=p_run_id AND job_id=p_job_id AND status='running';
  IF NOT FOUND THEN RAISE EXCEPTION 'FACTORY_RUN_NOT_RUNNING'; END IF;
  RETURN jsonb_build_object('chapterNumber',p_expected_chapter,'status','staged','windowStart',v_window.start_chapter);
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_story_factory_window(
  p_job_id uuid, p_lease_token uuid, p_review_run_id uuid, p_review jsonb, p_review_digest text, p_next_stage text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_job public.story_factory_jobs; v_window public.story_factory_windows; v_count integer; v_max integer;
BEGIN
  SELECT * INTO v_job FROM public.story_factory_jobs WHERE id=p_job_id FOR UPDATE;
  IF NOT FOUND OR v_job.lease_token IS DISTINCT FROM p_lease_token OR v_job.lease_until < now() THEN RAISE EXCEPTION 'FACTORY_LEASE_INVALID'; END IF;
  SELECT * INTO v_window FROM public.story_factory_windows WHERE job_id=p_job_id AND status IN ('generating','reviewing') ORDER BY start_chapter DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FACTORY_DRAFT_WINDOW_MISSING'; END IF;
  SELECT count(*), max(chapter_number) INTO v_count,v_max FROM public.chapters WHERE novel_id=v_job.novel_id AND publication_state='draft' AND chapter_number BETWEEN v_window.start_chapter AND v_window.end_chapter;
  IF v_count <> 5 OR v_max <> v_window.end_chapter THEN RAISE EXCEPTION 'FACTORY_DRAFT_WINDOW_INCOMPLETE'; END IF;
  UPDATE public.chapters SET publication_state='published',published_at=now(),updated_at=now() WHERE novel_id=v_job.novel_id AND publication_state='draft' AND chapter_number BETWEEN v_window.start_chapter AND v_window.end_chapter;
  UPDATE public.story_factory_windows SET status='published',review=p_review,review_digest=p_review_digest,reviewed_at=now(),published_at=now(),updated_at=now() WHERE id=v_window.id;
  UPDATE public.story_factory_runs SET status='published',output_artifact=COALESCE(output_artifact,'{}'::jsonb)||jsonb_build_object('publication','published') WHERE job_id=p_job_id AND kind='chapter' AND status='passed' AND chapter_number BETWEEN v_window.start_chapter AND v_window.end_chapter;
  UPDATE public.story_factory_runs SET status='passed',output_artifact=COALESCE(output_artifact,'{}'::jsonb)||jsonb_build_object('review',p_review),error_code=NULL,error_message=NULL,finished_at=now() WHERE id=p_review_run_id AND status='running';
  UPDATE public.novels SET chapter_count=v_max,total_chapters=GREATEST(total_chapters,v_max),updated_at=now() WHERE id=v_job.novel_id;
  UPDATE public.story_factory_jobs SET status='ready',stage=p_next_stage,lease_owner=NULL,lease_token=NULL,lease_until=NULL,next_run_at=now(),retry_count=0,updated_at=now() WHERE id=p_job_id;
  RETURN jsonb_build_object('published',true,'startChapter',v_window.start_chapter,'endChapter',v_window.end_chapter);
END;
$$;

-- The first failed review resets only the private window to its saved checkpoint.
-- It is intentionally idempotent: a second reviewer race sees repair_attempts=1
-- and returns false, leaving the exact failed draft and evidence frozen for ops.
CREATE OR REPLACE FUNCTION public.repair_story_factory_draft_window(
  p_job_id uuid, p_lease_token uuid, p_review_run_id uuid, p_review jsonb, p_usage jsonb, p_cost_usd numeric
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_job public.story_factory_jobs; v_window public.story_factory_windows;
BEGIN
  SELECT * INTO v_job FROM public.story_factory_jobs WHERE id=p_job_id FOR UPDATE;
  IF NOT FOUND OR v_job.lease_token IS DISTINCT FROM p_lease_token OR v_job.lease_until < now() THEN RAISE EXCEPTION 'FACTORY_LEASE_INVALID'; END IF;
  SELECT * INTO v_window FROM public.story_factory_windows WHERE job_id=p_job_id AND status IN ('generating','reviewing') ORDER BY start_chapter DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FACTORY_DRAFT_WINDOW_MISSING'; END IF;
  IF v_window.repair_attempts >= 1 THEN
    UPDATE public.story_factory_windows SET status='blocked',review=p_review,reviewed_at=now(),updated_at=now() WHERE id=v_window.id;
    RETURN jsonb_build_object('requeued', false, 'repairAttempts', v_window.repair_attempts);
  END IF;
  UPDATE public.story_factory_runs SET status='blocked',error_code='quality_blocked',error_message='Window review failed; automatically returned to the saved draft checkpoint.',output_artifact=COALESCE(output_artifact,'{}'::jsonb)||jsonb_build_object('review',p_review,'automaticRepair',true),usage=p_usage,estimated_cost_usd=p_cost_usd,finished_at=now()
    WHERE id=p_review_run_id AND job_id=p_job_id AND status='running';
  DELETE FROM public.story_state_events WHERE project_id=v_window.project_id AND chapter_number BETWEEN v_window.start_chapter AND v_window.end_chapter;
  DELETE FROM public.chapters WHERE novel_id=v_window.novel_id AND publication_state='draft' AND chapter_number BETWEEN v_window.start_chapter AND v_window.end_chapter;
  UPDATE public.ai_story_projects SET story_state=v_window.checkpoint_state,current_chapter=v_window.start_chapter-1,updated_at=now() WHERE id=v_window.project_id;
  UPDATE public.story_factory_windows SET status='generating',final_state=NULL,rolling_plan=NULL,review=NULL,
    review_history=review_history || jsonb_build_array(jsonb_build_object('review',p_review,'reviewedAt',now(),'automaticRepair',true)),
    repair_attempts=repair_attempts+1,reviewed_at=now(),updated_at=now() WHERE id=v_window.id;
  UPDATE public.story_factory_jobs SET current_chapter=v_window.start_chapter-1,rolling_plan=NULL,plan_feedback=jsonb_build_object('windowReview',p_review,'repairAttempt',1),
    status='ready',stage='plan',retry_count=0,next_run_at=now(),lease_owner=NULL,lease_token=NULL,lease_until=NULL,last_run_id=p_review_run_id,updated_at=now() WHERE id=p_job_id;
  RETURN jsonb_build_object('requeued', true, 'repairAttempts', 1, 'startChapter', v_window.start_chapter);
END;
$$;
REVOKE ALL ON FUNCTION public.commit_story_factory_draft_chapter(uuid,uuid,uuid,integer,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,numeric,integer,integer,jsonb,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.publish_story_factory_window(uuid,uuid,uuid,jsonb,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.repair_story_factory_draft_window(uuid,uuid,uuid,jsonb,jsonb,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.commit_story_factory_draft_chapter(uuid,uuid,uuid,integer,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,numeric,integer,integer,jsonb,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_story_factory_window(uuid,uuid,uuid,jsonb,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.repair_story_factory_draft_window(uuid,uuid,uuid,jsonb,jsonb,numeric) TO service_role;

-- Ranking and aggregate RPCs must not disclose hidden titles by ID or count.
-- They are SECURITY INVOKER today, but making the visibility predicate explicit
-- preserves the boundary if a future caller has broader table privileges.
CREATE OR REPLACE FUNCTION public.get_novels_with_stats(p_novel_ids uuid[])
RETURNS TABLE(novel_id uuid, view_count integer, bookmark_count integer, rating_avg double precision, rating_count integer, comment_count integer, chapter_count integer)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT n.id,
    COALESCE((SELECT count(*) FROM public.chapter_reads cr WHERE cr.novel_id=n.id),0)::integer,
    COALESCE((SELECT count(*) FROM public.bookmarks b WHERE b.novel_id=n.id),0)::integer,
    COALESCE((SELECT round(avg(r.score)::numeric,2)::double precision FROM public.ratings r WHERE r.novel_id=n.id),0)::double precision,
    COALESCE((SELECT count(*) FROM public.ratings r WHERE r.novel_id=n.id),0)::integer,
    COALESCE((SELECT count(*) FROM public.comments c WHERE c.novel_id=n.id AND c.status='approved'),0)::integer,
    COALESCE((SELECT count(*) FROM public.chapters ch WHERE ch.novel_id=n.id AND ch.publication_state='published'),0)::integer
  FROM unnest(p_novel_ids) requested(id)
  JOIN public.novels n ON n.id=requested.id AND n.hidden=false;
$$;

CREATE OR REPLACE FUNCTION public.get_top_novels_by_views(p_days integer DEFAULT 7, p_limit integer DEFAULT 50)
RETURNS TABLE(novel_id uuid, view_count bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT cr.novel_id, count(*) FROM public.chapter_reads cr
  JOIN public.novels n ON n.id=cr.novel_id AND n.hidden=false
  WHERE cr.read_at >= now() - (GREATEST(p_days, 1) || ' days')::interval
  GROUP BY cr.novel_id ORDER BY count(*) DESC LIMIT LEAST(GREATEST(p_limit, 1), 100);
$$;

CREATE OR REPLACE FUNCTION public.get_top_novels_by_bookmarks(p_limit integer DEFAULT 50)
RETURNS TABLE(novel_id uuid, bookmark_count bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT b.novel_id, count(*) FROM public.bookmarks b
  JOIN public.novels n ON n.id=b.novel_id AND n.hidden=false
  GROUP BY b.novel_id ORDER BY count(*) DESC LIMIT LEAST(GREATEST(p_limit, 1), 100);
$$;

CREATE OR REPLACE FUNCTION public.get_top_novels_by_rating(p_min_ratings integer DEFAULT 3, p_limit integer DEFAULT 50)
RETURNS TABLE(novel_id uuid, rating_avg double precision, rating_count bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT r.novel_id, round(avg(r.score)::numeric,2)::double precision, count(*) FROM public.ratings r
  JOIN public.novels n ON n.id=r.novel_id AND n.hidden=false
  GROUP BY r.novel_id HAVING count(*) >= GREATEST(p_min_ratings, 1)
  ORDER BY round(avg(r.score)::numeric,2)::double precision DESC, count(*) DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 100);
$$;

-- Vercel owns the application schedule and has only the factory + health check
-- in vercel.json. pg_cron is an admin-owned system schema in this project, so
-- obsolete server-side rows are documented for the dashboard owner to remove
-- there rather than making the app migration fail on an inaccessible table.

-- Existing counter triggers predate draft publication and count every inserted
-- chapter.  Keep one trigger and make it count only reader-visible chapters.
CREATE OR REPLACE FUNCTION public.update_novel_chapter_count()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_novel_id uuid; v_count integer;
BEGIN
  v_novel_id := COALESCE(NEW.novel_id, OLD.novel_id);
  SELECT count(*) INTO v_count FROM public.chapters
  WHERE novel_id = v_novel_id AND publication_state = 'published';
  UPDATE public.novels SET chapter_count=v_count, total_chapters=v_count, updated_at=now() WHERE id=v_novel_id;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trigger_update_novel_total_chapters ON public.chapters;

-- These indexes duplicate an existing unique constraint/index.  Never drop a
-- constraint-owned index; this only removes standalone duplicates when present.
DO $$
DECLARE v_index text;
BEGIN
  FOREACH v_index IN ARRAY ARRAY[
    'chapters_unique_novel_chapter',
    'idx_chapters_novel_id_chapter_number_unique',
    'idx_chapters_novel_number',
    'idx_novels_genres',
    'idx_reading_progress_user_novel',
    'reading_progress_unique_user_novel',
    'reading_progress_user_novel_unique'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_class c WHERE c.relkind='i' AND c.relname=v_index)
      AND NOT EXISTS (
        SELECT 1 FROM pg_constraint con WHERE con.conindid = to_regclass(format('public.%I', v_index))
      ) THEN
      EXECUTE format('DROP INDEX public.%I', v_index);
    END IF;
  END LOOP;
END $$;
