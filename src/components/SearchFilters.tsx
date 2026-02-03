"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useState, useTransition, useEffect } from "react"

type Category = {
  id: string
  name: string
  icon: string | null
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

export default function SearchFilters({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Initial state from URL
  const [query, setQuery] = useState(searchParams.get("q") || "")

  // Active filters
  const activeCategory = searchParams.get("category") || ""
  const activeStatus = searchParams.get("status") || "OPEN"
  const activeSort = searchParams.get("sort") || "newest"

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set(name, value)
      else params.delete(name)
      return params.toString()
    },
    [searchParams]
  )

  const pushWith = (name: string, value: string) => {
    startTransition(() => {
      router.push(`/?${createQueryString(name, value)}`)
    })
  }

  const handleSearch = (term: string) => {
    setQuery(term)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query !== (searchParams.get("q") || "")) {
        pushWith("q", query)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, searchParams]) // eslint-disable-next-line react-hooks/exhaustive-deps

  // Helper to reorder categories: defaults first
  const defaultOrder = ["love", "sunrise", "school", "random"]
  const sortedCategories = [...categories].sort((a, b) => {
    const aIndex = defaultOrder.indexOf(a.name.toLowerCase())
    const bIndex = defaultOrder.indexOf(b.name.toLowerCase())

    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
    if (aIndex !== -1) return -1
    if (bIndex !== -1) return 1
    return a.name.localeCompare(b.name)
  })

  const statusOptions = [
    { label: "Open", value: "OPEN" },
    { label: "Locked", value: "LOCKED" },
    { label: "Resolved", value: "RESOLVED" },
    { label: "Void", value: "VOID" },
    { label: "All", value: "ALL" },
  ] as const

  const sortOptions = [
    { label: "Newest", value: "newest" },
    { label: "Popular", value: "popular" },
    { label: "Ending", value: "ending_soon" },
  ] as const

  return (
    <div className="relative rounded-3xl border border-gray-200 bg-white p-4 sm:p-6 shadow-soft">
      {/* Top row: title + pending */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900">Filters</h2>
          <p className="mt-1 text-sm text-gray-600">
            Search and narrow down bets by category, status, and sort.
          </p>
        </div>

        {isPending && (
          <span className="shrink-0 inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
            Updating…
          </span>
        )}
      </div>

      {/* Search */}
      <div className="mt-5">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
            <span className="text-sm">⌕</span>
          </div>

          <input
            type="text"
            placeholder="Search by title or username…"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className={cn(
              "w-full rounded-2xl border border-gray-200 bg-gray-50 px-10 py-3 text-sm text-gray-900",
              "placeholder:text-gray-500",
              "transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-200"
            )}
          />

          {query.length > 0 && (
            <button
              type="button"
              onClick={() => handleSearch("")}
              className="absolute inset-y-0 right-2 inline-flex items-center rounded-xl px-3 text-xs font-semibold text-gray-600 hover:bg-gray-100"
              aria-label="Clear search"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {/* Categories */}
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Categories
            </h3>

            <div className="text-xs text-gray-500">
              {activeCategory ? "Filtered" : "All"}
            </div>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
            <button
              type="button"
              onClick={() => pushWith("category", "")}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition border",
                activeCategory === ""
                  ? "bg-primary-600 text-white border-primary-600 shadow-soft"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-primary-50 hover:text-primary-700"
              )}
            >
              All
            </button>

            {sortedCategories.map((cat) => {
              const active = activeCategory === cat.id
              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => pushWith("category", cat.id)}
                  className={cn(
                    "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition border",
                    "inline-flex items-center gap-2",
                    active
                      ? "bg-primary-600 text-white border-primary-600 shadow-soft"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-primary-50 hover:text-primary-700"
                  )}
                  title={cat.name}
                >
                  {cat.icon ? (
                    <span className={cn("text-base", active ? "text-white" : "text-gray-500")}>
                      {cat.icon}
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        active ? "bg-white/80" : "bg-primary-300"
                      )}
                    />
                  )}
                  <span className="whitespace-nowrap">{cat.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Status + Sort */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          {/* Status */}
          <div className="flex-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Status
            </h3>

            <div className="mt-3 flex flex-wrap gap-2">
              {statusOptions.map((s) => {
                const active = activeStatus === s.value
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => pushWith("status", s.value)}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition border",
                      active
                        ? "bg-primary-600 text-white border-primary-600 shadow-soft"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-primary-50 hover:text-primary-700"
                    )}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sort */}
          <div className="lg:w-[320px]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 lg:text-right">
              Sort
            </h3>

            <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-1">
              <div className="grid grid-cols-3 gap-1">
                {sortOptions.map((o) => {
                  const active = activeSort === o.value
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => pushWith("sort", o.value)}
                      className={cn(
                        "rounded-xl px-3 py-2 text-xs font-semibold transition",
                        active
                          ? "bg-white text-primary-700 shadow-soft"
                          : "text-gray-600 hover:text-primary-700 hover:bg-white/70"
                      )}
                    >
                      {o.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <p className="mt-2 text-xs text-gray-500 lg:text-right">
              Sorting applies to the current feed.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
