import { requireAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import type { Database } from "@/lib/database.types"

type Bet = Database["public"]["Tables"]["bets"]["Row"] & {
  profiles?: { username: string }
}

export const dynamic = "force-dynamic"

function formatWhen(d: string) {
  return new Date(d).toLocaleString()
}

function overdueLabel(endAt: string) {
  const daysOverdue = Math.floor((Date.now() - new Date(endAt).getTime()) / (1000 * 60 * 60 * 24))
  if (daysOverdue <= 0) return { days: 0, label: "Due today" }
  return { days: daysOverdue, label: `${daysOverdue} day${daysOverdue > 1 ? "s" : ""} overdue` }
}

function outcomeBadge(resolution: boolean | null) {
  const base = "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
  if (resolution === true) return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`
  if (resolution === false) return `${base} bg-gray-100 text-gray-700 border-gray-200`
  return `${base} bg-gray-100 text-gray-700 border-gray-200`
}

export default async function ResolveQueuePage() {
  await requireAdmin()
  const supabase = await createClient()

  const nowIso = new Date().toISOString()

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

  const { data: resolvedBets } = await supabase
    .from("bets")
    .select(
      `
      *,
      profiles!bets_creator_id_fkey(username)
    `
    )
    .eq("status", "RESOLVED")
    .order("resolved_at", { ascending: false })
    .limit(10)

  const pendingList = (pendingBets as Bet[]) || []
  const resolvedList = (resolvedBets as Bet[]) || []

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10 space-y-6">
      {/* Hero */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-soft">
        <div className="p-6 sm:p-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
              Resolution Queue
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Resolve bets that passed their end date and keep outcomes accurate.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                Pending resolutions
              </span>
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                Last 10 resolved
              </span>
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                Admin only
              </span>
            </div>
          </div>

          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-primary-50 hover:text-primary-700"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Pending Resolution
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-3xl font-semibold text-amber-700">{pendingList.length}</div>
            <div className="text-sm font-semibold text-gray-500">bets</div>
          </div>
          <p className="mt-2 text-sm text-gray-600">Past their end date.</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Recently Resolved
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-3xl font-semibold text-primary-700">{resolvedList.length}</div>
            <div className="text-sm font-semibold text-gray-500">entries</div>
          </div>
          <p className="mt-2 text-sm text-gray-600">Latest 10 resolutions.</p>
        </div>
      </div>

      {/* Pending Resolutions */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-soft overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Pending Resolutions</h2>
              <p className="mt-1 text-sm text-gray-600">
                Bets that ended but are still marked OPEN.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              {pendingList.length}
            </span>
          </div>
        </div>

        {pendingList.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-gray-900">All bets are up to date.</p>
            <p className="mt-1 text-sm text-gray-600">No pending resolutions right now.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {pendingList.map((bet) => {
              const overdue = overdueLabel(bet.end_at)
              return (
                <div key={bet.id} className="px-5 py-4 sm:px-6 hover:bg-primary-50/40 transition">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/bets/${bet.id}`}
                        className="block truncate text-sm font-semibold text-gray-900 hover:text-primary-700"
                      >
                        {bet.title}
                      </Link>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                          @{bet.profiles?.username || "unknown"}
                        </span>

                        <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          {overdue.label}
                        </span>

                        <span className="text-xs text-gray-500">Ended {formatWhen(bet.end_at)}</span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                          {/* @ts-expect-error - total_pot missing from type */}
                          Pot: {bet.total_pot || 0} Neos
                        </span>
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                          {/* @ts-expect-error - RPC typing issue */}
                          FOR: {bet.stake_for || 0}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                          {/* @ts-expect-error - RPC typing issue */}
                          AGAINST: {bet.stake_against || 0}
                        </span>
                      </div>

                      {bet.description && (
                        <p className="mt-3 text-sm text-gray-600 line-clamp-2">
                          {bet.description}
                        </p>
                      )}
                    </div>

                    <Link
                      href={`/admin/resolve/${bet.id}`}
                      className="shrink-0 inline-flex items-center justify-center rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-700"
                    >
                      Resolve Now
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recently Resolved */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-soft overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Recently Resolved</h2>
              <p className="mt-1 text-sm text-gray-600">For quick reference.</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
              {resolvedList.length}
            </span>
          </div>
        </div>

        {resolvedList.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-gray-900">No resolved bets yet.</p>
            <p className="mt-1 text-sm text-gray-600">Resolved bets will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {resolvedList.map((bet) => (
              <div key={bet.id} className="px-5 py-4 sm:px-6 hover:bg-primary-50/40 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/bets/${bet.id}`}
                      className="block truncate text-sm font-semibold text-gray-900 hover:text-primary-700"
                    >
                      {bet.title}
                    </Link>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className={outcomeBadge(bet.resolution as any)}>
                        Outcome: {bet.resolution === true ? "FOR" : "AGAINST"}
                      </span>

                      <span className="text-gray-500">
                        Resolved{" "}
                        {bet.resolved_at ? formatWhen(bet.resolved_at) : "Recently"}
                      </span>

                      <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700">
                        {/* @ts-expect-error - total_pot missing from type */}
                        Pot: {bet.total_pot || 0} Neos
                      </span>
                    </div>
                  </div>

                  <span className="shrink-0 inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                    Resolved
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
