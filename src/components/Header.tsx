import Link from "next/link"
import { headers } from "next/headers"
import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

type NavItem = {
  href: string
  label: string
  auth?: boolean
}

export default async function Header() {
  const user = await getCurrentUser()
  const supabase = await createClient()

  let balance = 0
  if (user) {
    // @ts-expect-error - Supabase RPC typing issue
    const { data } = await supabase.rpc("get_balance", { p_user_id: user.id })
    balance = (data as unknown as number) || 0
  }

  const navItems: NavItem[] = [
    { href: "/", label: "Feed" },
    { href: "/bets/new", label: "Create Bet", auth: true },
    { href: "/friends", label: "Friends", auth: true },
    { href: "/groups", label: "Groups", auth: true },
    { href: "/wallet", label: "Wallet", auth: true },
  ]

  const pathname = headers().get("x-pathname") || "/"

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname === href || pathname.startsWith(href + "/")
  }

  // Your middleware already protects routes, but this keeps UX nice if you ever allow public pages.
  const navHref = (item: NavItem) => {
    if (!item.auth) return item.href
    if (user) return item.href
    return `/auth/sign-in?next=${encodeURIComponent(item.href)}`
  }

  const locked = (item: NavItem) => Boolean(item.auth && !user)

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/75 backdrop-blur-xs shadow-header">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-4">
          {/* Left */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-700 text-white font-extrabold shadow-soft">
                C?
              </span>
              <div className="leading-tight">
                <div className="text-lg font-semibold tracking-tight text-gray-900">
                  Correct?
                </div>
                <div className="hidden sm:block text-xs font-medium text-gray-500">
                  burgundy • clean • fast
                </div>
              </div>
            </Link>

            {/* Desktop tabs */}
            <div className="hidden md:flex items-center gap-1 rounded-full border border-gray-200 bg-white px-1.5 py-1.5 shadow-soft">
              {navItems.map((it) => {
                const active = isActive(it.href)
                const isLocked = locked(it)

                return (
                  <Link
                    key={it.href}
                    href={navHref(it)}
                    aria-current={active ? "page" : undefined}
                    title={isLocked ? "Sign in required" : undefined}
                    className={cn(
                      "relative inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2",
                      active
                        ? "bg-primary-600 text-white shadow-soft"
                        : "text-gray-700 hover:text-primary-700 hover:bg-primary-50",
                      isLocked && "opacity-85"
                    )}
                  >
                    {it.label}

                    {isLocked && (
                      <span
                        className={cn(
                          "ml-2 inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold",
                          active
                            ? "bg-white/20 text-white"
                            : "bg-primary-100 text-primary-700"
                        )}
                      >
                        locked
                      </span>
                    )}

                    <span
                      className={cn(
                        "pointer-events-none absolute -bottom-2 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full transition",
                        active ? "bg-primary-500/60" : "bg-transparent"
                      )}
                    />
                  </Link>
                )
              })}

              {user?.is_admin && (
                <Link
                  href="/admin"
                  aria-current={isActive("/admin") ? "page" : undefined}
                  className={cn(
                    "ml-1 rounded-full px-4 py-2 text-sm font-semibold transition",
                    isActive("/admin")
                      ? "bg-primary-900 text-white shadow-soft"
                      : "bg-primary-900 text-white hover:bg-primary-800"
                  )}
                >
                  Admin
                </Link>
              )}
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <div className="hidden lg:flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-2 shadow-soft">
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
                    aria-current={isActive("/profile") ? "page" : undefined}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition",
                      isActive("/profile")
                        ? "bg-primary-600 text-white shadow-soft"
                        : "text-gray-700 hover:text-primary-700 hover:bg-primary-50"
                    )}
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

                {/* Mobile */}
                <details className="md:hidden relative">
                  <summary className="list-none cursor-pointer rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-soft hover:bg-primary-50">
                    ☰
                  </summary>

                  <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-soft">
                    <div className="border-b border-gray-100 px-4 py-3">
                      <div className="text-sm font-semibold text-gray-900">
                        {user.username}
                      </div>
                      <div className="mt-1 inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
                        {balance} Neos
                      </div>
                    </div>

                    <div className="p-2">
                      {navItems.map((it) => {
                        const active = isActive(it.href)
                        const isLocked = locked(it)
                        return (
                          <Link
                            key={it.href}
                            href={navHref(it)}
                            aria-current={active ? "page" : undefined}
                            title={isLocked ? "Sign in required" : undefined}
                            className={cn(
                              "block rounded-xl px-3 py-2 text-sm font-semibold transition",
                              active
                                ? "bg-primary-600 text-white"
                                : "text-gray-700 hover:bg-primary-50 hover:text-primary-700"
                            )}
                          >
                            <span className="flex items-center justify-between">
                              <span>{it.label}</span>
                              {isLocked && (
                                <span
                                  className={cn(
                                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                    active
                                      ? "bg-white/20 text-white"
                                      : "bg-primary-100 text-primary-700"
                                  )}
                                >
                                  locked
                                </span>
                              )}
                            </span>
                          </Link>
                        )
                      })}

                      <Link
                        href="/profile"
                        aria-current={isActive("/profile") ? "page" : undefined}
                        className={cn(
                          "mt-1 block rounded-xl px-3 py-2 text-sm font-semibold transition",
                          isActive("/profile")
                            ? "bg-primary-600 text-white"
                            : "text-gray-700 hover:bg-primary-50 hover:text-primary-700"
                        )}
                      >
                        Profile
                      </Link>

                      {user.is_admin && (
                        <Link
                          href="/admin"
                          aria-current={isActive("/admin") ? "page" : undefined}
                          className={cn(
                            "mt-1 block rounded-xl px-3 py-2 text-sm font-semibold transition",
                            isActive("/admin")
                              ? "bg-primary-900 text-white"
                              : "bg-primary-900 text-white hover:bg-primary-800"
                          )}
                        >
                          Admin
                        </Link>
                      )}

                      <form action="/auth/sign-out" method="post" className="mt-2">
                        <button
                          type="submit"
                          className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition"
                        >
                          Sign out
                        </button>
                      </form>
                    </div>
                  </div>
                </details>
              </>
            ) : (
              <>
                <Link
                  href="/auth/sign-in"
                  className="rounded-full px-4 py-2 text-sm font-semibold text-gray-700 hover:text-primary-700 hover:bg-primary-50 transition"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-primary-700 transition"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}
