-- Phase 1: Database State + Normalization

-- Create bet_settlements table
-- Drop existing table to ensure clean schema rebuild
DROP TABLE IF EXISTS public.bet_settlements CASCADE;

CREATE TABLE public.bet_settlements (
    bet_id UUID PRIMARY KEY REFERENCES public.bets(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('RESOLVE', 'VOID')),
    outcome BOOLEAN, -- NULL for VOID, boolean for RESOLVE
    fee_bps INTEGER NOT NULL DEFAULT 0,
    settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    settled_by UUID NOT NULL REFERENCES public.profiles(id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_bets_end_at_brin ON public.bets USING brin(end_at); -- For range queries
CREATE INDEX IF NOT EXISTS idx_bets_status_idx ON public.bets(status); 
CREATE INDEX IF NOT EXISTS idx_bets_hidden_idx ON public.bets(hidden); 
CREATE INDEX IF NOT EXISTS idx_bets_created_at_idx ON public.bets(created_at);

CREATE INDEX IF NOT EXISTS idx_bet_entries_bet_id_idx ON public.bet_entries(bet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_bet_id_idx ON public.wallet_ledger(bet_id);

-- Phase 2: Security Definer RPC

-- Helper: fn_is_admin()
CREATE OR REPLACE FUNCTION public.fn_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND status = 'ACTIVE'
      AND (is_admin OR is_super_admin)
  );
END;
$$;

-- Admin list bets: fn_admin_list_bets
-- "returns all bets regardless of hidden/private/audience"
-- "includes derived_status (LOCKED)"
-- "includes pot and participants aggregates"

-- Drop conflicting versions first to resolve ambiguity
DROP FUNCTION IF EXISTS fn_admin_list_bets(text, text, text, uuid, text, int, int);
DROP FUNCTION IF EXISTS fn_admin_list_bets(int, int, text, text);

CREATE OR REPLACE FUNCTION public.fn_admin_list_bets(
   p_limit INTEGER DEFAULT 50,
   p_offset INTEGER DEFAULT 0,
   p_search TEXT DEFAULT NULL,
   p_status TEXT DEFAULT NULL -- 'OPEN', 'LOCKED', 'RESOLVED', 'VOID', 'HIDDEN', 'ALL'
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  creator_id UUID,
  creator_name TEXT,
  creator_username TEXT,
  category TEXT,
  end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  status TEXT, -- Stored status
  derived_status TEXT, -- Computed status: OPEN, LOCKED, RESOLVED, VOID
  hidden BOOLEAN,
  resolution BOOLEAN,
  participants_count BIGINT,
  total_pot BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  v_is_admin := public.fn_is_admin();
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH bet_stats AS (
    SELECT 
      be.bet_id, 
      COUNT(DISTINCT be.user_id) as p_count, 
      COALESCE(SUM(be.stake), 0) as t_pot
    FROM public.bet_entries be
    GROUP BY be.bet_id
  )
  SELECT 
    b.id,
    b.title,
    b.description,
    b.creator_id,
    p.first_name || ' ' || p.last_name as creator_name,
    p.username as creator_username,
    b.category,
    b.end_at,
    b.created_at,
    b.status,
    CASE 
      WHEN b.status = 'OPEN' AND b.end_at < NOW() THEN 'LOCKED'
      ELSE b.status
    END as derived_status,
    b.hidden,
    b.resolution,
    COALESCE(bs.p_count, 0) as participants_count,
    COALESCE(bs.t_pot, 0) as total_pot
  FROM public.bets b
  LEFT JOIN public.profiles p ON b.creator_id = p.id
  LEFT JOIN bet_stats bs ON b.id = bs.bet_id
  WHERE 
    (p_search IS NULL OR b.title ILIKE '%' || p_search || '%')
    AND (
       p_status IS NULL OR p_status = 'ALL'
       OR (p_status = 'HIDDEN' AND b.hidden = TRUE)
       OR (p_status = 'LOCKED' AND b.status = 'OPEN' AND b.end_at < NOW())
       OR (p_status = 'OPEN' AND b.status = 'OPEN' AND b.end_at >= NOW())
       OR (p_status = 'RESOLVED' AND b.status = 'RESOLVED')
       OR (p_status = 'VOID' AND b.status = 'VOID')
    )
  ORDER BY b.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Admin set hidden: fn_admin_set_bet_hidden
CREATE OR REPLACE FUNCTION public.fn_admin_set_bet_hidden(
  p_bet_id UUID,
  p_hidden BOOLEAN
)
RETURNS TABLE (id UUID, hidden BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  v_is_admin := public.fn_is_admin();
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.bets
  SET hidden = p_hidden, updated_at = NOW()
  WHERE public.bets.id = p_bet_id
  RETURNING public.bets.id, public.bets.hidden INTO id, hidden;

  -- Log action
  INSERT INTO public.admin_actions (admin_id, action, target_id, target_type, details)
  VALUES (auth.uid(), 'TOGGLE_HIDDEN', p_bet_id, 'BET', jsonb_build_object('hidden', p_hidden));

  RETURN NEXT;
END;
$$;

-- Resolve bet: fn_admin_resolve_bet
CREATE OR REPLACE FUNCTION public.fn_admin_resolve_bet(
  p_bet_id UUID,
  p_outcome BOOLEAN,
  p_fee_bps INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bet RECORD;
  v_is_admin BOOLEAN;
  v_total_pot BIGINT;
  v_winners_total BIGINT;
  v_fee BIGINT;
  v_distributable BIGINT;
  v_payout_raw BIGINT;
  v_payout_sum BIGINT := 0;
  v_remainder BIGINT;
  v_winner RECORD;
  v_payouts_count INTEGER := 0;
BEGIN
  -- 1) Permission Check
  v_is_admin := public.fn_is_admin();
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- 2) Lock bet row
  SELECT * INTO v_bet FROM public.bets WHERE id = p_bet_id FOR UPDATE;
  
  -- 3) Validate
  IF v_bet.status != 'OPEN' THEN
    RAISE EXCEPTION 'Bet is not OPEN (status=%)', v_bet.status;
  END IF;
  
  IF NOW() < v_bet.end_at THEN
    RAISE EXCEPTION 'Bet is not LOCKED yet (end_at=%)', v_bet.end_at;
  END IF;

  -- 4) Insert into bet_settlements (Idempotency)
  BEGIN
    INSERT INTO public.bet_settlements (bet_id, kind, outcome, fee_bps, settled_by)
    VALUES (p_bet_id, 'RESOLVE', p_outcome, p_fee_bps, auth.uid());
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('status', 'ALREADY_SETTLED');
  END;

  -- 5) Compute totals
  SELECT COALESCE(SUM(stake), 0) INTO v_total_pot FROM public.bet_entries WHERE bet_id = p_bet_id;
  
  SELECT COALESCE(SUM(stake), 0) INTO v_winners_total 
  FROM public.bet_entries 
  WHERE bet_id = p_bet_id AND ((side = 'FOR' AND p_outcome = TRUE) OR (side = 'AGAINST' AND p_outcome = FALSE));

  -- 6) Edge Cases
  
  -- No pot? Just close it.
  IF v_total_pot = 0 THEN
      UPDATE public.bets 
      SET status = 'RESOLVED', resolution = p_outcome, resolved_at = NOW(), resolved_by_id = auth.uid()
      WHERE id = p_bet_id;
      
      INSERT INTO public.admin_actions (admin_id, action, target_id, target_type, details)
      VALUES (auth.uid(), 'RESOLVE_BET', p_bet_id, 'BET', jsonb_build_object('outcome', p_outcome, 'reason', 'no_participants'));
      
      RETURN jsonb_build_object('status', 'RESOLVED', 'outcome', p_outcome, 'totalPot', 0, 'winnersTotal', 0);
  END IF;

  -- No winners? Auto-VOID.
  IF v_winners_total = 0 THEN
      -- Change settlement type to VOID
      UPDATE public.bet_settlements SET kind = 'VOID', outcome = NULL WHERE bet_id = p_bet_id;
      
      -- Proceed to refund logic
      FOR v_winner IN SELECT * FROM public.bet_entries WHERE bet_id = p_bet_id LOOP
          INSERT INTO public.wallet_ledger (user_id, amount, type, bet_id, metadata)
          VALUES (v_winner.user_id, v_winner.stake, 'BET_REFUND', p_bet_id, jsonb_build_object('reason', 'no_winners_auto_void'));
      END LOOP;

      UPDATE public.bets
      SET status = 'VOID', resolution = NULL, resolved_at = NOW(), resolved_by_id = auth.uid()
      WHERE id = p_bet_id;

      INSERT INTO public.admin_actions (admin_id, action, target_id, target_type, details)
      VALUES (auth.uid(), 'AUTO_VOID_BET', p_bet_id, 'BET', jsonb_build_object('reason', 'no_winners'));

      RETURN jsonb_build_object('status', 'VOID', 'reason', 'no_winners');
  END IF;

  -- 7) Payout Math
  v_fee := floor(v_total_pot * p_fee_bps / 10000);
  v_distributable := v_total_pot - v_fee;

  -- Create temp table for payouts calculation to handle remainders
  CREATE TEMP TABLE temp_payouts (
      user_id UUID,
      stake BIGINT,
      payout BIGINT
  ) ON COMMIT DROP;

  -- First pass: integer division
  INSERT INTO temp_payouts (user_id, stake, payout)
  SELECT user_id, stake, floor(stake * v_distributable / v_winners_total)
  FROM public.bet_entries
  WHERE bet_id = p_bet_id AND ((side = 'FOR' AND p_outcome = TRUE) OR (side = 'AGAINST' AND p_outcome = FALSE));

  -- Calculate allocated sum
  SELECT COALESCE(SUM(payout), 0) INTO v_payout_sum FROM temp_payouts;
  v_remainder := v_distributable - v_payout_sum;

  -- Distribute remainder to largest stakes
  IF v_remainder > 0 THEN
      UPDATE temp_payouts tp
      SET payout = payout + 1
      FROM (
          SELECT user_id FROM temp_payouts ORDER BY stake DESC, user_id ASC LIMIT v_remainder
      ) sub
      WHERE tp.user_id = sub.user_id;
  END IF;

  -- Insert ledger rows
  INSERT INTO public.wallet_ledger (user_id, amount, type, bet_id, metadata)
  SELECT 
      user_id, 
      payout, 
      'BET_PAYOUT', 
      p_bet_id, 
      jsonb_build_object('outcome', p_outcome, 'stake', stake, 'kind', 'RESOLVE')
  FROM temp_payouts;
  
  GET DIAGNOSTICS v_payouts_count = ROW_COUNT;

  -- Insert Fee row (if any)
  IF v_fee > 0 THEN
     -- Log fee
     INSERT INTO public.admin_actions (admin_id, action, target_id, target_type, details)
     VALUES (auth.uid(), 'COLLECT_FEE', p_bet_id, 'BET', jsonb_build_object('fee', v_fee));
  END IF;

  -- 8) Update Bets
  UPDATE public.bets
  SET status = 'RESOLVED', resolution = p_outcome, resolved_at = NOW(), resolved_by_id = auth.uid()
  WHERE id = p_bet_id;

  -- 9) Log Action
  INSERT INTO public.admin_actions (admin_id, action, target_id, target_type, details)
  VALUES (auth.uid(), 'RESOLVE_BET', p_bet_id, 'BET', jsonb_build_object('outcome', p_outcome, 'fee', v_fee, 'payouts', v_payouts_count));

  RETURN jsonb_build_object(
      'status', 'RESOLVED', 
      'outcome', p_outcome, 
      'totalPot', v_total_pot, 
      'winnersTotal', v_winners_total, 
      'fee', v_fee, 
      'payoutsCount', v_payouts_count
  );
