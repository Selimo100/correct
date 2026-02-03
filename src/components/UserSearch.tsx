"use client"

import { useState } from "react"
import { friends } from "@/lib/friends"

interface User {
  id: string
  username: string
  first_name: string
  last_name: string
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

const fieldBase =
  "block w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 " +
  "placeholder:text-gray-500 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-200"

export default function UserSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError("")
    setSuccessMsg("")
    try {
      const data = await friends.searchUsers(query)
      setResults(data || [])
      if (!data || data.length === 0) setError("No users found.")
    } catch (err: any) {
      setError(err.message || "Search failed.")
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (username: string) => {
    try {
      setError("")
      setSuccessMsg("")
      await friends.sendRequest(username)
      setSuccessMsg(`Request sent to @${username}`)
      setResults((prev) => prev.filter((r) => r.username !== username))
    } catch (err: any) {
      setError(err.message || "Failed to send request.")
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username…"
            className={cn(fieldBase, "sm:flex-1")}
          />

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className={cn(
              "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold text-white shadow-soft transition",
              "bg-primary-600 hover:bg-primary-700",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Tip: use exact username for best results.</span>

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("")
                setResults([])
                setError("")
                setSuccessMsg("")
              }}
              className="rounded-full px-3 py-1 font-semibold text-gray-600 hover:bg-gray-100"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {(error || successMsg) && (
        <div className="space-y-2">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {successMsg}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="rounded-3xl border border-gray-200 bg-white shadow-soft overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Results
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {results.map((user) => (
              <div key={user.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-50 text-primary-700 font-extrabold">
                    {String(user.username || "?").charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-gray-900">
                      @{user.username}
                    </div>
                    <div className="truncate text-sm text-gray-600">
                      {user.first_name} {user.last_name}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleAdd(user.username)}
                  className="shrink-0 inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-primary-50 hover:text-primary-700"
                >
                  Send request
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty helper (when searched but none found) */}
      {results.length === 0 && !loading && query.trim() && !error && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          No results. Try another username.
        </div>
      )}
    </div>
  )
}
