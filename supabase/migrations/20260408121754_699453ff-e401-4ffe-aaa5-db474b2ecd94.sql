
CREATE OR REPLACE FUNCTION public.claim_random_scratch_card(p_bet_tier numeric, p_user_id uuid)
RETURNS TABLE(card_id uuid, is_winner boolean, payout_multiplier numeric, symbols text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card_id uuid;
  v_is_winner boolean;
  v_payout_multiplier numeric;
  v_symbols text[];
BEGIN
  -- Select a random unclaimed card for this tier
  SELECT sc.id, sc.is_winner, sc.payout_multiplier, sc.symbols
  INTO v_card_id, v_is_winner, v_payout_multiplier, v_symbols
  FROM scratch_card_pool sc
  WHERE sc.bet_tier = p_bet_tier AND sc.claimed_by IS NULL
  ORDER BY random()
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_card_id IS NULL THEN
    RETURN;
  END IF;

  -- Claim it
  UPDATE scratch_card_pool
  SET claimed_by = p_user_id, claimed_at = now()
  WHERE id = v_card_id;

  card_id := v_card_id;
  is_winner := v_is_winner;
  payout_multiplier := v_payout_multiplier;
  symbols := v_symbols;
  RETURN NEXT;
END;
$$;
