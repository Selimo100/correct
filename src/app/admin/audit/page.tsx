import { requireAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/database.types"

type AdminAction = Database["public"]["Tables"]["admin_actions"]["Row"] & {
  profiles?: { username: string }
}

export const dynamic = "force-dynamic"

function formatWhen(d: string) {
  return new Date(d).toLocaleString()
}

function labelizeAction(a: string) {
  return a.toLowerCase().replace(/_/g, " ")
}

function actionBadge(action: string) {
  const base = "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
  if (action === "RESOLVE_BET") return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`
  if (action === "VOID_BET") return `${base} bg-amber-50 text-amber-700 border-amber-200`
  if (action === "HIDE_BET") return `${base} bg-gray-100 text-gray-700 border-gray-200`
  if (action === "UNHIDE_BET") return `${base} bg-primary-50 text-primary-700 border-primary-200`
  if (action.includes("ADMIN")) return `${base} bg-gray-900 text-white border-gray-900`
  if (action.includes("USER")) return `${base} bg-primary-50 text-primary-700 border-primary-200`
  return `${base} bg-gray-100 text-gray-700 border-gray-200`
}

export default async function AuditLogPage() {
  await requireAdmin()
  const supabase = await createClient()

  const { data: actions } = await supabase
    .from("admin_actions")
    .select(
      `
      *,
      profiles(username)
    `
    )
    .order("created_at", { ascending: false })
    .limit(100)

  const actionList = (actions as AdminAction[]) || []

  const actionCounts = actionList.reduce((acc, action) => {
    acc[action.action] = (acc[action.action] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const totalModerations = (actionCounts.HIDE_BET || 0) + (actionCounts.UNHIDE_BET || 0)

  return (
    <div className="space-y-6 mt-6">

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Actions</div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-3xl font-semibold text-gray-900">{actionList.length}</div>
            <div className="text-sm font-semibold text-gray-500">events</div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Resolutions</div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-3xl font-semibold text-primary-700">{actionCounts.RESOLVE_BET || 0}</div>
            <div className="text-sm font-semibold text-gray-500">resolve</div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Voids</div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-3xl font-semibold text-amber-700">{actionCounts.VOID_BET || 0}</div>
            <div className="text-sm font-semibold text-gray-500">void</div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Moderations</div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-3xl font-semibold text-gray-900">{totalModerations}</div>
            <div className="text-sm font-semibold text-gray-500">hide/unhide</div>
          </div>
        </div>
      </div>

      {/* Recent Actions */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-soft overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Recent Actions</h2>
              <p className="mt-1 text-sm text-gray-600">Newest first.</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              {actionList.length}
            </span>
          </div>
        </div>

        {actionList.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-gray-900">No admin actions recorded yet.</p>
            <p className="mt-1 text-sm text-gray-600">Actions will appear here automatically.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {actionList.map((action) => (
              <div key={action.id} className="px-5 py-4 sm:px-6 hover:bg-primary-50/40 transition">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {action.profiles?.username || "Unknown Admin"}
                      </span>
                      <span className={actionBadge(action.action)}>{labelizeAction(action.action)}</span>
                    </div>
                  </div>

                  <div className="text-xs font-semibold text-gray-500">{formatWhen(action.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Breakdown */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-soft overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Action Breakdown</h2>
              <p className="mt-1 text-sm text-gray-600">Counts by action type.</p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(actionCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([action, count]) => (
                <div
                  key={action}
                  className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {labelizeAction(action)}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-gray-900">{count}</div>
                  </div>
                  <span className={actionBadge(action)}>{action.replace(/_/g, " ")}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
