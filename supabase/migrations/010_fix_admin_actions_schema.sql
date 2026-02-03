-- =====================================================
-- FIX ADMIN ACTIONS SCHEMA
-- =====================================================
-- This migration fixes the admin_actions table to match
-- the schema expected by the application code and RPCs.
-- =====================================================

-- 1. Rename metadata to details (to match code usage in 005_user_approval_system.sql and page code)
-- Check if column exists before renaming to avoid errors if already renamed
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_actions' AND column_name = 'metadata') THEN
    ALTER TABLE public.admin_actions RENAME COLUMN metadata TO details;
  END IF;
END $$;

-- 2. Add target_type column
-- Check if column exists before adding
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_actions' AND column_name = 'target_type') THEN
    ALTER TABLE public.admin_actions ADD COLUMN target_type TEXT;
  END IF;
END $$;

-- 3. Update comments
COMMENT ON COLUMN public.admin_actions.target_type IS 'Type of the target entity (USER, BET, etc.)';
COMMENT ON COLUMN public.admin_actions.details IS 'JSON details about the action';
