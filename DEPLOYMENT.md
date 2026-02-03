# Correct? - Deployment Checklist

## Pre-Deployment

### Supabase Setup
- [ ] Create Supabase project
- [ ] Run all 4 migration files in order
- [ ] Verify RLS is enabled on all tables
- [ ] Test all RPC functions work
- [ ] Confirm triggers are active
- [ ] Test bootstrap admin with selina@mogicato.ch

### Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (server only!)
- [ ] `NEXT_PUBLIC_APP_URL` set to production URL

### Code Review
- [ ] No console.logs in production code
- [ ] All error handling in place
- [ ] Service role key never exposed to client
- [ ] All API routes have auth checks
- [ ] RLS policies tested

## Netlify Deployment

### Initial Setup
1. Connect repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `.next`
4. Add environment variables
5. Deploy!

### Post-Deployment
- [ ] Test sign up flow
- [ ] Test sign in flow
- [ ] Verify starter balance (100 Neos)
- [ ] Test username generation
- [ ] Test creating a bet
- [ ] Test placing a stake
- [ ] Test admin access
- [ ] Test bet resolution
- [ ] Test bet voiding
- [ ] Test user management

## Production Testing Script

### User Flow
1. Sign up with new email
2. Check wallet has 100 Neos
3. Create a bet
4. Place stake on the bet
5. Check balance decreased
6. Wait for bet to end (or manually set past date in DB)
7. Admin resolves bet
8. Check payout received

### Admin Flow
1. Sign in as selina@mogicato.ch
2. Verify super admin badge appears
3. Navigate to /admin
4. Create test bet that already ended
5. Resolve the bet
6. Verify payouts distributed
7. Create another bet
8. Void it
9. Verify refunds processed
10. Go to /admin/users
11. Promote a test user to admin
12. Verify they can access /admin

### Edge Cases
- [ ] Try placing stake with insufficient balance
- [ ] Try placing stake after bet ended
- [ ] Try switching sides (should be blocked)
- [ ] Try creating bet with past end date
- [ ] Try resolving bet before it ends
- [ ] Try accessing admin as non-admin
- [ ] Test username duplicate handling

## Monitoring

### Check These Regularly
- Error logs in Netlify
- Supabase logs for RLS violations
- Admin actions audit log
- User growth and engagement
- Bet resolution turnaround time

## Rollback Plan

If something goes wrong:
1. Revert to previous Netlify deployment
2. Check Supabase for data integrity
3. Review admin actions log
4. Manually refund if needed using admin adjustments

## Success Criteria

- [ ] Users can sign up and receive 100 Neos
- [ ] Bets can be created and stakes placed
- [ ] Admins can resolve/void bets correctly
- [ ] Payouts calculated and distributed accurately
- [ ] All RLS policies working
- [ ] No unauthorized access possible
- [ ] Username generation working with duplicates
- [ ] Mobile responsive
- [ ] Fast page loads (<2s)

## Known Issues

Document any known issues or limitations here:

- 

## Future Enhancements

- Bet categories filter on homepage
- Search functionality
- Leaderboards
- User reputation system
- Bet comments/discussion
- Email notifications
- Dark mode
- Profile avatars
- Social sharing
