"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

type NavItem = { href: string; label: string; auth?: boolean }

export default function HeaderTabs({
  isLoggedIn,
  isAdmin,
}: {
  isLoggedIn: boolean
  isAdmin: boolean
}) {
  const pathname = usePathname()

  const navItems: NavItem[] = [
    { href: "/", label: "Feed" },
    { href: "/bets/new", label: "Create Bet", auth: true },
    { href: "/friends", label: "Friends", auth: true },
    { href: "/groups", label: "Groups", auth: true },
    { href: "/wallet", label: "Wallet", auth: true },
  ]

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname === href || pathname.startsWith(href + "/")
  }

  const navHref = (item: NavItem) => {
    if (!item.auth) return item.href
    if (isLoggedIn) return item.href
    return `/auth/sign-in?next=${encodeURIComponent(item.href)}`
  }

  const locked = (item: NavItem) => Boolean(item.auth && !isLoggedIn)

  return (
    <>
      {/* Desktop */}
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
                    active ? "bg-white/20 text-white" : "bg-primary-100 text-primary-700"
                  )}
                >
                  locked
                </span>
              )}
            </Link>
          )
        })}

        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              "ml-1 rounded-full px-4 py-2 text-sm font-semibold transition",
              isActive("/admin")
                ? "bg-primary-900 text-white shadow-soft"
                : "bg-primary-900 text-white hover:bg-primary-800"
            )}
            aria-current={isActive("/admin") ? "page" : undefined}
          >
            Admin
          </Link>
        )}
      </div>

      {/* Mobile (ohne state, nur details) */}
      <details className="md:hidden relative">
        <summary className="list-none cursor-pointer rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-soft hover:bg-primary-50">
          ☰
        </summary>
        <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-[92vw] max-w-sm overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-soft">
          <div className="p-2">
            {navItems.map((it) => {
              const active = isActive(it.href)
              const isLocked = locked(it)
              return (
                <Link
                  key={it.href}
                  href={navHref(it)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "block rounded-xl px-3 py-2 text-sm font-semibold transition",
                    active
                      ? "bg-primary-600 text-white"
                      : "text-gray-700 hover:bg-primary-50 hover:text-primary-700"
                  )}
                  title={isLocked ? "Sign in required" : undefined}
                >
                  <span className="flex items-center justify-between">
                    <span>{it.label}</span>
                    {isLocked && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          active ? "bg-white/20 text-white" : "bg-primary-100 text-primary-700"
                        )}
                      >
                        locked
                      </span>
                    )}
                  </span>
                </Link>
              )
            })}

            {isAdmin && (
              <Link
                href="/admin"
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
          </div>
        </div>
      </details>
    </>
  )
}
