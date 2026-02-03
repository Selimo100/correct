# Quick Start Guide - Correct?

Get up and running with Correct? in 10 minutes!

## 1. Install Dependencies (1 min)

```bash
npm install
```

## 2. Set Up Supabase (3 min)

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to initialize
3. Go to **SQL Editor** in the Supabase dashboard
4. Run these migrations in order:
   - Copy/paste contents of `supabase/migrations/001_schema.sql` → Execute
   - Copy/paste contents of `supabase/migrations/002_rls_policies.sql` → Execute
   - Copy/paste contents of `supabase/migrations/003_functions.sql` → Execute
   - Copy/paste contents of `supabase/migrations/004_bootstrap_admin.sql` → Execute

## 3. Get Supabase Keys (1 min)

In Supabase dashboard:
1. Go to **Settings** → **API**
2. Copy your **Project URL**
3. Copy your **anon public** key
4. Copy your **service_role** key (⚠️ keep this secret!)

## 4. Configure Environment (1 min)

Create `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 5. Start Development Server (30 sec)

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 6. Create Your Admin Account (1 min)

1. Click **Sign Up**
2. Use email: `selina@mogicato.ch`
3. Choose any password
4. Enter first name: `Selina`, last name: `M`
5. Sign up

You're now a super admin! 👑

## 7. Test the App (3 min)

### Create a test bet:
1. Click **Create Bet**
2. Title: "Bitcoin will reach $100k by EOY 2026"
3. Set end date to tomorrow
4. Click **Create Bet**

### Place a stake:
1. Click on your bet
2. Choose **FOR** or **AGAINST**
3. Enter amount (you have 100 Neos)
4. Click **Place Stake**

### Check your wallet:
1. Click **Wallet** in the navigation
2. See your balance (100 - stake amount)
3. View transaction history

### Try admin features:
1. Click **Admin** in the navigation
2. See your bet in pending resolutions (after it ends)
3. Explore user management

## Common Issues

### "relation does not exist"
- Make sure you ran all 4 migration files
- Check they executed without errors

### "Unauthorized" errors
- Verify your `.env.local` file has correct keys
- Restart the dev server after changing env vars

### Username not auto-generated
- Check trigger was created: Go to Supabase → Database → Triggers
- Should see `trigger_set_profile_username` on profiles table

### Balance is 0 after signup
- Check `wallet_ledger` table has a STARTER entry
- Verify `trigger_grant_starter_balance` exists

## Next Steps

- Invite friends to test
- Create interesting bets
- Try resolving bets as admin
- Read the full [README.md](README.md) for details
- Check [DEPLOYMENT.md](DEPLOYMENT.md) when ready to deploy

## Need Help?

Check these resources:
- [README.md](README.md) - Full documentation
- [supabase/SETUP.sql](supabase/SETUP.sql) - Troubleshooting queries
- Supabase logs - See errors in real-time

---

**Happy betting! 🎲**
