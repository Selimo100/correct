-- =====================================================
-- UPDATE RESOLVE_BET AND VOID_BET FUNCTIONS
-- =====================================================
-- Run this file to update only the settlement functions
-- without recreating triggers that already exist
-- =====================================================

-- =====================================================
-- FUNCTION: Resolve Bet (Admin RPC) - UPDATED
-- =====================================================
CREATE OR REPLACE FUNCTION resolve_bet(
  p_bet_id UUID,
  p_resolution BOOLEAN,
  p_fee_bps INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_admin_id UUID;
  v_bet RECORD;
  v_total_pot BIGINT;
  v_winners_total BIGINT;
  v_fee_amount BIGINT;
  v_payout_pot BIGINT;
  v_winner RECORD;
  v_payout BIGINT;
  v_total_paid BIGINT := 0;
  v_remainder BIGINT;
  v_is_admin BOOLEAN;
  v_payout_count INTEGER := 0;
  v_max_stake_user_id UUID;
  v_max_stake BIGINT;
BEGIN
  -- Set search path for security
  SET search_path = public;
  
  -- Get current user ID and check admin status
  v_admin_id := auth.uid();
  
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  SELECT is_admin INTO v_is_admin
  FROM public.profiles
  WHERE id = v_admin_id;
  
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;
  
  -- Lock bet row to prevent concurrent modifications
  SELECT * INTO v_bet
  FROM public.bets
  WHERE id = p_bet_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bet not found');
  END IF;
  
  -- Check if bet can be resolved
  IF v_bet.status != 'OPEN' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bet already resolved or voided');
  END IF;
  
  IF v_bet.end_at > NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bet has not ended yet');
  END IF;
  
  -- Check idempotency: try to insert settlement record
  BEGIN
    INSERT INTO public.bet_settlements (bet_id, outcome, settled_by_id, settled_at)
    VALUES (p_bet_id, p_resolution, v_admin_id, NOW());
  EXCEPTION WHEN unique_violation THEN
    -- Already settled
    RETURN jsonb_build_object(
      'success', true, 
      'message', 'Bet already settled',
      'already_settled', true
    );
  END;
  
  -- Calculate total pot
  SELECT COALESCE(SUM(stake)::BIGINT, 0) INTO v_total_pot
  FROM public.bet_entries
  WHERE bet_id = p_bet_id;
  
  IF v_total_pot = 0 THEN
    -- No stakes, just mark as resolved
    UPDATE public.bets
    SET status = 'RESOLVED', resolution = p_resolution, resolved_at = NOW(), resolved_by_id = v_admin_id
    WHERE id = p_bet_id;
    
    -- Update settlement record
    UPDATE public.bet_settlements
    SET total_pot = 0, winners_total = 0, fee_amount = 0, payout_count = 0
    WHERE bet_id = p_bet_id;
    
    -- Log admin action
    INSERT INTO public.admin_actions (admin_id, action, target_id, metadata)
    VALUES (v_admin_id, 'RESOLVE_BET', p_bet_id, jsonb_build_object('resolution', p_resolution, 'pot', 0));
    
    RETURN jsonb_build_object('success', true, 'pot', 0, 'winners', 0, 'paid_out', 0);
  END IF;
  
  -- Calculate winners' total stake
  SELECT COALESCE(SUM(stake)::BIGINT, 0) INTO v_winners_total
  FROM public.bet_entries
  WHERE bet_id = p_bet_id
    AND side = CASE WHEN p_resolution THEN 'FOR' ELSE 'AGAINST' END;
  
  -- If no winners, auto-void the bet and refund all stakes
  IF v_winners_total = 0 THEN
    -- Delete the settlement record we just created
    DELETE FROM public.bet_settlements WHERE bet_id = p_bet_id;
    
    -- Insert a VOID settlement record instead
    INSERT INTO public.bet_settlements (bet_id, outcome, total_pot, winners_total, settled_by_id, settled_at, metadata)
    VALUES (p_bet_id, NULL, v_total_pot, 0, v_admin_id, NOW(), 
            jsonb_build_object('reason', 'No winners - auto voided', 'attempted_resolution', p_resolution));
    
    -- Refund all stakes
    FOR v_winner IN
      SELECT user_id, stake
      FROM public.bet_entries
      WHERE bet_id = p_bet_id
    LOOP
      INSERT INTO public.wallet_ledger (user_id, amount, type, bet_id, metadata)
      VALUES (v_winner.user_id, v_winner.stake, 'BET_REFUND', p_bet_id, 
              jsonb_build_object('reason', 'No winners - bet voided'));
    END LOOP;
    
    UPDATE public.bets
    SET status = 'VOID', resolved_at = NOW(), resolved_by_id = v_admin_id
    WHERE id = p_bet_id;
    
    INSERT INTO public.admin_actions (admin_id, action, target_id, metadata)
    VALUES (v_admin_id, 'VOID_BET', p_bet_id, 
            jsonb_build_object('reason', 'No winners', 'refunded', v_total_pot, 'attempted_resolution', p_resolution));
    
    RETURN jsonb_build_object('success', true, 'voided', true, 'refunded', v_total_pot, 'reason', 'No winners on winning side');
  END IF;
  
  -- Calculate fee and payout pot
  v_fee_amount := (v_total_pot * p_fee_bps) / 10000;
  v_payout_pot := v_total_pot - v_fee_amount;
  
  -- Find the winner with the highest stake (for remainder distribution)
  SELECT user_id, stake INTO v_max_stake_user_id, v_max_stake
  FROM public.bet_entries
  WHERE bet_id = p_bet_id
    AND side = CASE WHEN p_resolution THEN 'FOR' ELSE 'AGAINST' END
  ORDER BY stake DESC, created_at ASC
  LIMIT 1;
  
  -- Distribute payouts to winners with precise integer math
  FOR v_winner IN
    SELECT user_id, stake
    FROM public.bet_entries
    WHERE bet_id = p_bet_id
      AND side = CASE WHEN p_resolution THEN 'FOR' ELSE 'AGAINST' END
    ORDER BY stake DESC, created_at ASC
  LOOP
    -- Calculate proportional payout: stake * (payout_pot / winners_total)
    v_payout := (v_winner.stake * v_payout_pot) / v_winners_total;
    
    -- Add remainder to the highest stake holder (first in loop due to ORDER BY)
    IF v_winner.user_id = v_max_stake_user_id THEN
      v_remainder := v_payout_pot - ((v_winners_total * v_payout_pot) / v_winners_total);
      v_payout := v_payout + v_remainder;
    END IF;
    
    INSERT INTO public.wallet_ledger (user_id, amount, type, bet_id, metadata)
    VALUES (v_winner.user_id, v_payout, 'BET_PAYOUT', p_bet_id, 
            jsonb_build_object('resolution', p_resolution, 'stake', v_winner.stake, 'payout', v_payout));
    
    v_total_paid := v_total_paid + v_payout;
    v_payout_count := v_payout_count + 1;
  END LOOP;
  
  -- Insert fee entry if fee > 0
  IF v_fee_amount > 0 THEN
    -- Fee goes to a treasury or is just tracked
    -- For now, we just record it in the ledger without a user_id
    -- You may want to assign this to a treasury account
    INSERT INTO public.wallet_ledger (user_id, amount, type, bet_id, metadata)
    VALUES (v_admin_id, v_fee_amount, 'FEE', p_bet_id, 
            jsonb_build_object('fee_bps', p_fee_bps, 'total_pot', v_total_pot));
  END IF;
  
  -- Update bet status
  UPDATE public.bets
  SET status = 'RESOLVED', resolution = p_resolution, resolved_at = NOW(), resolved_by_id = v_admin_id
  WHERE id = p_bet_id;
  
  -- Update settlement record with final stats
  UPDATE public.bet_settlements
  SET total_pot = v_total_pot,
      winners_total = v_winners_total,
      fee_amount = v_fee_amount,
      payout_count = v_payout_count,
      metadata = jsonb_build_object('total_paid', v_total_paid, 'fee_bps', p_fee_bps)
  WHERE bet_id = p_bet_id;
  
  -- Log admin action
  INSERT INTO public.admin_actions (admin_id, action, target_id, metadata)
  VALUES (v_admin_id, 'RESOLVE_BET', p_bet_id, 
          jsonb_build_object('resolution', p_resolution, 'pot', v_total_pot, 'fee', v_fee_amount, 'paid_out', v_total_paid));
  
  RETURN jsonb_build_object(
    'success', true, 
    'pot', v_total_pot, 
    'fee', v_fee_amount, 
    'paid_out', v_total_paid,
    'payout_count', v_payout_count,
    'winners_total', v_winners_total
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION resolve_bet(UUID, BOOLEAN, INTEGER) TO authenticated;

-- =====================================================
-- FUNCTION: Void Bet (Admin RPC) - UPDATED
-- =====================================================
CREATE OR REPLACE FUNCTION void_bet(p_bet_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_admin_id UUID;
  v_bet RECORD;
  v_participant RECORD;
  v_total_refunded BIGINT := 0;
  v_is_admin BOOLEAN;
BEGIN
  -- Set search path for security
  SET search_path = public;
  
  -- Get current user ID and check admin status
  v_admin_id := auth.uid();
  
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  SELECT is_admin INTO v_is_admin
  FROM public.profiles
  WHERE id = v_admin_id;
  
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;
  
  -- Lock bet row to prevent concurrent modifications
  SELECT * INTO v_bet
  FROM public.bets
  WHERE id = p_bet_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bet not found');
  END IF;
  
  -- Check if bet can be voided
  IF v_bet.status != 'OPEN' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bet already resolved or voided');
  END IF;
  
  -- Check idempotency: try to insert settlement record (with NULL outcome for void)
  BEGIN
    INSERT INTO public.bet_settlements (bet_id, outcome, settled_by_id, settled_at, metadata)
    VALUES (p_bet_id, NULL, v_admin_id, NOW(), jsonb_build_object('action', 'void'));
  EXCEPTION WHEN unique_violation THEN
    -- Already voided
    RETURN jsonb_build_object(
      'success', true, 
      'message', 'Bet already voided',
      'already_voided', true
    );
  END;
  
  -- Refund all participants
  FOR v_participant IN
    SELECT user_id, stake
    FROM public.bet_entries
    WHERE bet_id = p_bet_id
  LOOP
    INSERT INTO public.wallet_ledger (user_id, amount, type, bet_id, metadata)
    VALUES (v_participant.user_id, v_participant.stake, 'BET_REFUND', p_bet_id, 
            jsonb_build_object('reason', 'Bet voided by admin'));
    
    v_total_refunded := v_total_refunded + v_participant.stake;
  END LOOP;
  
  -- Update bet status
  UPDATE public.bets
  SET status = 'VOID', resolved_at = NOW(), resolved_by_id = v_admin_id
  WHERE id = p_bet_id;
  
  -- Update settlement record with refund total
  UPDATE public.bet_settlements
  SET total_pot = v_total_refunded,
      winners_total = 0,
      fee_amount = 0,
      payout_count = 0,
      metadata = jsonb_build_object('action', 'void', 'refunded', v_total_refunded)
  WHERE bet_id = p_bet_id;
  
  -- Log admin action
  INSERT INTO public.admin_actions (admin_id, action, target_id, metadata)
  VALUES (v_admin_id, 'VOID_BET', p_bet_id, jsonb_build_object('refunded', v_total_refunded));
  
  RETURN jsonb_build_object('success', true, 'refunded', v_total_refunded);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION void_bet(UUID) TO authenticated;