END;
$$;

-- Void bet: fn_admin_void_bet
CREATE OR REPLACE FUNCTION public.fn_admin_void_bet(
  p_bet_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bet RECORD;
  v_is_admin BOOLEAN;
  v_entry RECORD;
BEGIN
  -- 1) Permission Check
  v_is_admin := public.fn_is_admin();
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- 2) Lock bet row
  SELECT * INTO v_bet FROM public.bets WHERE id = p_bet_id FOR UPDATE;
  
  -- 3) Validate
  IF v_bet.status != 'OPEN' THEN
      RETURN jsonb_build_object('status', 'ERROR', 'message', 'Bet is not OPEN'); 
  END IF;
  
  -- 4) Insert into bet_settlements (Idempotency)
  BEGIN
    INSERT INTO public.bet_settlements (bet_id, kind, fee_bps, settled_by)
    VALUES (p_bet_id, 'VOID', 0, auth.uid());
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('status', 'ALREADY_SETTLED');
  END;

  -- 5) Refund
  INSERT INTO public.wallet_ledger (user_id, amount, type, bet_id, metadata)
  SELECT user_id, stake, 'BET_REFUND', p_bet_id, jsonb_build_object('reason', 'manual_void')
  FROM public.bet_entries
  WHERE bet_id = p_bet_id;
  
  -- 6) Update Bet
  UPDATE public.bets
  SET status = 'VOID', resolution = NULL, resolved_at = NOW(), resolved_by_id = auth.uid()
  WHERE id = p_bet_id;

  -- 7) Log Action
  INSERT INTO public.admin_actions (admin_id, action, target_id, target_type, details)
  VALUES (auth.uid(), 'VOID_BET', p_bet_id, 'BET', jsonb_build_object('reason', 'manual_void'));

  RETURN jsonb_build_object('status', 'VOID');
END;
$$;
