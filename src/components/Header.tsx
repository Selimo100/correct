import Link from "next/link"
import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function NavLink({
  href,
  children,
  active = false,
}: {
  href: string
  children: React.ReactNode
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-3 py-1.5 text-sm font-medium transition",
        active
          ? "bg-primary-600 text-white shadow-soft"
          : "text-gray-600 hover:text-primary-700 hover:bg-primary-50"
      )}
    >
      {children}
    </Link>
  )
}

export default async function Header() {
  const user = await getCurrentUser()
  const supabase = await createClient()

  let balance = 0
  if (user) {
    // @ts-expect-error Supabase RPC typing
    const { data } = await supabase.rpc("get_balance", {
      p_user_id: user.id,
    })
    balance = (data as unknown as number) || 0
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/70 backdrop-blur-xs shadow-header">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-700 text-white font-bold shadow-soft">
                C?
              </span>
              <span className="text-lg font-semibold text-gray-900">
                Correct?
              </span>
            </Link>

            {user && (
              <div className="hidden sm:flex items-center gap-1 rounded-full border border-gray-200 bg-white px-1 py-1 shadow-soft">
                <NavLink href="/" active>
                  Feed
                </NavLink>
                <NavLink href="/bets/new">Create</NavLink>
                <NavLink href="/friends">Friends</NavLink>
                <NavLink href="/groups">Groups</NavLink>
                <NavLink href="/wallet">Wallet</NavLink>

                {user.is_admin && (
                  <Link
                    href="/admin"
                    className="ml-1 rounded-full px-3 py-1.5 text-sm font-semibold
                               bg-primary-900 text-white hover:bg-primary-800 transition"
                  >
                    Admin
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-1.5 shadow-soft">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {user.username}
                    </div>
                    <div className="inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700">
                      {balance} Neos
                    </div>
                  </div>

                  <div className="h-8 w-px bg-gray-200" />

                  <Link
                    href="/profile"
                    className="rounded-full px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-primary-700 hover:bg-primary-50"
                  >
                    Profile
                  </Link>

                  <form action="/auth/sign-out" method="post">
                    <button
                      type="submit"
                      className="rounded-full px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-primary-700 hover:bg-primary-50"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/sign-in"
                  className="rounded-full px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary-700 hover:bg-primary-50"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-primary-700 transition"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}
