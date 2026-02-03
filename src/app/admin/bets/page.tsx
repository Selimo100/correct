import { requireAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import type { Database } from "@/lib/database.types"

type Bet = Database["public"]["Tables"]["bets"]["Row"] & {
  profiles?: { username: string }
}

export const dynamic = "force-dynamic"

function formatDay(d: string) {
  return new Date(d).toLocaleDateString()
}

function statusBadge(status: string) {
  const base = "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
  switch (status) {
    case "OPEN":
      return `${base} bg-primary-50 text-primary-700 border-primary-200`
    case "RESOLVED":
      return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`
    case "VOID":
      return `${base} bg-gray-100 text-gray-700 border-gray-200`
    default:
      return `${base} bg-gray-100 text-gray-700 border-gray-200`
  }
}

export default async function ModerateBetsPage() {
  await requireAdmin()
  const supabase = await createClient()

  const { data: allBets } = await supabase
    .from("bets")
    .select(
      `
      *,
      profiles!bets_creator_id_fkey(username)
    `
    )
    .order("created_at", { ascending: false })

  const betList = (allBets as Bet[]) || []
  const hiddenBets = betList.filter((b) => b.hidden)
  const visibleBets = betList.filter((b) => !b.hidden)

  async function toggleHidden(formData: FormData) {
    "use server"
    await requireAdmin()
    const supabase = await createClient()

    const betId = formData.get("bet_id") as string
    const currentHidden = formData.get("current_hidden") === "true"

    await supabase
      .from("bets")
      // @ts-expect-error - 'hidden' is valid but types might be outdated
      .update({ hidden: !currentHidden })
      .eq("id", betId)

    const admin = await requireAdmin()
    // @ts-expect-error - 'admin_actions' types are outdated
    await supabase.from("admin_actions").insert({
      admin_id: admin.id,
      action: currentHidden ? "UNHIDE_BET" : "HIDE_BET",
      target_type: "BET",
      target_id: betId,
    })

    const { revalidatePath } = await import("next/cache")
    revalidatePath("/admin/bets")
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10 space-y-6">
      {/* Hero */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-soft">
        <div className="p-6 sm:p-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
              Moderate Bets
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Hide problematic bets from the public feed and keep the platform clean.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                Content moderation
              </span>
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                Hide / Unhide
              </span>
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                Audit log
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

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Total Bets
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-3xl font-semibold text-gray-900">{betList.length}</div>
            <div className="text-sm font-semibold text-gray-500">bets</div>
          </div>
          <p className="mt-2 text-sm text-gray-600">All statuses included.</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Visible
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-3xl font-semibold text-primary-700">{visibleBets.length}</div>
            <div className="text-sm font-semibold text-gray-500">shown</div>
          </div>
          <p className="mt-2 text-sm text-gray-600">Appears in feeds.</p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Hidden
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-3xl font-semibold text-gray-900">{hiddenBets.length}</div>
            <div className="text-sm font-semibold text-gray-500">hidden</div>
          </div>
          <p className="mt-2 text-sm text-gray-600">Removed from public view.</p>
        </div>
      </div>

      {/* Hidden Bets */}
      {hiddenBets.length > 0 && (
        <div className="rounded-3xl border border-gray-200 bg-white shadow-soft overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Hidden Bets</h2>
                <p className="mt-1 text-sm text-gray-600">Currently not visible in feeds.</p>
              </div>
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                {hiddenBets.length}
              </span>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {hiddenBets.map((bet) => (
              <div key={bet.id} className="px-5 py-4 sm:px-6 hover:bg-primary-50/40 transition">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/bets/${bet.id}`}
                      className="block truncate text-sm font-semibold text-gray-900 hover:text-primary-700"
                    >
                      {bet.title}
                    </Link>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={statusBadge(bet.status)}>{bet.status}</span>

                      <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                        @{bet.profiles?.username || "unknown"}
                      </span>

                      <span className="text-xs text-gray-500">
                        Created {formatDay(bet.created_at)}
                      </span>

                      <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                        Hidden
                      </span>
                    </div>
                  </div>

                  <form action={toggleHidden} className="shrink-0">
                    <input type="hidden" name="bet_id" value={bet.id} />
                    <input type="hidden" name="current_hidden" value="true" />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-700"
                    >
                      Unhide
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visible Bets */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-soft overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Visible Bets</h2>
              <p className="mt-1 text-sm text-gray-600">Shown in feeds and searchable.</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
              {visibleBets.length}
            </span>
          </div>
        </div>

        {visibleBets.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-gray-900">No visible bets.</p>
            <p className="mt-1 text-sm text-gray-600">If this is unexpected, check filters or data.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {visibleBets.map((bet) => (
              <div key={bet.id} className="px-5 py-4 sm:px-6 hover:bg-primary-50/40 transition">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/bets/${bet.id}`}
                      className="block truncate text-sm font-semibold text-gray-900 hover:text-primary-700"
                    >
                      {bet.title}
                    </Link>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={statusBadge(bet.status)}>{bet.status}</span>

                      <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                        @{bet.profiles?.username || "unknown"}
                      </span>

                      <span className="text-xs text-gray-500">
                        Created {formatDay(bet.created_at)}
                      </span>

                      <span className="text-xs text-gray-500">
                        {/* @ts-expect-error - total_pot might not be in type definition yet */}
                        Pot: {bet.total_pot || 0} Neos
                      </span>
                    </div>
                  </div>

                  <form action={toggleHidden} className="shrink-0">
                    <input type="hidden" name="bet_id" value={bet.id} />
                    <input type="hidden" name="current_hidden" value="false" />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-primary-50 hover:text-primary-700"
                    >
                      Hide
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
