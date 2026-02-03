-- =====================================================
-- REMOVE AUTO STARTER BONUS - Move to approval flow
-- =====================================================
-- This migration removes the automatic starter bonus trigger
-- The bonus is now granted manually when user is approved
-- =====================================================

-- Drop the automatic starter balance trigger
DROP TRIGGER IF EXISTS trigger_grant_starter_balance ON public.profiles;

-- Drop the trigger function (keep as it may be referenced elsewhere)
-- We'll keep the function but won't auto-trigger it
-- The fn_approve_user function will manually grant the starter bonus

COMMENT ON FUNCTION public.grant_starter_balance IS 'DEPRECATED: No longer auto-triggered. Use fn_approve_user instead.';
