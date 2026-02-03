# Development Guide

## Local Development

### Start Development Server
```bash
npm run dev
```

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

### Building for Production
```bash
npm run build
npm start
```

## Common Development Tasks

### Adding a New Page

1. Create the file in `src/app/`
2. Export a default async function component
3. Use `createClient()` from `@/lib/supabase/server` for data
4. Use server actions for mutations

Example:
```typescript
import { createClient } from '@/lib/supabase/server'

export default async function MyPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('table').select('*')
  
  return <div>{/* Your JSX */}</div>
}
```

### Adding a New Component

1. Create file in `src/components/`
2. Export default function
3. Use TypeScript for props
4. Add `'use client'` if it needs interactivity

Example:
```typescript
'use client'

interface MyComponentProps {
  title: string
}

export default function MyComponent({ title }: MyComponentProps) {
  return <div>{title}</div>
}
```

### Adding a Server Action

In a Server Component file:
```typescript
async function myAction(formData: FormData) {
  'use server'
  
  const supabase = await createClient()
  // ... perform action
  
  revalidatePath('/path')
}

export default async function MyPage() {
  return (
    <form action={myAction}>
      {/* form fields */}
    </form>
  )
}
```

### Adding an API Route

Create `src/app/api/[name]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // ... handle request
  
  return NextResponse.json({ success: true })
}
```

### Adding a Database Function

1. Create SQL file in `supabase/migrations/`
2. Write the function with `SECURITY DEFINER` if needed
3. Grant execute to `authenticated`
4. Run in Supabase SQL Editor

Example:
```sql
CREATE OR REPLACE FUNCTION my_function(p_param TEXT)
RETURNS JSONB AS $$
BEGIN
  -- Your logic here
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION my_function(TEXT) TO authenticated;
```

## Database Development

### Testing Queries Locally

Use Supabase SQL Editor:
```sql
-- Test a function
SELECT my_function('test-param');

-- Check data
SELECT * FROM profiles LIMIT 5;

-- Verify RLS
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-uuid-here';
SELECT * FROM profiles; -- Should only see allowed rows
```

### Adding a New Table

1. Add to migration SQL file
2. Create table with constraints
3. Add indexes
4. Enable RLS
5. Add policies
6. Update TypeScript types

### Modifying Existing Data

Use admin functions or manual SQL:
```sql
-- Update a user's balance (admin only)
INSERT INTO wallet_ledger (user_id, amount, type, metadata)
VALUES ('user-uuid', 50, 'ADMIN_ADJUSTMENT', '{"reason": "Compensation"}');

-- Fix a bet
UPDATE bets SET status = 'VOID' WHERE id = 'bet-uuid';
```

## Debugging

### Check Supabase Logs

Go to Supabase Dashboard → Logs:
- Database logs (SQL errors)
- API logs (request errors)
- Auth logs (login issues)

### Debug RLS Issues

```sql
-- See which policies exist
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Test as specific user
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-uuid-here';
SELECT * FROM bets; -- See what this user can access
```

### Debug Auth Issues

In your code:
```typescript
const { data: { user }, error } = await supabase.auth.getUser()
console.log('User:', user, 'Error:', error)
```

### Check Balance Issues

```sql
-- See user's ledger
SELECT * FROM wallet_ledger WHERE user_id = 'user-uuid' ORDER BY created_at DESC;

-- Calculate balance manually
SELECT SUM(amount) FROM wallet_ledger WHERE user_id = 'user-uuid';

-- Compare to function
SELECT get_balance('user-uuid');
```

## Testing Checklist

Before pushing changes:

- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No console.logs left in code
- [ ] Service role key not exposed
- [ ] RLS policies tested
- [ ] Auth guards on protected pages
- [ ] Server actions have auth checks
- [ ] Error handling in place
- [ ] Edge cases considered

## Code Style

### TypeScript
- Use explicit types for function parameters
- Avoid `any` - use proper types
- Use interfaces for objects with known shape

### React
- Prefer Server Components by default
- Use `'use client'` only when needed
- Keep components small and focused
- Extract reusable logic to functions

### Tailwind
- Use utility classes
- Group related classes (layout, colors, spacing)
- Use responsive prefixes (`sm:`, `md:`, `lg:`)
- Prefer semantic grouping

### SQL
- Use meaningful function names
- Add comments for complex logic
- Use transactions for multi-step operations
- Always validate inputs in functions

## Performance Tips

### Server Components
- Fetch data in parallel when possible
- Use `Promise.all()` for independent queries
- Avoid fetching in loops

### Client Components
- Minimize use of client components
- Use React.memo() for expensive renders
- Debounce input handlers
- Lazy load heavy components

### Database
- Add indexes on frequently queried columns
- Avoid N+1 queries
- Use `select('*')` sparingly - specify columns
- Cache expensive calculations

## Useful Supabase Queries

### See all bets with stats
```typescript
const { data } = await supabase
  .from('bets')
  .select(`
    *,
    profiles!bets_creator_id_fkey(username)
  `)
  .order('created_at', { ascending: false })

// Then fetch stats for each
for (const bet of data) {
  const { data: stats } = await supabase.rpc('get_bet_stats', { p_bet_id: bet.id })
  bet.stats = stats
}
```

### Get user's bets
```typescript
const { data } = await supabase
  .from('bets')
  .select('*')
  .eq('creator_id', userId)
```

### Get user's entries
```typescript
const { data } = await supabase
  .from('bet_entries')
  .select(`
    *,
    bets(title, status, end_at)
  `)
  .eq('user_id', userId)
```

## Troubleshooting Common Errors

### "Failed to fetch"
- Check network connection
- Verify Supabase URL is correct
- Check if Supabase project is active

### "JWT expired"
- Middleware should handle this automatically
- Force sign out and sign in again

### "Row Level Security policy violation"
- Check if user is authenticated
- Verify policies allow the operation
- Test policy with SQL directly

### "Function does not exist"
- Ensure migration was run
- Check function name spelling
- Verify it was granted to authenticated role

### "Insufficient balance"
- Check `get_balance()` returns correct value
- Verify ledger entries are correct
- Look for missing STARTER entry

## Git Workflow

1. Create a feature branch
2. Make changes
3. Test locally
4. Commit with descriptive message
5. Push to remote
6. Create pull request
7. Review and merge

## Need Help?

- Check [README.md](README.md) for architecture
- Check [STRUCTURE.md](STRUCTURE.md) for file organization
- Check [supabase/SETUP.sql](supabase/SETUP.sql) for SQL queries
- Check Supabase docs: https://supabase.com/docs
- Check Next.js docs: https://nextjs.org/docs
