-- =====================================================
-- BET SETTLEMENT VERIFICATION TESTS
-- =====================================================
-- Run these tests after applying migration 020
-- to verify the settlement system works correctly
-- =====================================================

-- SETUP: Create test users and bet
-- =====================================================

-- 1. Verify bet_settlements table exists
SELECT COUNT(*) as settlement_table_exists 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'bet_settlements';
-- Expected: 1

-- 2. Check RLS policies on wallet_ledger
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'wallet_ledger' AND policyname = 'wallet_ledger_insert_deny';
-- Expected: 0 rows (policy should be dropped)

-- 3. Check RLS policies on admin_actions
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'admin_actions' AND policyname = 'admin_actions_insert_deny';
-- Expected: 0 rows (policy should be dropped)

-- =====================================================
-- TEST 1: Normal Resolution (FOR wins)
-- =====================================================

-- Find a locked bet with stakes on both sides
SELECT 
  b.id,
  b.title,
  b.status,
  b.end_at,
  (SELECT COUNT(*) FROM bet_entries WHERE bet_id = b.id AND side = 'FOR') as for_count,
  (SELECT COUNT(*) FROM bet_entries WHERE bet_id = b.id AND side = 'AGAINST') as against_count,
  (SELECT SUM(stake) FROM bet_entries WHERE bet_id = b.id) as total_pot
FROM bets b
WHERE b.status = 'OPEN' 
  AND b.end_at < NOW()
  AND EXISTS (SELECT 1 FROM bet_entries WHERE bet_id = b.id AND side = 'FOR')
  AND EXISTS (SELECT 1 FROM bet_entries WHERE bet_id = b.id AND side = 'AGAINST')
LIMIT 1;

-- Use the bet ID from above and resolve it via the admin UI
-- Then verify:

-- Check settlement record was created
SELECT * FROM bet_settlements WHERE bet_id = '<BET_ID>';
-- Expected: 1 row with outcome = true/false

-- Check wallet ledger entries
SELECT 
  user_id,
  amount,
  type,
  metadata
FROM wallet_ledger 
WHERE bet_id = '<BET_ID>' 
  AND type IN ('BET_PAYOUT', 'FEE')
ORDER BY created_at;

-- Verify payout sum equals pot minus fee
SELECT 
  (SELECT SUM(stake) FROM bet_entries WHERE bet_id = '<BET_ID>') as total_pot,
  (SELECT SUM(amount) FROM wallet_ledger WHERE bet_id = '<BET_ID>' AND type = 'BET_PAYOUT') as total_payouts,
  (SELECT COALESCE(SUM(amount), 0) FROM wallet_ledger WHERE bet_id = '<BET_ID>' AND type = 'FEE') as total_fees,
  (SELECT SUM(stake) FROM bet_entries WHERE bet_id = '<BET_ID>') - 
  (SELECT SUM(amount) FROM wallet_ledger WHERE bet_id = '<BET_ID>' AND type = 'BET_PAYOUT') -
  (SELECT COALESCE(SUM(amount), 0) FROM wallet_ledger WHERE bet_id = '<BET_ID>' AND type = 'FEE') as difference;
-- Expected: difference = 0 (exact match)

-- =====================================================
-- TEST 2: Idempotency (Try resolving same bet twice)
-- =====================================================

-- Try resolving the same bet again via admin UI
-- Expected result: "Bet already settled" message
-- No new ledger entries should be created

-- Verify no duplicate ledger entries
SELECT COUNT(*) as payout_count
FROM wallet_ledger 
WHERE bet_id = '<BET_ID>' AND type = 'BET_PAYOUT';
-- Expected: Same count as before (no duplicates)

-- =====================================================
-- TEST 3: Auto-Void (No winners)
-- =====================================================

-- Find a bet with stakes only on one side
SELECT 
  b.id,
  b.title,
  (SELECT COUNT(*) FROM bet_entries WHERE bet_id = b.id AND side = 'FOR') as for_count,
  (SELECT COUNT(*) FROM bet_entries WHERE bet_id = b.id AND side = 'AGAINST') as against_count
FROM bets b
WHERE b.status = 'OPEN' 
  AND b.end_at < NOW()
  AND (
    (NOT EXISTS (SELECT 1 FROM bet_entries WHERE bet_id = b.id AND side = 'FOR')) OR
    (NOT EXISTS (SELECT 1 FROM bet_entries WHERE bet_id = b.id AND side = 'AGAINST'))
  )
LIMIT 1;

-- Resolve this bet choosing the side with NO stakes
-- Expected: Bet should auto-void and refund all stakes

-- Verify bet was voided
SELECT status, resolution FROM bets WHERE id = '<BET_ID>';
-- Expected: status = 'VOID', resolution = NULL

-- Verify refunds were issued
SELECT 
  user_id,
  amount,
  type,
  metadata
FROM wallet_ledger 
WHERE bet_id = '<BET_ID>' AND type = 'BET_REFUND';
-- Expected: One refund per participant

-- Verify settlement record shows void
SELECT outcome, metadata FROM bet_settlements WHERE bet_id = '<BET_ID>';
-- Expected: outcome = NULL, metadata contains 'auto voided'

-- =====================================================
-- TEST 4: Manual Void
-- =====================================================

-- Find an open bet
SELECT id, title FROM bets WHERE status = 'OPEN' LIMIT 1;

-- Void it via admin UI
-- Expected: All stakes refunded

-- Verify refunds
SELECT COUNT(*) as refund_count
FROM wallet_ledger 
WHERE bet_id = '<BET_ID>' AND type = 'BET_REFUND';
-- Expected: Equals number of participants

-- =====================================================
-- TEST 5: Wallet Balance Integrity
-- =====================================================

-- For each user who participated in resolved bets,
-- verify their balance matches the ledger sum

SELECT 
  p.id,
  p.username,
  (SELECT SUM(amount) FROM wallet_ledger WHERE user_id = p.id) as calculated_balance,
  get_balance(p.id) as function_balance
FROM profiles p
WHERE EXISTS (SELECT 1 FROM bet_entries WHERE user_id = p.id)
LIMIT 10;
-- Expected: calculated_balance = function_balance for all users

-- =====================================================
-- CLEANUP (Optional)
-- =====================================================

-- If you created test bets, you can clean them up:
-- DELETE FROM bets WHERE id IN ('<TEST_BET_ID_1>', '<TEST_BET_ID_2>');
-- Note: This will cascade delete entries, ledger records, and settlements
