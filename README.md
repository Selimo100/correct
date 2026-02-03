# Correct? - Statement-based Betting Platform

**Correct?** is a full-stack web application for placing bets on measurable statements using an internal currency called **Neos**. Built with modern web technologies and designed for transparency, fairness, and fun.

Built by **Luana & Selina** 🚀

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Database Schema](#database-schema)
- [Business Logic](#business-logic)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)
- [Admin System](#admin-system)
- [Security](#security)

---

## ✨ Features

### For All Users

- **Create Bets**: Post clear, measurable statements with end dates
- **Private Bets**: Create invite-only bets with sharable codes
- **Anonymous Mode**: Option to hide participant names on betting card
- **Place Stakes**: Bet Neos on FOR (correct) or AGAINST (incorrect)
- **Track Bets**: Real-time pot size, participant count, and distribution
- **Wallet System**: Ledger-based transactions with complete history
- **Profile Management**: Auto-generated usernames with smart conflict resolution

### For Admins

- **Moderate Bets**: Hide inappropriate content
- **Resolve Bets**: Set outcomes and distribute proportional payouts
- **Void Bets**: Cancel and refund all stakes
- **User Management**: Promote/demote admins (super-admin only)
- **Audit Log**: Complete history of administrative actions

---

## 🛠 Tech Stack

### Frontend

- **Next.js 14** (App Router) - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Server Components** - Optimized rendering

### Backend

- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Authentication (email/password)
  - Row Level Security (RLS)
  - Stored procedures (PL/pgSQL)
- **Server Actions** - Form handling
- **API Routes** - RESTful endpoints

### Hosting

- **Netlify** - Serverless Next.js hosting
- **Supabase Cloud** - Managed database

---

## 🏗 Architecture

### Username Generation Rule

Usernames follow a strict format:

- **Format**: `FirstName LastInitial.`
- **Example**: "Selina M."
- **Duplicates**: Auto-suffix with " 2", " 3", etc.
- **Enforcement**: Automatic on signup and profile updates via database triggers

### Wallet & Ledger System

- **Append-only ledger**: All transactions are immutable
- **Balance calculation**: `SUM(amount)` from ledger entries
- **Transaction types**:
  - `STARTER`: Initial 100 Neos bonus
  - `BET_STAKE`: Negative amount when placing stakes
  - `BET_PAYOUT`: Positive amount for winning bets
  - `BET_REFUND`: Positive amount for voided bets
  - `FEE`: Platform fees (if configured)
  - `ADMIN_ADJUSTMENT`: Manual corrections

### Bet Lifecycle

1. **OPEN**: Active, accepting stakes (before `end_at`)
2. **LOCKED**: Ended, no new stakes (after `end_at`, status still OPEN)
3. **RESOLVED**: Admin set outcome, payouts distributed
4. **VOID**: Admin cancelled, all stakes refunded

### Payout Formula

```
totalPot = SUM(all stakes)
winnersTotal = SUM(winning side stakes)
fee = totalPot × (fee_bps / 10000)
payoutPot = totalPot - fee

For each winner:
  payout = (stake / winnersTotal) × payoutPot
```

**Example:**

- Total pot: 1000 Neos
- FOR stakes: 700 Neos (4 users)
- AGAINST stakes: 300 Neos (2 users)
- Resolution: FOR wins
- Fee: 0%

Winner payouts:

- User A (300 FOR): (300/700) × 1000 = 428 Neos
- User B (200 FOR): (200/700) × 1000 = 286 Neos
- User C (150 FOR): (150/700) × 1000 = 214 Neos
- User D (50 FOR): (50/700) × 1000 = 72 Neos

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ and npm
- Supabase account
- Git

### 1. Clone the Repository

```bash
cd /Users/selina/dev/private/correct?
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run migrations in the Supabase SQL Editor:
   - `supabase/migrations/001_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_functions.sql`
   - `supabase/migrations/004_bootstrap_admin.sql`

### 4. Configure Environment Variables

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 6. Create Super Admin

Sign up with email: `selina@mogicato.ch` to automatically become the super admin.

---

## 🗄 Database Schema

### Tables

**profiles**

- User accounts with auto-generated usernames
- Admin status flags (`is_admin`, `is_super_admin`)

**bets**

- Statement, description, category
- End date, max participants
- Status: OPEN, RESOLVED, VOID
- Resolution (boolean: true=FOR wins, false=AGAINST wins)

**bet_entries**

- User stakes on bets
- One entry per user per bet
- Side: FOR or AGAINST
- Stake amount in Neos

**wallet_ledger**

- Append-only transaction log
- Signed amounts (positive=credit, negative=debit)
- References bet_id when applicable

**admin_actions**

- Audit trail of admin activities
- Stores action type, target, metadata

### Key Functions

- `generate_username(first, last, user_id)` - Creates unique usernames
- `get_balance(user_id)` - Returns current Neo balance
- `place_stake(bet_id, side, stake)` - Places/increases stake
- `resolve_bet(bet_id, resolution, fee_bps)` - Resolves bet and pays out
- `void_bet(bet_id)` - Cancels bet and refunds
- `set_admin_status(user_id, is_admin, is_super_admin)` - Manages admin roles

---

## 🎯 Business Logic

### Creating Bets

- Title: 3-200 characters
- End date: Must be in the future
- Max participants: Optional limit
- Status: Always starts as OPEN

### Placing Stakes

- Must be authenticated
- Bet must be OPEN and not past end date
- Can increase stake on same side
- Cannot switch sides (must cancel first)
- Insufficient balance blocks stake
- Max participants enforced for new entries

### Resolving Bets

- Admin only
- Bet must be ended (past `end_at`)
- Choose FOR (true) or AGAINST (false)
- Optional platform fee (in basis points)
- Proportional payout to winners
- If no winners, auto-void and refund

### Voiding Bets

- Admin only
- Refunds all stakes
- Records all refunds in ledger

---

## 🚀 Deployment

### Deploy to Netlify

1. **Connect Repository**
   - Link your Git repository to Netlify
   - Framework: Next.js
   - Build command: `npm run build`
   - Publish directory: `.next`

2. **Set Environment Variables**

   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   NEXT_PUBLIC_APP_URL
   ```

3. **Deploy**
   ```bash
   git push origin main
   ```

### Supabase Production Setup

1. Run all migrations in production
2. Enable RLS on all tables
3. Verify all policies are active
4. Test admin bootstrap with `selina@mogicato.ch`

---

## 🔐 Security

### Row Level Security (RLS)

- All tables have RLS enabled
- Users can only read their own sensitive data
- Admins have elevated read permissions
- Write operations restricted to owners or admins

### Authentication

- Supabase Auth with email/password
- Session management via cookies
- Middleware refreshes sessions automatically

### Sensitive Operations

- Ledger inserts only via RPC (SECURITY DEFINER)
- Admin actions only via RPC with role checks
- Service role key never exposed to client

### Admin Roles

- **Regular Admin**: Can moderate/resolve bets
- **Super Admin**: Can promote/demote admins
- Self-demotion prevented
- Bootstrap ensures first super admin

---

## 🔧 Environment Variables

| Variable                        | Description                    | Required |
| ------------------------------- | ------------------------------ | -------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL           | Yes      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key                | Yes      |
| `SUPABASE_SERVICE_ROLE_KEY`     | Service role key (server only) | Yes      |
| `NEXT_PUBLIC_APP_URL`           | App URL for redirects          | Yes      |

---

## 👑 Admin System

### Default Super Admin

- Email: `selina@mogicato.ch`
- Display name: "Selina M."
- Auto-promoted on first signup
- Can promote others to admin

### Admin Capabilities

- View all bets (including hidden)
- Hide/unhide bets
- Resolve bets after end date
- Void bets and refund stakes
- View audit log

### Super Admin Capabilities

- All admin capabilities
- Promote users to admin
- Promote admins to super admin
- Demote admins
- Cannot demote self

---

## 📚 API Reference

### Public Endpoints

**POST** `/api/bets/stake`

- Place or increase stake
- Body: `{ betId, side, stake }`
- Returns: `{ success, new_stake, new_balance }`

### RPC Functions

Available via `supabase.rpc()`:

- `get_balance(p_user_id)`
- `place_stake(p_bet_id, p_side, p_stake)`
- `resolve_bet(p_bet_id, p_resolution, p_fee_bps)`
- `void_bet(p_bet_id)`
- `get_bet_stats(p_bet_id)`
- `set_admin_status(p_target_user_id, p_is_admin, p_is_super_admin)`

---

## 🐛 Troubleshooting

### Username Issues

- Usernames auto-generated; manual changes ignored
- Change first/last name to regenerate username
- Duplicates handled automatically with suffix

### Balance Not Updating

- Check ledger table for transactions
- Balance is computed, not stored
- Verify triggers are active

### Admin Access

- Ensure `selina@mogicato.ch` signed up first
- Run `SELECT * FROM profiles WHERE is_super_admin = true`
- Call `rpc_bootstrap_super_admin()` if needed

---

## 📄 License

This project is built as a demonstration and learning exercise.

---

## 👥 Credits

**Built by Luana & Selina**

Questions? Issues? Feel free to open a GitHub issue or reach out!

---

**Have fun betting on statements! 🎲✨**
