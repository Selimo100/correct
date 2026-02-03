-- =====================================================
-- SUPABASE SETUP INSTRUCTIONS
-- =====================================================
-- Follow these steps to set up your Supabase database
-- =====================================================

-- Step 1: Create a new Supabase project at https://supabase.com

-- Step 2: Run the migrations in order:
-- 1. Execute 001_schema.sql
-- 2. Execute 002_rls_policies.sql
-- 3. Execute 003_functions.sql
-- 4. Execute 004_bootstrap_admin.sql

-- Step 3: Verify the setup by running these queries:

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE';

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check if functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_type = 'FUNCTION';

-- Step 4: Test the bootstrap admin function
-- (Optional) Manually run if selina@mogicato.ch already exists
SELECT rpc_bootstrap_super_admin();

-- Step 5: Verify super admin
SELECT id, username, is_admin, is_super_admin 
FROM public.profiles 
WHERE is_super_admin = true;

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================

-- If username generation fails, check the trigger:
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE event_object_schema = 'public' 
  AND event_object_table = 'profiles';

-- If starter balance not granted, check:
SELECT * FROM public.wallet_ledger WHERE type = 'STARTER';

-- To manually grant starter balance:
INSERT INTO public.wallet_ledger (user_id, amount, type, metadata)
VALUES ('user-uuid-here', 100, 'STARTER', '{"reason": "Manual grant"}');

-- To manually set super admin:
UPDATE public.profiles 
SET is_admin = true, is_super_admin = true 
WHERE id = 'user-uuid-here';

-- =====================================================
-- TESTING QUERIES
-- =====================================================

-- Test get_balance function
SELECT get_balance('user-uuid-here');

-- Test get_bet_stats function
SELECT get_bet_stats('bet-uuid-here');

-- View all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- MAINTENANCE QUERIES
-- =====================================================

-- Count users by admin status
SELECT 
  COUNT(*) FILTER (WHERE is_super_admin) as super_admins,
  COUNT(*) FILTER (WHERE is_admin AND NOT is_super_admin) as admins,
  COUNT(*) FILTER (WHERE NOT is_admin) as regular_users
FROM public.profiles;

-- Summary of bets by status
SELECT status, COUNT(*) as count, SUM(COALESCE((SELECT total_pot FROM get_bet_stats(id)), 0)) as total_pot
FROM public.bets
GROUP BY status;

-- Top users by balance
SELECT p.username, get_balance(p.id) as balance
FROM public.profiles p
ORDER BY balance DESC
LIMIT 10;

-- Recent transactions
SELECT 
  p.username,
  wl.amount,
  wl.type,
  wl.created_at,
  b.title as bet_title
FROM public.wallet_ledger wl
JOIN public.profiles p ON p.id = wl.user_id
LEFT JOIN public.bets b ON b.id = wl.bet_id
ORDER BY wl.created_at DESC
LIMIT 20;
