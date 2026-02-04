-- =====================================================
-- BET SETTLEMENT FIXES - Migration 020
-- =====================================================
-- This migration fixes critical issues in bet settlement:
-- 1. Adds bet_settlements table for idempotency
-- 2. Fixes wallet_ledger RLS to allow SECURITY DEFINER inserts
-- 3. Adds missing indexes for performance
-- 4. Updates constraints for data integrity
-- =====================================================

-- =====================================================
-- TABLE: bet_settlements
-- =====================================================
-- Tracks all bet settlements for idempotency and audit
CREATE TABLE IF NOT EXISTS public.bet_settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bet_id UUID NOT NULL UNIQUE REFERENCES public.bets(id) ON DELETE CASCADE,
  outcome BOOLEAN, -- NULL for VOID, TRUE for FOR wins, FALSE for AGAINST wins
  total_pot INTEGER NOT NULL DEFAULT 0,
  winners_total INTEGER NOT NULL DEFAULT 0,
  fee_amount INTEGER NOT NULL DEFAULT 0,
  payout_count INTEGER NOT NULL DEFAULT 0,
  settled_by_id UUID NOT NULL REFERENCES public.profiles(id),
  settled_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  metadata JSONB
);

-- Index for settlement queries
CREATE INDEX idx_bet_settlements_bet_id ON public.bet_settlements(bet_id);
CREATE INDEX idx_bet_settlements_settled_at ON public.bet_settlements(settled_at DESC);
CREATE INDEX idx_bet_settlements_settled_by ON public.bet_settlements(settled_by_id);

-- =====================================================
-- FIX: wallet_ledger RLS Policies
-- =====================================================
-- The existing policy blocks ALL inserts, even from SECURITY DEFINER functions
-- We need to allow inserts from RPC functions while still blocking direct user inserts

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "wallet_ledger_insert_deny" ON public.wallet_ledger;

-- Create a new policy that allows inserts only when NOT called directly by users
-- SECURITY DEFINER functions run with the function owner's privileges, bypassing RLS
-- So we don't need an explicit INSERT policy - the SECURITY DEFINER handles it
-- But we still want to block direct user inserts via the API

-- No INSERT policy means only service_role and SECURITY DEFINER functions can insert
-- This is the correct approach for an append-only ledger

-- =====================================================
-- FIX: admin_actions RLS Policies
-- =====================================================
-- Same issue - need to allow SECURITY DEFINER functions to insert

DROP POLICY IF EXISTS "admin_actions_insert_deny" ON public.admin_actions;

-- =====================================================
-- RLS POLICIES: bet_settlements
-- =====================================================
-- Enable RLS on the new table
ALTER TABLE public.bet_settlements ENABLE ROW LEVEL SECURITY;

-- Admins can read all settlements
CREATE POLICY "bet_settlements_select_admin"
  ON public.bet_settlements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- No direct INSERT/UPDATE/DELETE - only via RPC functions
-- (No policies needed - SECURITY DEFINER functions bypass RLS)

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT SELECT ON public.bet_settlements TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.bet_settlements IS 'Tracks all bet settlements for idempotency and audit trail';
COMMENT ON COLUMN public.bet_settlements.outcome IS 'NULL for VOID, TRUE for FOR wins, FALSE for AGAINST wins';
COMMENT ON COLUMN public.bet_settlements.bet_id IS 'UNIQUE constraint ensures each bet can only be settled once';
