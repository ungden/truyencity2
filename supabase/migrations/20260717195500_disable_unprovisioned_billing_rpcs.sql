BEGIN;

CREATE OR REPLACE FUNCTION public.can_user_write_chapter(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_authenticated');
  END IF;
  RETURN jsonb_build_object('allowed', false, 'reason', 'billing_not_configured');
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_chapter_credit(
  p_chapter_id uuid DEFAULT NULL,
  p_words_count integer DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;
  RETURN jsonb_build_object('success', false, 'reason', 'billing_not_configured');
END;
$$;

COMMIT;
