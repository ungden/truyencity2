BEGIN;

CREATE OR REPLACE FUNCTION public.can_user_write_chapter(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription text;
  v_daily_limit integer;
  v_daily_used integer;
  v_balance integer;
  v_reset timestamptz;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_authenticated');
  END IF;
  IF to_regclass('public.user_subscriptions') IS NULL OR to_regclass('public.user_credits') IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'billing_not_configured');
  END IF;

  EXECUTE 'SELECT tier::text FROM public.user_subscriptions WHERE user_id=$1 AND status=''active'''
    INTO v_subscription USING p_user_id;
  IF NOT FOUND THEN v_subscription := 'free'; END IF;
  EXECUTE 'SELECT daily_limit,daily_used,balance,daily_reset_at FROM public.user_credits WHERE user_id=$1'
    INTO v_daily_limit,v_daily_used,v_balance,v_reset USING p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed',false,'reason','no_credits_account','tier',v_subscription);
  END IF;
  IF v_reset < now()-interval '24 hours' THEN v_daily_used:=0; END IF;
  IF v_daily_limit<>-1 AND v_daily_used>=v_daily_limit THEN
    RETURN jsonb_build_object('allowed',false,'reason','daily_limit_reached','tier',v_subscription,
      'daily_used',v_daily_used,'daily_limit',v_daily_limit,'reset_at',v_reset+interval '24 hours');
  END IF;
  RETURN jsonb_build_object('allowed',true,'tier',v_subscription,'daily_used',v_daily_used,
    'daily_limit',v_daily_limit,'balance',v_balance);
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
DECLARE
  v_user_id uuid := auth.uid();
  v_can_write jsonb;
  v_new_daily_used integer;
  v_new_balance integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;
  IF to_regclass('public.user_credits') IS NULL OR to_regclass('public.credit_transactions') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'billing_not_configured');
  END IF;
  v_can_write := public.can_user_write_chapter(v_user_id);
  IF NOT COALESCE((v_can_write->>'allowed')::boolean, false) THEN RETURN v_can_write; END IF;

  EXECUTE 'UPDATE public.user_credits SET daily_used=CASE WHEN daily_reset_at<now()-interval ''24 hours'' THEN 1 ELSE daily_used+1 END,
    daily_reset_at=CASE WHEN daily_reset_at<now()-interval ''24 hours'' THEN now() ELSE daily_reset_at END,
    lifetime_spent=lifetime_spent+1,updated_at=now() WHERE user_id=$1 RETURNING daily_used,balance'
    INTO v_new_daily_used,v_new_balance USING v_user_id;
  EXECUTE 'INSERT INTO public.credit_transactions
    (user_id,type,amount,balance_after,reference_type,reference_id,description)
    VALUES ($1,''credit_usage'',-1,$2,''chapter'',$3,$4)'
    USING v_user_id,v_new_balance,p_chapter_id,'Viết chương mới (' || COALESCE(p_words_count,0) || ' từ)';
  RETURN jsonb_build_object('success',true,'daily_used',v_new_daily_used,'balance',v_new_balance);
END;
$$;

COMMIT;
