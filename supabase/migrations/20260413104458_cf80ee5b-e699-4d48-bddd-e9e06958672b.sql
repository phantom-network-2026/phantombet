CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_bonus numeric := 0;
  v_config jsonb;
  v_wallet_mode text;
BEGIN
  -- Check wallet mode - only give bonus in mock mode
  SELECT (value->>'mode') INTO v_wallet_mode FROM public.site_settings WHERE key = 'wallet_mode' LIMIT 1;
  
  -- Only apply welcome bonus if wallet mode is mock (or not set, defaulting to mock)
  IF v_wallet_mode IS NULL OR v_wallet_mode = 'mock' THEN
    SELECT value INTO v_config FROM public.site_settings WHERE key = 'welcome_bonus' LIMIT 1;
    IF v_config IS NULL OR (v_config->>'enabled')::boolean IS DISTINCT FROM false THEN
      v_bonus := COALESCE((v_config->>'amount')::numeric, 100);
    END IF;
  END IF;

  INSERT INTO public.profiles (user_id, username, balance, real_balance)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', NEW.email), v_bonus, 0.00);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;