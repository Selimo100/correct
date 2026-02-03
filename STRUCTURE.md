# Project Structure

```
correct?/
├── README.md                      # Main documentation
├── QUICKSTART.md                  # Quick start guide
├── DEPLOYMENT.md                  # Deployment checklist
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
├── next.config.js                 # Next.js config
├── tailwind.config.ts             # Tailwind CSS config
├── postcss.config.js              # PostCSS config
├── netlify.toml                   # Netlify deployment config
├── .env.example                   # Environment variables template
├── .gitignore                     # Git ignore rules
│
├── supabase/                      # Database migrations
│   ├── migrations/
│   │   ├── 001_schema.sql         # Tables, constraints, indexes
│   │   ├── 002_rls_policies.sql   # Row Level Security
│   │   ├── 003_functions.sql      # RPC functions & triggers
│   │   └── 004_bootstrap_admin.sql # Super admin setup
│   └── SETUP.sql                  # Setup & troubleshooting queries
│
└── src/
    ├── middleware.ts              # Auth session management
    │
    ├── lib/                       # Shared utilities
    │   ├── database.types.ts      # TypeScript types for DB
    │   ├── auth.ts                # Auth helpers
    │   └── supabase/
    │       ├── client.ts          # Browser Supabase client
    │       ├── server.ts          # Server Supabase client
    │       └── middleware.ts      # Auth middleware helper
    │
    ├── components/                # Reusable UI components
    │   ├── Header.tsx             # Navigation header
    │   ├── Footer.tsx             # Footer with credits
    │   ├── BetCard.tsx            # Bet display card
    │   └── StakeForm.tsx          # Stake placement form
    │
    └── app/                       # Next.js App Router pages
        ├── layout.tsx             # Root layout
        ├── page.tsx               # Home page (bet feed)
        ├── globals.css            # Global styles
        │
        ├── auth/                  # Authentication pages
        │   ├── sign-in/
        │   │   └── page.tsx       # Sign in page
        │   ├── sign-up/
        │   │   └── page.tsx       # Sign up page
        │   └── sign-out/
        │       └── route.ts       # Sign out API route
        │
        ├── bets/                  # Bet pages
        │   ├── new/
        │   │   └── page.tsx       # Create new bet
        │   └── [id]/
        │       └── page.tsx       # Bet detail & stake
        │
        ├── wallet/
        │   └── page.tsx           # Wallet & transaction history
        │
        ├── profile/
        │   └── page.tsx           # User profile settings
        │
        ├── about/
        │   └── page.tsx           # About page
        │
        ├── privacy/
        │   └── page.tsx           # Privacy policy
        │
        ├── terms/
        │   └── page.tsx           # Terms of service
        │
        ├── admin/                 # Admin dashboard
        │   ├── page.tsx           # Admin overview
        │   ├── users/
        │   │   └── page.tsx       # User management
        │   └── resolve/
        │       └── [id]/
        │           └── page.tsx   # Resolve/void bet
        │
        └── api/                   # API routes
            └── bets/
                └── stake/
                    └── route.ts   # Place stake endpoint
```

## Key Directories

### `/supabase/migrations/`
SQL files to set up the PostgreSQL database with tables, policies, functions, and triggers.

### `/src/lib/`
Shared utilities including:
- Database type definitions
- Supabase client setup (browser & server)
- Authentication helpers
- Middleware for session management

### `/src/components/`
Reusable React components:
- **Header**: Navigation with wallet balance
- **Footer**: Credits and links
- **BetCard**: Display bet info in lists
- **StakeForm**: Place/increase stakes

### `/src/app/`
Next.js App Router pages:
- **Public pages**: Home feed, bet details, about
- **Auth pages**: Sign in, sign up, sign out
- **Protected pages**: Create bet, wallet, profile
- **Admin pages**: Dashboard, user management, bet resolution

## Data Flow

```
User Action
    ↓
Next.js Page (Server Component)
    ↓
Server Action / API Route
    ↓
Supabase RPC Function (SQL)
    ↓
Database Writes (enforced by RLS)
    ↓
Response back to user
    ↓
Page Revalidation / Redirect
```

## Security Layers

1. **Middleware**: Refreshes auth sessions
2. **Server Components**: Protected routes check auth
3. **RLS Policies**: Database-level access control
4. **RPC Functions**: SECURITY DEFINER for sensitive operations
5. **Server Actions**: Server-side validation

## Tech Stack Summary

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Deployment**: Netlify (Next.js), Supabase Cloud (DB)
- **State**: Server components (no client state management needed)
- **Forms**: Server actions (progressive enhancement)
- **Styling**: Tailwind utility classes
