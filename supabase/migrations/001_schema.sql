-- =====================================================
-- CORRECT? BETTING APP - DATABASE SCHEMA
-- =====================================================
-- This migration creates all tables, constraints, and indexes
-- for the Correct? betting application.
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: profiles
-- =====================================================
-- Stores user profile information with computed username
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE NOT NULL,
  is_super_admin BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for username lookups
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_admin ON public.profiles(is_admin) WHERE is_admin = TRUE;

-- =====================================================
-- TABLE: bets
-- =====================================================
-- Stores betting statements and their metadata
CREATE TABLE IF NOT EXISTS public.bets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 200),
  description TEXT,
  category TEXT,
  end_at TIMESTAMPTZ NOT NULL CHECK (end_at > created_at),
  max_participants INTEGER CHECK (max_participants IS NULL OR max_participants > 0),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED', 'VOID')),
  resolution BOOLEAN,
  resolved_at TIMESTAMPTZ,
  resolved_by_id UUID REFERENCES public.profiles(id),
  hidden BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT valid_resolution CHECK (
    (status = 'RESOLVED' AND resolution IS NOT NULL AND resolved_at IS NOT NULL AND resolved_by_id IS NOT NULL) OR
    (status != 'RESOLVED' AND resolution IS NULL)
  )
);

-- Indexes for bet queries
CREATE INDEX idx_bets_creator ON public.bets(creator_id);
CREATE INDEX idx_bets_status ON public.bets(status);
CREATE INDEX idx_bets_end_at ON public.bets(end_at);
CREATE INDEX idx_bets_category ON public.bets(category) WHERE category IS NOT NULL;
CREATE INDEX idx_bets_hidden ON public.bets(hidden) WHERE hidden = FALSE;
CREATE INDEX idx_bets_created_at ON public.bets(created_at DESC);

-- =====================================================
-- TABLE: bet_entries
-- =====================================================
-- Stores user stakes on bets
CREATE TABLE IF NOT EXISTS public.bet_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bet_id UUID NOT NULL REFERENCES public.bets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('FOR', 'AGAINST')),
  stake INTEGER NOT NULL CHECK (stake > 0),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(bet_id, user_id)
);

-- Indexes for bet entries
CREATE INDEX idx_bet_entries_bet ON public.bet_entries(bet_id);
CREATE INDEX idx_bet_entries_user ON public.bet_entries(user_id);
CREATE INDEX idx_bet_entries_side ON public.bet_entries(bet_id, side);

-- =====================================================
-- TABLE: wallet_ledger
-- =====================================================
-- Append-only ledger for all Neo transactions
CREATE TABLE IF NOT EXISTS public.wallet_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Signed integer: positive for credits, negative for debits
  type TEXT NOT NULL CHECK (type IN ('STARTER', 'BET_STAKE', 'BET_PAYOUT', 'BET_REFUND', 'FEE', 'ADMIN_ADJUSTMENT')),
  bet_id UUID REFERENCES public.bets(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for ledger queries
CREATE INDEX idx_wallet_ledger_user ON public.wallet_ledger(user_id, created_at DESC);
CREATE INDEX idx_wallet_ledger_type ON public.wallet_ledger(type);
CREATE INDEX idx_wallet_ledger_bet ON public.wallet_ledger(bet_id) WHERE bet_id IS NOT NULL;

-- =====================================================
-- TABLE: admin_actions
-- =====================================================
-- Audit log for admin activities
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for admin action queries
CREATE INDEX idx_admin_actions_admin ON public.admin_actions(admin_id);
CREATE INDEX idx_admin_actions_created ON public.admin_actions(created_at DESC);
CREATE INDEX idx_admin_actions_target ON public.admin_actions(target_id) WHERE target_id IS NOT NULL;

-- =====================================================
-- TRIGGERS: updated_at
-- =====================================================
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bets_updated_at
  BEFORE UPDATE ON public.bets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bet_entries_updated_at
  BEFORE UPDATE ON public.bet_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.profiles IS 'User profiles with computed username';
COMMENT ON TABLE public.bets IS 'Betting statements with lifecycle management';
COMMENT ON TABLE public.bet_entries IS 'User stakes on bets (one entry per user per bet)';
COMMENT ON TABLE public.wallet_ledger IS 'Append-only ledger for all Neo transactions';
COMMENT ON TABLE public.admin_actions IS 'Audit log for administrative actions';
