# User Approval System - Setup Instructions

## ⚠️ IMPORTANT: Database Migration Required

The user approval system has been implemented but **requires running database migrations** in your Supabase project.

## Step 1: Run Migrations in Supabase

You need to run these migration files in order in your Supabase SQL Editor:

1. `supabase/migrations/005_user_approval_system.sql` - Adds status column and approval functions
2. `supabase/migrations/006_remove_auto_starter_bonus.sql` - Removes automatic 100 Neos grant
3. `supabase/migrations/007_categories_system.sql` - Adds categories table and seeds defaults

### How to run migrations:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of `005_user_approval_system.sql`
5. Paste and click **Run**
6. Repeat for files 006 and 007

**OR** use the Supabase CLI:

```bash
# If you have Supabase CLI installed
supabase db push
```

## Step 2: Add Service Role Key to Environment

Make sure your `.env.local` file has the service role key (needed for deleting users):

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key  # ← ADD THIS
```

Get your service role key from:

- Supabase Dashboard → Settings → API → `service_role` key (secret)

⚠️ **NEVER commit this key to git or expose it to the client!**

## Step 3: Restart Your Dev Server

```bash
npm run dev
```

## How It Works

### New User Registration Flow:

1. User signs up with email/password
2. Profile is created with `status = 'PENDING'`
3. User is redirected to `/approval` page (waiting screen)
4. User **cannot** access any app features until approved
5. No starter 100 Neos are granted yet

### Admin Approval Flow:

1. Admin goes to `/admin/users`
2. Sees list of pending users at the top
3. Clicks **Approve** button:
   - Sets user status to `ACTIVE`
   - Grants 100 Neos starter bonus (one-time only)
   - Logs admin action
4. OR clicks **Reject** button:
   - Deletes user's auth account
   - Removes profile (cascade deletes related data)
   - Logs admin action

### User Status Types:

- `PENDING` - Waiting for admin approval (default for new signups)
- `ACTIVE` - Approved user with full access
- `BANNED` - Blocked user (can still log in but sees ban message)

### Admin Actions Available:

- **Approve** - Activate pending user + grant starter bonus
- **Reject** - Permanently delete user account
- **Ban** - Block active user (soft delete, can be unbanned)
- **Unban** - Restore banned user to active
- **Make Admin** - Promote user to admin role
- **Remove Admin** - Demote admin to regular user

## Existing Users

If you ran the migrations on an existing database:

- **Existing users** are automatically set to `ACTIVE` (grandfathered)
- **Admins** are always `ACTIVE` (required)
- **New signups** after migration will be `PENDING`

## Testing

1. **Test new signup:**

   ```
   - Sign out if logged in
   - Go to /auth/sign-up
   - Create new account
   - Should redirect to /approval page
   - Should see "Waiting for Approval" message
   ```

2. **Test admin approval:**

   ```
   - Log in as admin (selina@mogicato.ch)
   - Go to /admin/users
   - Should see pending user in yellow section
   - Click "Approve"
   - User should now be in "Active Users" section
   - User can now log in and use the app
   ```

3. **Test rejection:**
   ```
   - Create another test account
   - As admin, click "Reject" on pending user
   - User account should be deleted
   - User cannot log in anymore
   ```

## Troubleshooting

### "No users showing in admin panel"

- ✅ Make sure you ran the migrations
- ✅ Check browser console for errors
- ✅ Verify you're logged in as admin
- ✅ Try refreshing the page

### "Users can still log in directly after signup"

- ✅ Migrations not run yet (status column doesn't exist)
- ✅ Restart dev server after running migrations
- ✅ Clear browser cookies and try again

### "Reject button doesn't work"

- ✅ Service role key not in .env.local
- ✅ Restart dev server after adding key
- ✅ Check server logs for errors

### "Database error about status column"

- ✅ Migration 005 not run yet
- ✅ Run it in Supabase SQL Editor

## Security Notes

✅ **PENDING users cannot:**

- Create bets
- Place stakes
- Comment (when implemented)
- Access wallet features
- See main app pages

✅ **Only admins can:**

- Approve/reject users
- Ban/unban users
- Delete user accounts
- Manage categories (when implemented)

✅ **RLS policies enforce:**

- All write operations require `ACTIVE` status
- Admins bypass status checks for admin routes
- Service role key never exposed to client

## Next Steps

After getting approval working:

1. Test thoroughly with multiple user accounts
2. Implement categories admin UI
3. Add search and filters
4. Implement comments system
5. Add notifications

## Questions?

Check the main documentation files:

- README.md - Full project overview
- DEVELOPMENT.md - Developer workflows
- PROJECT_SUMMARY.md - Feature checklist
