-- =====================================================
-- CORRECT? BETTING APP - DATABASE FUNCTIONS & TRIGGERS
-- =====================================================
-- This migration creates all stored procedures and triggers
-- for business logic enforcement.
-- =====================================================

-- =====================================================
-- FUNCTION: Generate Username
-- =====================================================
-- Generates a username in format "FirstName LastInitial."
-- Handles duplicates by appending " 2", " 3", etc.
CREATE OR REPLACE FUNCTION generate_username(p_first_name TEXT, p_last_name TEXT, p_user_id UUID DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  v_base_username TEXT;
  v_username TEXT;
  v_counter INTEGER := 2;
  v_exists BOOLEAN;
BEGIN
  -- Create base username: "FirstName L."
  v_base_username := TRIM(p_first_name) || ' ' || UPPER(LEFT(TRIM(p_last_name), 1)) || '.';
  v_username := v_base_username;
  
  -- Check for duplicates (excluding current user if updating)
  LOOP
    IF p_user_id IS NULL THEN
      SELECT EXISTS(SELECT 1 FROM public.profiles WHERE username = v_username) INTO v_exists;
    ELSE
      SELECT EXISTS(SELECT 1 FROM public.profiles WHERE username = v_username AND id != p_user_id) INTO v_exists;
    END IF;
    
    EXIT WHEN NOT v_exists;
    
    -- Append counter if duplicate exists
    v_username := v_base_username || ' ' || v_counter;
    v_counter := v_counter + 1;
  END LOOP;
  
  RETURN v_username;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER: Set Username on Profile Insert
-- =====================================================
CREATE OR REPLACE FUNCTION set_profile_username()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate and set username
  NEW.username := generate_username(NEW.first_name, NEW.last_name, NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_set_profile_username
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_profile_username();

-- =====================================================
-- TRIGGER: Update Username on Name Change
-- =====================================================
CREATE OR REPLACE FUNCTION update_profile_username()
RETURNS TRIGGER AS $$
BEGIN
  -- Regenerate username if first_name or last_name changed
  IF NEW.first_name != OLD.first_name OR NEW.last_name != OLD.last_name THEN
    NEW.username := generate_username(NEW.first_name, NEW.last_name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_profile_username
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_username();

-- =====================================================
-- FUNCTION: Get User Balance
-- =====================================================
-- Returns the current Neo balance for a user
CREATE OR REPLACE FUNCTION get_balance(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT COALESCE(SUM(amount), 0)
  INTO v_balance
  FROM public.wallet_ledger
  WHERE user_id = p_user_id;
  
  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Grant Starter Balance
-- =====================================================
-- Grants 100 Neos to a new user (called by trigger)
CREATE OR REPLACE FUNCTION grant_starter_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert starter balance into ledger
  INSERT INTO public.wallet_ledger (user_id, amount, type, metadata)
  VALUES (NEW.id, 100, 'STARTER', jsonb_build_object('reason', 'New user signup bonus'));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_grant_starter_balance
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION grant_starter_balance();

-- =====================================================
-- FUNCTION: Place Stake (RPC)
-- =====================================================
-- Allows a user to place or increase a stake on a bet
CREATE OR REPLACE FUNCTION place_stake(
  p_bet_id UUID,
  p_side TEXT,
  p_stake INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_bet RECORD;
  v_current_balance INTEGER;
  v_existing_entry RECORD;
  v_participant_count INTEGER;
  v_new_stake INTEGER;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Validate stake amount
  IF p_stake <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stake must be positive');
  END IF;
  
  -- Validate side
  IF p_side NOT IN ('FOR', 'AGAINST') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid side');
  END IF;
  
  -- Get bet details
  SELECT * INTO v_bet
  FROM public.bets
  WHERE id = p_bet_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bet not found');
  END IF;
  
  -- Check if bet is still open
  IF v_bet.status != 'OPEN' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bet is not open');
  END IF;
  
  -- Check if bet has ended
  IF v_bet.end_at <= NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bet has ended');
  END IF;
  
  -- Check if user already has an entry
  SELECT * INTO v_existing_entry
  FROM public.bet_entries
  WHERE bet_id = p_bet_id AND user_id = v_user_id;
  
  IF FOUND THEN
    -- User already has an entry - check if same side
    IF v_existing_entry.side != p_side THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot switch sides. Cancel your existing stake first.');
    END IF;
    
    -- Increase stake on same side
    v_new_stake := v_existing_entry.stake + p_stake;
  ELSE
    -- New entry - check participant cap
    IF v_bet.max_participants IS NOT NULL THEN
      SELECT COUNT(DISTINCT user_id) INTO v_participant_count
      FROM public.bet_entries
      WHERE bet_id = p_bet_id;
      
      IF v_participant_count >= v_bet.max_participants THEN
        RETURN jsonb_build_object('success', false, 'error', 'Bet has reached maximum participants');
      END IF;
    END IF;
    
    v_new_stake := p_stake;
  END IF;
  
  -- Check user balance
  v_current_balance := get_balance(v_user_id);
  
  IF v_current_balance < p_stake THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance', 'balance', v_current_balance);
  END IF;
  
  -- Start transaction
  BEGIN
    -- Deduct from wallet ledger
    INSERT INTO public.wallet_ledger (user_id, amount, type, bet_id, metadata)
    VALUES (v_user_id, -p_stake, 'BET_STAKE', p_bet_id, jsonb_build_object('side', p_side));
    
    -- Upsert bet entry
    IF FOUND AND v_existing_entry.id IS NOT NULL THEN
      UPDATE public.bet_entries
      SET stake = v_new_stake, updated_at = NOW()
      WHERE id = v_existing_entry.id;
    ELSE
      INSERT INTO public.bet_entries (bet_id, user_id, side, stake)
      VALUES (p_bet_id, v_user_id, p_side, v_new_stake);
    END IF;
    
    RETURN jsonb_build_object('success', true, 'new_stake', v_new_stake, 'new_balance', v_current_balance - p_stake);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION place_stake(UUID, TEXT, INTEGER) TO authenticated;

-- =====================================================
-- FUNCTION: Resolve Bet (Admin RPC)
-- =====================================================
-- Resolves a bet and distributes payouts
CREATE OR REPLACE FUNCTION resolve_bet(
  p_bet_id UUID,
  p_resolution BOOLEAN,
  p_fee_bps INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_admin_id UUID;
  v_bet RECORD;
  v_total_pot INTEGER;
  v_winners_total INTEGER;
  v_fee_amount INTEGER;
  v_payout_pot INTEGER;
  v_winner RECORD;
  v_payout INTEGER;
  v_is_admin BOOLEAN;
BEGIN
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
  
  -- Get bet details
  SELECT * INTO v_bet
  FROM public.bets
  WHERE id = p_bet_id;
  
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
  
  -- Calculate total pot
  SELECT COALESCE(SUM(stake), 0) INTO v_total_pot
  FROM public.bet_entries
  WHERE bet_id = p_bet_id;
  
  IF v_total_pot = 0 THEN
    -- No stakes, just mark as resolved
    UPDATE public.bets
    SET status = 'RESOLVED', resolution = p_resolution, resolved_at = NOW(), resolved_by_id = v_admin_id
    WHERE id = p_bet_id;
    
    -- Log admin action
    INSERT INTO public.admin_actions (admin_id, action, target_id, metadata)
    VALUES (v_admin_id, 'RESOLVE_BET', p_bet_id, jsonb_build_object('resolution', p_resolution, 'pot', 0));
    
    RETURN jsonb_build_object('success', true, 'pot', 0, 'winners', 0);
  END IF;
  
  -- Calculate winners' total stake
  SELECT COALESCE(SUM(stake), 0) INTO v_winners_total
  FROM public.bet_entries
  WHERE bet_id = p_bet_id
    AND side = CASE WHEN p_resolution THEN 'FOR' ELSE 'AGAINST' END;
  
  -- If no winners, void the bet instead
  IF v_winners_total = 0 THEN
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
    VALUES (v_admin_id, 'VOID_BET', p_bet_id, jsonb_build_object('reason', 'No winners', 'refunded', v_total_pot));
    
    RETURN jsonb_build_object('success', true, 'voided', true, 'refunded', v_total_pot);
  END IF;
  
  -- Calculate fee and payout pot
  v_fee_amount := (v_total_pot * p_fee_bps) / 10000;
  v_payout_pot := v_total_pot - v_fee_amount;
  
  -- Distribute payouts to winners
  FOR v_winner IN
    SELECT user_id, stake
    FROM public.bet_entries
    WHERE bet_id = p_bet_id
      AND side = CASE WHEN p_resolution THEN 'FOR' ELSE 'AGAINST' END
  LOOP
    -- Calculate proportional payout: stake * (payout_pot / winners_total)
    v_payout := (v_winner.stake * v_payout_pot) / v_winners_total;
    
    INSERT INTO public.wallet_ledger (user_id, amount, type, bet_id, metadata)
    VALUES (v_winner.user_id, v_payout, 'BET_PAYOUT', p_bet_id, 
            jsonb_build_object('resolution', p_resolution, 'stake', v_winner.stake, 'payout', v_payout));
  END LOOP;
  
  -- Update bet status
  UPDATE public.bets
  SET status = 'RESOLVED', resolution = p_resolution, resolved_at = NOW(), resolved_by_id = v_admin_id
  WHERE id = p_bet_id;
  
  -- Log admin action
  INSERT INTO public.admin_actions (admin_id, action, target_id, metadata)
  VALUES (v_admin_id, 'RESOLVE_BET', p_bet_id, 
          jsonb_build_object('resolution', p_resolution, 'pot', v_total_pot, 'fee', v_fee_amount, 'paid_out', v_payout_pot));
  
  RETURN jsonb_build_object('success', true, 'pot', v_total_pot, 'fee', v_fee_amount, 'paid_out', v_payout_pot);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION resolve_bet(UUID, BOOLEAN, INTEGER) TO authenticated;

-- =====================================================
-- FUNCTION: Void Bet (Admin RPC)
-- =====================================================
-- Voids a bet and refunds all stakes
CREATE OR REPLACE FUNCTION void_bet(p_bet_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_admin_id UUID;
  v_bet RECORD;
  v_participant RECORD;
  v_total_refunded INTEGER := 0;
  v_is_admin BOOLEAN;
BEGIN
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
  
  -- Get bet details
  SELECT * INTO v_bet
  FROM public.bets
  WHERE id = p_bet_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bet not found');
  END IF;
  
  -- Check if bet can be voided
  IF v_bet.status != 'OPEN' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bet already resolved or voided');
  END IF;
  
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
  
  -- Log admin action
  INSERT INTO public.admin_actions (admin_id, action, target_id, metadata)
  VALUES (v_admin_id, 'VOID_BET', p_bet_id, jsonb_build_object('refunded', v_total_refunded));
  
  RETURN jsonb_build_object('success', true, 'refunded', v_total_refunded);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION void_bet(UUID) TO authenticated;

-- =====================================================
-- FUNCTION: Get Bet Stats (Helper)
-- =====================================================
-- Returns aggregated statistics for a bet
CREATE OR REPLACE FUNCTION get_bet_stats(p_bet_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_pot', COALESCE(SUM(stake), 0),
    'participant_count', COUNT(DISTINCT user_id),
    'for_stake', COALESCE(SUM(CASE WHEN side = 'FOR' THEN stake ELSE 0 END), 0),
    'against_stake', COALESCE(SUM(CASE WHEN side = 'AGAINST' THEN stake ELSE 0 END), 0),
    'for_count', COUNT(CASE WHEN side = 'FOR' THEN 1 END),
    'against_count', COUNT(CASE WHEN side = 'AGAINST' THEN 1 END)
  ) INTO v_stats
  FROM public.bet_entries
  WHERE bet_id = p_bet_id;
  
  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_bet_stats(UUID) TO authenticated;

-- =====================================================
-- FUNCTION: Promote/Demote Admin (Super Admin RPC)
-- =====================================================
CREATE OR REPLACE FUNCTION set_admin_status(
  p_target_user_id UUID,
  p_is_admin BOOLEAN,
  p_is_super_admin BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
  v_admin_id UUID;
  v_is_super_admin BOOLEAN;
BEGIN
  -- Get current user ID
  v_admin_id := auth.uid();
  
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Check if current user is super admin
  SELECT is_super_admin INTO v_is_super_admin
  FROM public.profiles
  WHERE id = v_admin_id;
  
  IF NOT v_is_super_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Super admin access required');
  END IF;
  
  -- Prevent self-demotion
  IF v_admin_id = p_target_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot change your own admin status');
  END IF;
  
  -- Update target user's admin status
  UPDATE public.profiles
  SET is_admin = p_is_admin, is_super_admin = p_is_super_admin
  WHERE id = p_target_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Log admin action
  INSERT INTO public.admin_actions (admin_id, action, target_id, metadata)
  VALUES (v_admin_id, 'SET_ADMIN_STATUS', p_target_user_id, 
          jsonb_build_object('is_admin', p_is_admin, 'is_super_admin', p_is_super_admin));
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION set_admin_status(UUID, BOOLEAN, BOOLEAN) TO authenticated;
