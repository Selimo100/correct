import Link from "next/link"
import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import HeaderTabs from "./HeaderTabs"
import NotificationBell from "./NotificationBell"
import { getUnreadCount } from "@/app/actions/notifications"

export default async function Header() {
  const user = await getCurrentUser()
  const supabase = await createClient()

  let balance = 0
  let unreadCount = 0

  if (user) {
    // @ts-expect-error
    const { data } = await supabase.rpc("get_balance", { p_user_id: user.id })
    balance = (data as unknown as number) || 0
    unreadCount = await getUnreadCount()
  }

  // Fetch friend requests count if logged in
  let friendRequestCount = 0
  if (user) {
    const { data } = await (supabase.rpc as any)("fn_incoming_friend_request_count")
    friendRequestCount = (data as number) || 0
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/85 backdrop-blur shadow-sm">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center gap-3">
          {/* Left: Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-700 text-white font-extrabold shadow-sm">
              C?
            </span>
            <div className="leading-tight">
              <div className="text-lg font-semibold tracking-tight text-gray-900">
                Correct?
              </div>
            </div>
          </Link>

          {/* Center: Tabs (important: min-w-0 + flex-1) */}
          <div className="min-w-0 flex-1 flex justify-center">
            <HeaderTabs isLoggedIn={!!user} isAdmin={!!user?.is_admin} friendRequestCount={friendRequestCount} />
          </div>

          {/* Right: Actions */}

          <div className="shrink-0 flex items-center gap-2">
            {user ? (
              <>
                <div className="mr-1">
                  <NotificationBell initialCount={unreadCount} />
                </div>
                {/* Compact on md, full box on lg */}

                <div className="hidden lg:flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-2 shadow-sm">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-gray-900">
                      {user.username}
                    </div>
                    <div className="mt-1 inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
                      {balance} Neos
                    </div>
                  </div>

                  <div className="h-9 w-px bg-gray-200" />

                  <Link
                    href="/profile"
                    className="rounded-full px-4 py-2 text-sm font-semibold text-gray-700 hover:text-primary-700 hover:bg-primary-50 transition"
                  >
                    Profile
                  </Link>

                  <form action="/auth/sign-out" method="post">
                    <button
                      type="submit"
                      className="rounded-full px-4 py-2 text-sm font-semibold text-gray-700 hover:text-primary-700 hover:bg-primary-50 transition"
                    >
                      Sign out
                    </button>
                  </form>
                </div>

                {/* Small quick badge on md */}
                <div className="lg:hidden inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700">
                  {balance} Neos
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/sign-in"
                  className="rounded-full px-4 py-2 text-sm font-semibold text-gray-700 hover:text-primary-700 hover:bg-primary-50 transition"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition"
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
