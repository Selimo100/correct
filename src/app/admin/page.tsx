import { requireAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import type { Database } from "@/lib/database.types"

type Bet = Database["public"]["Tables"]["bets"]["Row"] & {
  profiles?: { username: string }
}

type Profile = Database["public"]["Tables"]["profiles"]["Row"]

type AdminAction = Database["public"]["Tables"]["admin_actions"]["Row"] & {
  profiles?: { username: string }
}

export const dynamic = "force-dynamic"

function formatWhen(d: string) {
  return new Date(d).toLocaleString()
}

function labelAction(a: string) {
  return a
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default async function AdminPage() {
  await requireAdmin()
  const supabase = await createClient()

  const nowIso = new Date().toISOString()

  // Pending resolution bets
  const { data: pendingBets } = await supabase
    .from("bets")
    .select(
      `
      *,
      profiles!bets_creator_id_fkey(username)
    `
    )
    .eq("status", "OPEN")
    .lt("end_at", nowIso)
    .order("end_at", { ascending: true })

  // Recent open bets
  const { data: openBets } = await supabase
    .from("bets")
    .select(
      `
      *,
      profiles!bets_creator_id_fkey(username)
    `
    )
    .eq("status", "OPEN")
    .gte("end_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(10)

  // Users
  const { data: users } = await supabase.from("profiles").select("*").order("created_at", {
    ascending: false,
  })

  // Admin actions
  const { data: actions } = await supabase
    .from("admin_actions")
    .select(
      `
      *,
      profiles(username)
    `
    )
    .order("created_at", { ascending: false })
    .limit(20)

  const pendingBetList = (pendingBets as Bet[]) || []
  const openBetList = (openBets as Bet[]) || []
  const userList = (users as Profile[]) || []
  const actionList = (actions as AdminAction[]) || []

  const adminCount = userList.filter((u) => u.is_admin).length

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10 space-y-6">
      {/* Hero */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-soft">
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
            Admin Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Moderate bets, resolve outcomes, and manage users.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
              Overview
            </span>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              Audit trail
            </span>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              Resolve queue
            </span>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Pending Resolution
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-3xl font-semibold text-amber-700">{pendingBetList.length}</div>
            <div className="text-sm font-semibold text-gray-500">bets</div>
          </div>
          <p className="mt-2 text-sm text-gray-600">Ended, still open.</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Open Bets
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-3xl font-semibold text-primary-700">{openBetList.length}</div>
            <div className="text-sm font-semibold text-gray-500">tracked</div>
          </div>
          <p className="mt-2 text-sm text-gray-600">Currently active.</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Total Users
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-3xl font-semibold text-gray-900">{userList.length}</div>
            <div className="text-sm font-semibold text-gray-500">accounts</div>
          </div>
          <p className="mt-2 text-sm text-gray-600">All profiles.</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Admins
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-3xl font-semibold text-gray-900">{adminCount}</div>
            <div className="text-sm font-semibold text-gray-500">roles</div>
          </div>
          <p className="mt-2 text-sm text-gray-600">Privileged users.</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="rounded-3xl border border-gray-200 bg-white p-3 shadow-soft">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-2xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-soft"
          >
            Overview
          </Link>
          <Link
            href="/admin/bets"
            className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition"
          >
            Moderate Bets
          </Link>
          <Link
            href="/admin/resolve"
            className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition"
          >
            Resolve Queue
          </Link>
          <Link
            href="/admin/users"
            className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition"
          >
            Users
          </Link>
          <Link
            href="/admin/audit"
            className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition"
          >
            Audit Log
          </Link>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Pending */}
        <div className="lg:col-span-7 rounded-3xl border border-gray-200 bg-white shadow-soft overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Pending Resolutions
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Bets that ended but are still open.
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                {pendingBetList.length}
              </span>
            </div>
          </div>

          {pendingBetList.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-gray-900">No bets pending resolution.</p>
              <p className="mt-1 text-sm text-gray-600">Everything is up to date.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {pendingBetList.map((bet) => (
                <div key={bet.id} className="px-5 py-4 sm:px-6 hover:bg-primary-50/40 transition">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-gray-900">{bet.title}</div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                        <span>Ended: {formatWhen(bet.end_at)}</span>
                        {bet.profiles?.username && (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 font-semibold text-gray-700">
                            @{bet.profiles.username}
                          </span>
                        )}
                      </div>
                    </div>

                    <Link
                      href={`/admin/resolve/${bet.id}`}
                      className="inline-flex items-center justify-center rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-700"
                    >
                      Resolve
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent actions */}
        <div className="lg:col-span-5 rounded-3xl border border-gray-200 bg-white shadow-soft overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Recent Admin Actions</h2>
                <p className="mt-1 text-sm text-gray-600">Latest activity snapshot.</p>
              </div>
              <Link
                href="/admin/audit"
                className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition"
              >
                View all
              </Link>
            </div>
          </div>

          {actionList.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-gray-900">No recent actions.</p>
              <p className="mt-1 text-sm text-gray-600">Actions will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {actionList.slice(0, 8).map((action) => (
                <div key={action.id} className="px-5 py-4 sm:px-6 hover:bg-primary-50/40 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900">
                        @{action.profiles?.username || "admin"}
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        {labelAction(action.action)}
                      </div>
                      <div className="mt-2 text-xs text-gray-500">{formatWhen(action.created_at)}</div>
                    </div>

                    <span className="shrink-0 inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                      Audit
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
