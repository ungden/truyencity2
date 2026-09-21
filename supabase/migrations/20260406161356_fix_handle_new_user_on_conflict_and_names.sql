
-- Fix handle_new_user:
-- 1. Add ON CONFLICT to prevent crash on retry/duplicate
-- 2. Support Apple (first_name/last_name), Google (given_name/family_name),
--    and fallback to full_name/name split
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'first_name',
      NEW.raw_user_meta_data ->> 'given_name',
      split_part(COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''), ' ', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data ->> 'last_name',
      NEW.raw_user_meta_data ->> 'family_name',
      NULLIF(split_part(COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''), ' ', 2), '')
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
;
