-- =====================================================
-- USER APPROVAL SYSTEM - Add status and approval flow
-- =====================================================
-- This migration adds user approval/status management
-- =====================================================

-- Add status column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'PENDING'
CHECK (status IN ('PENDING', 'ACTIVE', 'BANNED'));

-- Add approval tracking columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by_id UUID REFERENCES public.profiles(id);

-- Create index for status lookups
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_pending ON public.profiles(created_at) WHERE status = 'PENDING';

-- Update existing users to be ACTIVE (grandfather existing users)
UPDATE public.profiles SET status = 'ACTIVE' WHERE status = 'PENDING';

-- Ensure admins are always ACTIVE
UPDATE public.profiles SET status = 'ACTIVE' WHERE is_admin = TRUE OR is_super_admin = TRUE;

-- =====================================================
-- FUNCTION: Approve user (grant access + starter bonus)
-- =====================================================
CREATE OR REPLACE FUNCTION public.fn_approve_user(
  p_target_user_id UUID,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_status TEXT;
  v_is_admin BOOLEAN;
  v_starter_exists BOOLEAN;
BEGIN
  -- Check if caller is admin
  SELECT is_admin OR is_super_admin INTO v_is_admin
  FROM profiles WHERE id = p_admin_id;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Get target user status
  SELECT status INTO v_target_status
  FROM profiles WHERE id = p_target_user_id;
  
  IF v_target_status IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  IF v_target_status = 'ACTIVE' THEN
    RAISE EXCEPTION 'User is already active';
  END IF;
  
  IF v_target_status = 'BANNED' THEN
    RAISE EXCEPTION 'Cannot approve a banned user';
  END IF;
  
  -- Update user status to ACTIVE
  UPDATE profiles 
  SET 
    status = 'ACTIVE',
    approved_at = NOW(),
    approved_by_id = p_admin_id,
    updated_at = NOW()
  WHERE id = p_target_user_id;
  
  -- Check if user already has a starter bonus
  SELECT EXISTS(
    SELECT 1 FROM wallet_ledger 
    WHERE user_id = p_target_user_id AND type = 'STARTER'
  ) INTO v_starter_exists;
  
  -- Grant starter bonus if not already given
  IF NOT v_starter_exists THEN
    INSERT INTO wallet_ledger (user_id, amount, type, metadata)
    VALUES (
      p_target_user_id,
      100,
      'STARTER',
      jsonb_build_object('approved_by', p_admin_id, 'approved_at', NOW())
    );
  END IF;
  
  -- Log admin action
  INSERT INTO admin_actions (admin_id, action, target_type, target_id, details)
  VALUES (
    p_admin_id,
    'APPROVE_USER',
    'USER',
    p_target_user_id,
    jsonb_build_object('previous_status', v_target_status)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_target_user_id,
    'status', 'ACTIVE',
    'starter_granted', NOT v_starter_exists
  );
END;
$$;

-- =====================================================
-- FUNCTION: Set user status (admin only)
-- =====================================================
CREATE OR REPLACE FUNCTION public.fn_set_user_status(
  p_target_user_id UUID,
  p_new_status TEXT,
  p_admin_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_old_status TEXT;
  v_target_is_super_admin BOOLEAN;
  v_caller_is_super_admin BOOLEAN;
BEGIN
  -- Validate status
  IF p_new_status NOT IN ('PENDING', 'ACTIVE', 'BANNED') THEN
    RAISE EXCEPTION 'Invalid status: %', p_new_status;
  END IF;
  
  -- Check if caller is admin
  SELECT is_admin OR is_super_admin, is_super_admin 
  INTO v_is_admin, v_caller_is_super_admin
  FROM profiles WHERE id = p_admin_id;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Get target user info
  SELECT status, is_super_admin INTO v_old_status, v_target_is_super_admin
  FROM profiles WHERE id = p_target_user_id;
  
  IF v_old_status IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Prevent changing super admin status unless caller is super admin
  IF v_target_is_super_admin AND NOT v_caller_is_super_admin THEN
    RAISE EXCEPTION 'Cannot change super admin status';
  END IF;
  
  -- Update status
  UPDATE profiles 
  SET 
    status = p_new_status,
    updated_at = NOW()
  WHERE id = p_target_user_id;
  
  -- Log admin action
  INSERT INTO admin_actions (admin_id, action, target_type, target_id, details)
  VALUES (
    p_admin_id,
    CASE p_new_status
      WHEN 'ACTIVE' THEN 'ACTIVATE_USER'
      WHEN 'BANNED' THEN 'BAN_USER'
      WHEN 'PENDING' THEN 'SET_USER_PENDING'
    END,
    'USER',
    p_target_user_id,
    jsonb_build_object('old_status', v_old_status, 'new_status', p_new_status, 'reason', p_reason)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_target_user_id,
    'old_status', v_old_status,
    'new_status', p_new_status
  );
END;
$$;

-- =====================================================
-- Update RLS policies to enforce ACTIVE status
-- =====================================================

-- Drop and recreate bet insert policy to require ACTIVE
DROP POLICY IF EXISTS "bets_insert_authenticated" ON public.bets;
CREATE POLICY "bets_insert_authenticated"
  ON public.bets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    creator_id = auth.uid() AND
    status = 'OPEN' AND
    end_at > NOW() AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'ACTIVE')
  );

-- Update bet entries policies to require ACTIVE
DROP POLICY IF EXISTS "bet_entries_insert_authenticated" ON public.bet_entries;
CREATE POLICY "bet_entries_insert_authenticated"
  ON public.bet_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'ACTIVE')
  );

DROP POLICY IF EXISTS "bet_entries_update_own" ON public.bet_entries;
CREATE POLICY "bet_entries_update_own"
  ON public.bet_entries
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'ACTIVE')
  );

-- Wallet ledger read requires ACTIVE (or keep open for historical data)
-- For now, allow reads but no new entries unless ACTIVE
DROP POLICY IF EXISTS "wallet_ledger_select_own" ON public.wallet_ledger;
CREATE POLICY "wallet_ledger_select_own"
  ON public.wallet_ledger
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );

-- Grant function permissions
GRANT EXECUTE ON FUNCTION public.fn_approve_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_set_user_status TO authenticated;

COMMENT ON FUNCTION public.fn_approve_user IS 'Approves a pending user and grants starter bonus';
COMMENT ON FUNCTION public.fn_set_user_status IS 'Changes user status (PENDING/ACTIVE/BANNED) - admin only';
