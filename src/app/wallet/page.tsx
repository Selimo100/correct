import { requireAuth } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/database.types"

type WalletEntry = Database["public"]["Tables"]["wallet_ledger"]["Row"] & {
  bets?: { title: string }
}

export const dynamic = "force-dynamic"

function formatTypeLabel(type: string) {
  return type
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatWhen(d: string) {
  // keep it simple + consistent
  return new Date(d).toLocaleString()
}

export default async function WalletPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  // Current balance
  // @ts-expect-error - Supabase RPC typing issue
  const { data: balance } = await supabase.rpc("get_balance", { p_user_id: user.id })
  const currentBalance = (balance as unknown as number) || 0

  // Ledger
  const { data: ledger } = await supabase
    .from("wallet_ledger")
    .select(
      `
      *,
      bets(title)
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  const entries = (ledger as WalletEntry[]) || []

  // Burgundy-first badge mapping (no rainbow UI)
  const typeBadge: Record<string, { cls: string; dot: string }> = {
    STARTER: { cls: "bg-primary-50 text-primary-700 border-primary-200", dot: "bg-primary-600" },
    BET_STAKE: { cls: "bg-gray-50 text-gray-700 border-gray-200", dot: "bg-gray-500" },
    BET_PAYOUT: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
    BET_REFUND: { cls: "bg-gray-50 text-gray-700 border-gray-200", dot: "bg-gray-500" },
    FEE: { cls: "bg-gray-50 text-gray-700 border-gray-200", dot: "bg-gray-500" },
    ADMIN_ADJUSTMENT: { cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10 space-y-6">
      {/* Hero */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-soft">
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
            Wallet
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Your Neos balance and transaction history.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
              Balance
            </span>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              Last 50 entries
            </span>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              Transparent ledger
            </span>
          </div>
        </div>
      </div>

      {/* Balance Card */}
      <div className="relative overflow-hidden rounded-3xl border border-primary-200 bg-gradient-to-br from-primary-600 to-primary-800 shadow-soft">
        {/* subtle glow */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

        <div className="relative p-6 sm:p-8 text-white">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-white/80">Current Balance</div>
              <div className="mt-2 flex items-baseline gap-2">
                <div className="text-4xl sm:text-5xl font-semibold tracking-tight">
                  {currentBalance}
                </div>
                <div className="text-sm font-semibold text-white/80">Neos</div>
              </div>
              <p className="mt-3 text-sm text-white/80">
                Neos are used to place stakes and receive payouts.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                Secure ledger
              </span>
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                Instant updates
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-soft overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Transaction History</h2>
              <p className="mt-1 text-sm text-gray-600">
                Most recent entries first.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              {entries.length} shown
            </span>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary-50 text-primary-700 font-extrabold">
              N
            </div>
            <p className="mt-4 text-sm font-semibold text-gray-900">No transactions yet.</p>
            <p className="mt-1 text-sm text-gray-600">
              Once you place bets or receive payouts, they will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {entries.map((entry) => {
              const badge = typeBadge[entry.type] || {
                cls: "bg-gray-50 text-gray-700 border-gray-200",
                dot: "bg-gray-500",
              }

              const betTitle = entry.bets?.title
              const amountPositive = entry.amount > 0

              return (
                <div key={entry.id} className="px-5 py-4 sm:px-6 hover:bg-primary-50/40 transition">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${badge.cls}`}>
                          <span className={`h-2 w-2 rounded-full ${badge.dot}`} />
                          {formatTypeLabel(entry.type)}
                        </span>

                        {betTitle && (
                          <span className="text-sm font-semibold text-gray-900">
                            {betTitle.length > 70 ? betTitle.slice(0, 70) + "…" : betTitle}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span>{formatWhen(entry.created_at)}</span>

                        {entry.metadata && (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 font-semibold text-gray-700">
                            Details available
                          </span>
                        )}
                      </div>

                      {/* If you really want to show metadata, keep it small and readable */}
                      {entry.metadata && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs font-semibold text-primary-700 hover:underline">
                            View details
                          </summary>
                          <pre className="mt-2 overflow-auto rounded-2xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
                            {JSON.stringify(entry.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <div
                        className={`text-lg font-semibold ${
                          amountPositive ? "text-emerald-700" : "text-gray-900"
                        }`}
                      >
                        {amountPositive ? "+" : ""}
                        {entry.amount} <span className="text-sm font-semibold text-gray-500">Neos</span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {amountPositive ? "Credit" : "Debit"}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* About Neos */}
      <div className="rounded-3xl border border-primary-200 bg-primary-50 p-5 sm:p-6">
        <h3 className="text-base font-semibold text-gray-900">About Neos</h3>
        <ul className="mt-3 space-y-2 text-sm text-gray-700 list-disc list-inside">
          <li>New users receive 100 Neos as a starter bonus</li>
          <li>Use Neos to place stakes on bets</li>
          <li>Win Neos by betting correctly</li>
          <li>All transactions are recorded in your ledger</li>
        </ul>
      </div>
    </div>
  )
}
