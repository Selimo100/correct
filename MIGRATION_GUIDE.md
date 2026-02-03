# Migration Guide

The following changes have been made to the system. You must run these migration SQL files in your Supabase SQL Editor to apply the changes.

## 1. User Approval System (Priority)

Run `supabase/migrations/005_user_approval_system.sql`.

- Adds `status` column (PENDING/ACTIVE/BANNED).
- Updates existing users to ACTIVE.
- **IMPORTANT:** If you are the admin and get locked out, ensure this migration is run. If you are still locked out, run:
  ```sql
  UPDATE public.profiles SET status = 'ACTIVE' WHERE username = 'your_username';
  ```

## 2. Categories System

Run `supabase/migrations/007_categories_system.sql`.

- Creates `categories` table.
- Seeds default categories (Love, Sunrise, School, Random).
- Adds `category_id` to bets.

## 3. Search & Filters

Run `supabase/migrations/008_search_and_filters.sql`.

- Adds Full Text Search (tsvector) column to bets.
- Adds `fn_search_bets` RPC function for filtering and searching.

## 4. Comments & Reports (Database Layer)

Run `supabase/migrations/009_comments_and_reports.sql`.

- Creates `comments` and `comment_reports` tables.
- Adds RLS policies for comments.
- Adds `fn_create_comment` RPC.

## 5. Admin Actions Schema Fix (CRITICAL)

Run `supabase/migrations/010_fix_admin_actions_schema.sql`.

- Updates `admin_actions` table to match application code.
- Adds `target_type` column.
- Renames `metadata` to `details`.
- **Fixes** errors when approving, banning, or rejecting users.

## Environment Variables

Ensure your `.env.local` contains:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...  # Required for "Delete/Reject User" functionality
```

After applying migrations, restart your development server:

```bash
npm run dev
```
