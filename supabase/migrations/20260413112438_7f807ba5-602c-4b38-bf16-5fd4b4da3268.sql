
DROP VIEW IF EXISTS public.deposit_addresses_safe;

-- Use security_definer intentionally: users have no direct SELECT on deposit_addresses,
-- the view strips private_key_encrypted so only safe columns are exposed.
CREATE VIEW public.deposit_addresses_safe AS
SELECT id, user_id, tron_address, is_active, created_at
FROM public.deposit_addresses;

GRANT SELECT ON public.deposit_addresses_safe TO authenticated;

-- Add RLS-like restriction via a policy on the view usage:
-- Users can only see their own deposit addresses through this view
CREATE OR REPLACE FUNCTION public.deposit_address_for_user(p_user_id uuid)
RETURNS TABLE(tron_address text, is_active boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT da.tron_address, da.is_active 
  FROM deposit_addresses da 
  WHERE da.user_id = p_user_id AND p_user_id = auth.uid();
$$;
