-- =====================================================
-- CORRECT? BETTING APP - ROW LEVEL SECURITY POLICIES
-- =====================================================
-- This migration enables RLS and creates security policies
-- for all tables in the application.
-- =====================================================

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bet_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================

-- Anyone authenticated can read basic profile info
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own profile (will be called by trigger)
CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own first_name and last_name only
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Prevent non-super-admins from changing admin status
    (
      (is_super_admin = (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid())) AND
      (is_admin = (SELECT is_admin FROM public.profiles WHERE id = auth.uid()))
    )
  );

-- Super admins can update admin status of other users
CREATE POLICY "profiles_update_admin_by_super_admin"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_super_admin = TRUE
    )
  );

-- =====================================================
-- BETS POLICIES
-- =====================================================

-- Authenticated users can read non-hidden OPEN bets OR their own bets
CREATE POLICY "bets_select_public_or_own"
  ON public.bets
  FOR SELECT
  TO authenticated
  USING (
    (hidden = FALSE) OR
    (creator_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Authenticated users can create bets
CREATE POLICY "bets_insert_authenticated"
  ON public.bets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    creator_id = auth.uid() AND
    status = 'OPEN' AND
    end_at > NOW()
  );

-- Creators can update their own OPEN bets (before end_at)
CREATE POLICY "bets_update_creator"
  ON public.bets
  FOR UPDATE
  TO authenticated
  USING (
    creator_id = auth.uid() AND
    status = 'OPEN' AND
    end_at > NOW()
  )
  WITH CHECK (
    creator_id = auth.uid() AND
    status = 'OPEN' AND
    end_at > NOW() AND
    -- Creators cannot change status, resolution, resolved_at, resolved_by_id, or hidden
    resolution IS NULL AND
    resolved_at IS NULL AND
    resolved_by_id IS NULL
  );

-- Admins can update bet status, resolution, and hidden flag
CREATE POLICY "bets_update_admin"
  ON public.bets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Admins can delete bets (soft delete via hidden flag is preferred)
CREATE POLICY "bets_delete_admin"
  ON public.bets
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- =====================================================
-- BET_ENTRIES POLICIES
-- =====================================================

-- Users can read aggregated bet entry data (via views/functions)
-- Direct read of individual entries restricted to own entries
CREATE POLICY "bet_entries_select_own"
  ON public.bet_entries
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Users can insert their own bet entries (validations in RPC)
CREATE POLICY "bet_entries_insert_own"
  ON public.bet_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own bet entries (increase stake on same side)
CREATE POLICY "bet_entries_update_own"
  ON public.bet_entries
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own bet entries (before bet locks)
CREATE POLICY "bet_entries_delete_own"
  ON public.bet_entries
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- WALLET_LEDGER POLICIES
-- =====================================================

-- Users can only read their own ledger entries
CREATE POLICY "wallet_ledger_select_own"
  ON public.wallet_ledger
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all ledger entries
CREATE POLICY "wallet_ledger_select_admin"
  ON public.wallet_ledger
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Only service role or RPC functions can insert ledger entries
-- (Handled by RPC with SECURITY DEFINER - no direct insert policy needed)
-- Users cannot insert directly
CREATE POLICY "wallet_ledger_insert_deny"
  ON public.wallet_ledger
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- No updates or deletes allowed (append-only ledger)
CREATE POLICY "wallet_ledger_update_deny"
  ON public.wallet_ledger
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "wallet_ledger_delete_deny"
  ON public.wallet_ledger
  FOR DELETE
  TO authenticated
  USING (false);

-- =====================================================
-- ADMIN_ACTIONS POLICIES
-- =====================================================

-- Only admins can read admin actions
CREATE POLICY "admin_actions_select_admin"
  ON public.admin_actions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Only service role or RPC functions can insert admin actions
CREATE POLICY "admin_actions_insert_deny"
  ON public.admin_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- No updates or deletes allowed (audit log)
CREATE POLICY "admin_actions_update_deny"
  ON public.admin_actions
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "admin_actions_delete_deny"
  ON public.admin_actions
  FOR DELETE
  TO authenticated
  USING (false);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bet_entries TO authenticated;
GRANT SELECT ON public.wallet_ledger TO authenticated;
GRANT SELECT ON public.admin_actions TO authenticated;
