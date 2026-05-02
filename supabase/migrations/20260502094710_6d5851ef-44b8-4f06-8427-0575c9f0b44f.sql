-- Backfill: turn each user's real_balance into a USDT holding
INSERT INTO public.user_coin_balances (user_id, symbol, available, locked)
SELECT user_id, 'USDT', real_balance, 0
FROM public.profiles
WHERE real_balance > 0
ON CONFLICT (user_id, symbol) DO UPDATE
SET available = EXCLUDED.available;

CREATE INDEX IF NOT EXISTS idx_user_coin_balances_user ON public.user_coin_balances(user_id, symbol);

-- Trigger: when real_balance changes on profiles, mirror to user_coin_balances USDT
CREATE OR REPLACE FUNCTION public.sync_real_balance_to_usdt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.real_balance IS DISTINCT FROM OLD.real_balance THEN
    INSERT INTO public.user_coin_balances (user_id, symbol, available, locked)
    VALUES (NEW.user_id, 'USDT', GREATEST(NEW.real_balance, 0), 0)
    ON CONFLICT (user_id, symbol) DO UPDATE
    SET available = GREATEST(EXCLUDED.available, 0);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_real_balance_to_usdt ON public.profiles;
CREATE TRIGGER trg_sync_real_balance_to_usdt
AFTER UPDATE OF real_balance ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_real_balance_to_usdt();

-- Trigger: when USDT row changes in user_coin_balances, mirror back to profiles.real_balance
CREATE OR REPLACE FUNCTION public.sync_usdt_to_real_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.symbol = 'USDT' THEN
    UPDATE public.profiles
    SET real_balance = GREATEST(NEW.available, 0)
    WHERE user_id = NEW.user_id
      AND real_balance IS DISTINCT FROM GREATEST(NEW.available, 0);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_usdt_to_real_balance ON public.user_coin_balances;
CREATE TRIGGER trg_sync_usdt_to_real_balance
AFTER INSERT OR UPDATE OF available ON public.user_coin_balances
FOR EACH ROW
EXECUTE FUNCTION public.sync_usdt_to_real_balance();

-- Allow users to view their own coin holdings
ALTER TABLE public.user_coin_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own coin balances" ON public.user_coin_balances;
CREATE POLICY "Users view own coin balances"
ON public.user_coin_balances FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages coin balances" ON public.user_coin_balances;
CREATE POLICY "Service role manages coin balances"
ON public.user_coin_balances FOR ALL
TO service_role
USING (true) WITH CHECK (true);