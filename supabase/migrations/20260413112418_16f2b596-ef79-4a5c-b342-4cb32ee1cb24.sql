
DROP VIEW IF EXISTS public.deposit_addresses_safe;

CREATE VIEW public.deposit_addresses_safe
WITH (security_invoker = true) AS
SELECT id, user_id, tron_address, is_active, created_at
FROM public.deposit_addresses;

GRANT SELECT ON public.deposit_addresses_safe TO authenticated;
