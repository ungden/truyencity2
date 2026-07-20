-- The canonical migration removed the project graph. These independent tables
-- and SQL functions predated that graph and therefore survived its CASCADE.
-- None are read by the canonical Story Factory.

DROP TABLE IF EXISTS public.ai_prompt_templates CASCADE;
DROP TABLE IF EXISTS public.chapter_versions CASCADE;
DROP TABLE IF EXISTS public.rewrite_chain_items CASCADE;

DO $$
DECLARE item record;
BEGIN
  FOR item IN
    SELECT procedure.proname AS function_name,
           pg_get_function_identity_arguments(procedure.oid) AS identity_arguments
    FROM pg_proc procedure
    JOIN pg_namespace namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname IN (
        'archive_old_rag_chunks', 'auto_create_plot_arc', 'can_use_beat',
        'check_abandoned_threads', 'check_romance_stalls', 'generate_arc_summary',
        'get_active_plot_threads', 'get_battle_variety_report', 'get_cache_hit_rate',
        'get_chapter_costs', 'get_character_state', 'get_characters_needing_development',
        'get_cost_by_task', 'get_daily_cost', 'get_novel_cost_detail',
        'get_novel_costs', 'get_novel_costs_with_engagement', 'get_qc_pass_rate',
        'get_writing_style_trends', 'guard_finished_story_chapter_attempt_v3',
        'guard_story_launch_pack_v3', 'match_anchor_chunks', 'match_story_chunks',
        'search_story_context', 'update_embedding_cache_timestamp',
        'update_plot_thread_timestamp', 'update_rewrite_chain_updated_at',
        'upgrade_hidden_canary_release_v3'
      )
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', item.function_name, item.identity_arguments);
  END LOOP;
END $$;
