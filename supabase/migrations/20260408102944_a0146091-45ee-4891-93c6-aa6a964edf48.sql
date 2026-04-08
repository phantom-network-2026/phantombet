CREATE OR REPLACE FUNCTION public.prevent_balance_self_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.balance IS DISTINCT FROM OLD.balance THEN
    IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Only admins can modify balance';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;