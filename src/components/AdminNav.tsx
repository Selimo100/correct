// components/AdminNav.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

export default function AdminNav() {
  const pathname = usePathname()

  const tabs = [
    {
      name: "Bets",
      href: "/admin",
      match: (p: string) => p === "/admin" || p.startsWith("/admin/resolve"),
    },
    { name: "Users", href: "/admin/users", match: (p: string) => p.startsWith("/admin/users") },
    {
      name: "Categories",
      href: "/admin/categories",
      match: (p: string) => p.startsWith("/admin/categories"),
    },
    { name: "Audit Logs", href: "/admin/audit", match: (p: string) => p.startsWith("/admin/audit") },
  ]

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-2 shadow-soft mb-4">
      <nav className="flex flex-wrap gap-2" aria-label="Admin tabs">
        {tabs.map((tab) => {
          const isActive = tab.match(pathname)
          return (
            <Link
              key={tab.name}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition",
                isActive
                  ? "bg-primary-600 text-white shadow-soft"
                  : "bg-white text-gray-700 hover:bg-primary-50 hover:text-primary-700"
              )}
            >
              {tab.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
