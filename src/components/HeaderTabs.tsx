"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

type NavItem = { href: string; label: string; auth?: boolean; badge?: number }

export default function HeaderTabs({
  isLoggedIn,
  isAdmin,
  friendRequestCount = 0,
}: {
  isLoggedIn: boolean
  isAdmin: boolean
  friendRequestCount?: number
}) {
  const pathname = usePathname()

  const navItems: NavItem[] = [
    { href: "/", label: "Feed" },
    { href: "/bets/new", label: "Create Bet", auth: true },
    { href: "/friends", label: "Friends", auth: true, badge: friendRequestCount },
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

  const closeMenu = () => {
    const details = document.getElementById("mobile-nav-details") as HTMLDetailsElement
    if (details) details.open = false
  }

  return (
    <>
      {/* Desktop / Tablet: horizontal scroll statt wrap */}
      <div className="hidden md:flex min-w-0 max-w-full">
        <div className="flex w-full max-w-full items-center gap-1 rounded-full border border-gray-200 bg-white px-1.5 py-1.5 shadow-sm overflow-x-auto flex-nowrap whitespace-nowrap">
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
                  "relative inline-flex shrink-0 items-center rounded-full px-3 py-2 text-sm font-semibold transition",
                  active
                    ? "bg-primary-600 text-white shadow-sm"
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
                {!!it.badge && it.badge > 0 && !isLocked && (
                   <span className={cn(
                     "ml-2 inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full px-1 text-[11px] font-bold",
                     active ? "bg-white text-primary-600" : "bg-red-500 text-white"
                   )}>
                     {it.badge > 9 ? '9+' : it.badge}
                   </span>
                )}
              </Link>
            )
          })}

          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                "ml-1 shrink-0 rounded-full px-3 py-2 text-sm font-semibold transition",
                isActive("/admin")
                  ? "bg-primary-900 text-white shadow-sm"
                  : "bg-primary-900 text-white hover:bg-primary-800"
              )}
              aria-current={isActive("/admin") ? "page" : undefined}
            >
              Admin
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Hamburger - Fixed Overlay Implementation */}
      <details id="mobile-nav-details" className="md:hidden group">
        <summary className="list-none cursor-pointer rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-primary-50 z-50 relative">
          ☰
        </summary>
        
        {/* Backdrop */}
        <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 hidden group-open:block" 
            onClick={closeMenu}
        />
        
        {/* Drawer Panel */}
        <div className="fixed inset-y-0 left-0 w-[80vw] max-w-[300px] bg-white shadow-xl z-50 overflow-y-auto hidden group-open:block p-4 border-r border-gray-100 safe-area-left">
           <div className="flex flex-col gap-1">
             <div className="mb-4 px-2 pb-4 border-b border-gray-100 flex justify-between items-center">
                 <span className="font-bold text-lg text-primary-700">Menu</span>
                 <button onClick={closeMenu} className="p-2 text-gray-500">✕</button>
             </div>

            {navItems.map((it) => {
              const active = isActive(it.href)
              const isLocked = locked(it)
              return (
                <Link
                  key={it.href}
                  onClick={closeMenu}
                  href={navHref(it)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "block rounded-xl px-3 py-3 text-sm font-semibold transition",
                    active
                      ? "bg-primary-600 text-white"
                      : "text-gray-700 hover:bg-primary-50 hover:text-primary-700"
                  )}
                  title={isLocked ? "Sign in required" : undefined}
                >
                  <span className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        {it.label}
                        {!!it.badge && it.badge > 0 && !isLocked && (
                            <span className={cn(
                                "inline-flex min-w-[1.25rem] h-5 items-center justify-center rounded-full px-1 text-[11px] font-bold",
                                active ? "bg-white text-primary-600" : "bg-red-500 text-white"
                            )}>
                                {it.badge > 9 ? '9+' : it.badge}
                            </span>
                        )}
                    </span>
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
                onClick={closeMenu}
                href="/admin"
                className={cn(
                  "mt-2 block rounded-xl px-3 py-3 text-sm font-semibold transition",
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
      
      {/* Scroll lock style when open */}
      <style jsx global>{`
        details[open] > summary ~ div {
            animation: slideIn 0.2s ease-out;
        }
        @keyframes slideIn {
            from { transform: translateX(-100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  )
}
