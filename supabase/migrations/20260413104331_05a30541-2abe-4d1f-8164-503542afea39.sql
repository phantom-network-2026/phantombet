CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_bonus numeric := 0;
  v_config jsonb;
BEGIN
  -- Check welcome_bonus setting
  SELECT value INTO v_config FROM public.site_settings WHERE key = 'welcome_bonus' LIMIT 1;
  
  IF v_config IS NULL OR (v_config->>'enabled')::boolean IS DISTINCT FROM false THEN
    -- Default to 100 if no config or enabled
    v_bonus := COALESCE((v_config->>'amount')::numeric, 100);
  END IF;

  INSERT INTO public.profiles (user_id, username, balance, real_balance)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', NEW.email), v_bonus, 0.00);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;