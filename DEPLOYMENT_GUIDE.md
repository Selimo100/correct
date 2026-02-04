# Bet Settlement Fix - Deployment Guide

## Overview

This guide walks you through applying the bet settlement fixes to your production Supabase database.

## Files Changed

1. **Database Migration**: `supabase/migrations/020_bet_settlement_fixes.sql`
2. **RPC Functions**: `supabase/migrations/003_functions.sql` (updated)
3. **Admin UI**: `src/app/admin/resolve/[id]/page.tsx` (updated)

## Step 1: Apply Database Migration

### Via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `supabase/migrations/020_bet_settlement_fixes.sql`
5. Click **Run**
6. Verify success: You should see "Success. No rows returned"

### What This Does

- Creates `bet_settlements` table for idempotency tracking
- Fixes RLS policies on `wallet_ledger` and `admin_actions`
- Adds indexes for performance

## Step 2: Update RPC Functions

### Via Supabase Dashboard

1. In **SQL Editor**, create a new query
2. Copy the updated `resolve_bet` function from `supabase/migrations/003_functions.sql` (lines 237-365)
3. Run it
4. Copy the updated `void_bet` function from the same file (lines 373-435)
5. Run it

### What This Does

- Makes `resolve_bet` idempotent (can't double-pay)
- Fixes integer rounding errors in payouts
- Auto-voids bets when no one bet on winning side
- Adds proper error messages
- Sets `search_path` for security

## Step 3: Deploy Code Changes

The Next.js code changes are already in your repository. Deploy them:

```bash
git add .
git commit -m "Fix bet settlement flow with idempotency and proper payout calculation"
git push origin main
```

Netlify will automatically deploy the changes.

## Step 4: Verify the Fix

### Quick Verification

1. Go to your admin dashboard
2. Find a locked bet (ended but not resolved)
3. Click "Resolve"
4. Choose an outcome and submit
5. Verify:
   - ✅ Success message appears
   - ✅ Bet status shows "RESOLVED"
   - ✅ Participants received payouts (check their wallet history)

### Try to Resolve Again

1. Try resolving the same bet again
2. Expected result: "Bet already settled" message
3. No duplicate payouts in wallet ledger

### Comprehensive Testing

Run the SQL queries in `supabase/test_settlement.sql` to verify:

- Settlement records are created
- Payouts sum to exact pot amount
- Idempotency works (no duplicates)
- Auto-void works when no winners
- Wallet balances are correct

## Step 5: Monitor for Issues

After deployment, monitor:

1. **Admin Actions Log**: Check for any settlement errors
2. **Wallet Ledger**: Verify no duplicate payouts
3. **User Reports**: Ask users if payouts are correct

## Rollback Plan (If Needed)

If something goes wrong:

1. **Revert Code**: 
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Database**: The migration is safe and doesn't modify existing data. The new `bet_settlements` table can be dropped if needed:
   ```sql
   DROP TABLE IF EXISTS bet_settlements CASCADE;
   ```

3. **Restore Old Functions**: Re-run the original `resolve_bet` and `void_bet` functions from a backup

## Key Improvements

✅ **Idempotency**: Resolving a bet twice won't create duplicate payouts
✅ **Accurate Payouts**: Integer math with remainder distribution ensures exact pot distribution
✅ **Auto-Void**: Bets with no winners automatically void and refund
✅ **Better Errors**: Clear error messages for admins
✅ **Audit Trail**: `bet_settlements` table tracks all settlements
✅ **Security**: Proper `search_path` and RLS fixes

## Troubleshooting

### "Bet already settled" but bet shows OPEN

- Check `bet_settlements` table for the bet ID
- If a settlement record exists but bet status is wrong, manually update:
  ```sql
  UPDATE bets SET status = 'RESOLVED', resolution = <true/false>, resolved_at = NOW() WHERE id = '<bet_id>';
  ```

### Payouts don't sum to pot

- This should be fixed by the new integer math
- Verify by running the verification query in `test_settlement.sql`
- If still wrong, check the `bet_settlements` table for the actual amounts distributed

### RPC returns "permission denied"

- Verify RLS policies were updated correctly
- Check that `wallet_ledger_insert_deny` policy was dropped
- Ensure functions have `SECURITY DEFINER`

## Need Help?

If you encounter issues:

1. Check the `admin_actions` table for error details
2. Run the verification queries in `test_settlement.sql`
3. Review Supabase logs for RPC errors
4. Contact support with bet ID and error message
