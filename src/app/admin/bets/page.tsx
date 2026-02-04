import { requireAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

type AdminBet = {
  bet_id: string
  title: string
  description: string
  end_at: string
  created_at: string
  hidden: boolean
  status: string
  derived_status: "OPEN" | "LOCKED" | "RESOLVED" | "VOID"
  visibility: string
  audience: string
  creator_username: string
  category_slug: string | null
  category_name: string | null
  pot: number
  participants: number
  for_total: number
  against_total: number
}

type BetCounts = {
  total: number
  visible: number
  hidden: number
  open: number
  locked: number
  resolved: number
  void: number
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function formatDay(d: string) {
  return new Date(d).toLocaleDateString()
}

// If this is Neos, you may want to show "Neos" instead of USD.
// Keeping your function name but changing output to be simple + readable.
function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)
}

function statusBadge(status: string) {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold"

  switch (status) {
    case "OPEN":
      return `${base} bg-primary-50 text-primary-800 border-primary-200`
    case "LOCKED":
      return `${base} bg-amber-50 text-amber-800 border-amber-200`
    case "RESOLVED":
      return `${base} bg-emerald-50 text-emerald-800 border-emerald-200`
    case "VOID":
      return `${base} bg-gray-100 text-gray-700 border-gray-200`
    default:
      return `${base} bg-gray-100 text-gray-700 border-gray-200`
  }
}

function statusDot(status: AdminBet["derived_status"], hidden: boolean) {
  if (hidden) return "bg-[#EF4444]"
  switch (status) {
    case "OPEN":
      return "bg-primary-600"
    case "LOCKED":
      return "bg-amber-500"
    case "RESOLVED":
      return "bg-[#22C55E]"
    case "VOID":
      return "bg-gray-400"
    default:
      return "bg-gray-400"
  }
}

function buildHref(params: {
  page?: number
  status?: string
  hidden?: string
  search?: string
  sort?: string
}) {
  const sp = new URLSearchParams()
  if (params.page && params.page !== 1) sp.set("page", String(params.page))
  if (params.search) sp.set("search", params.search)
  if (params.status && params.status !== "all") sp.set("status", params.status)
  if (params.hidden && params.hidden !== "all") sp.set("hidden", params.hidden)
  if (params.sort && params.sort !== "newest") sp.set("sort", params.sort)
  const qs = sp.toString()
  return qs ? `/admin/bets?${qs}` : "/admin/bets"
}

export default async function ModerateBetsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  await requireAdmin()
  const supabase = await createClient()

  const page = Number(searchParams.page) || 1
  const search = typeof searchParams.search === "string" ? searchParams.search : ""
  const hiddenFilter = typeof searchParams.hidden === "string" ? searchParams.hidden : "all"
  const statusFilter = typeof searchParams.status === "string" ? searchParams.status : "all"
  const sort = typeof searchParams.sort === "string" ? searchParams.sort : "newest"

  const limit = 50
  const offset = (page - 1) * limit

  const rpcParams = {
    p_search: search || null,
    p_hidden: hiddenFilter,
    p_status: statusFilter,
    p_category_id: null,
    p_sort: sort,
    p_limit: limit,
    p_offset: offset,
  }

  const [listRes, countRes] = await Promise.all([
    // @ts-expect-error - rpc types are having trouble resolving the args type
    supabase.rpc("fn_admin_list_bets", rpcParams),
    supabase.rpc("fn_admin_bet_counts"),
  ])

  if (listRes.error) {
    console.error("RPC Error (List):", listRes.error)
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
          Error loading bets: {listRes.error.message}
        </div>
      </div>
    )
  }

  if (countRes.error) {
    console.error("RPC Error (Counts):", countRes.error)
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
          Error loading counts: {countRes.error.message}
        </div>
      </div>
    )
  }

  const bets = (listRes.data as AdminBet[]) || []
  const counts =
    (countRes.data as BetCounts) || ({
      total: 0,
      visible: 0,
      hidden: 0,
      open: 0,
      locked: 0,
      resolved: 0,
      void: 0,
    } satisfies BetCounts)

  async function toggleHidden(formData: FormData) {
    "use server"
    await requireAdmin()
    const supabaseAction = await createClient()

    const betId = formData.get("bet_id") as string
    const currentHidden = formData.get("current_hidden") === "true"
    const newHidden = !currentHidden

    // @ts-expect-error - update types are failing validation despite correct schema
    const { error } = await supabaseAction.from("bets").update({ hidden: newHidden }).eq("id", betId)
    if (error) {
      console.error("Update Error:", error)
      throw new Error("Failed to update bet visibility")
    }

    // @ts-expect-error - admin_actions types might be incomplete
    await supabaseAction.from("admin_actions").insert({
      admin_id: (await supabaseAction.auth.getUser()).data.user?.id,
      action: newHidden ? "HIDE_BET" : "UNHIDE_BET",
      target_type: "BET",
      target_id: betId,
      metadata: { from_admin_page: true },
    })

    revalidatePath("/admin/bets")
  }

  const statusTabs = [
    { id: "all", label: "All", count: counts.total },
    { id: "open", label: "Open", count: counts.open },
    { id: "locked", label: "Locked", count: counts.locked },
    { id: "resolved", label: "Resolved", count: counts.resolved },
    { id: "void", label: "Void", count: counts.void },
  ] as const

  const visibilityTabs = [
    { id: "all", label: "Any" },
    { id: "visible", label: `Visible (${counts.visible})` },
    { id: "hidden", label: `Hidden (${counts.hidden})` },
  ] as const

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* soft background */}
      <div className="">
        <div className="" />
        <div className="absolute -bottom-28 left-[-10%] h-72 w-72 rounded-full bg-primary-100/60 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-200/60 to-transparent" />
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-2 text-xs font-semibold text-primary-800 shadow-sm">
            <span className="inline-flex h-2 w-2 rounded-full bg-primary-600" />
            Admin • Moderate Bets
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Moderate Bets
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Search, filter, and hide/unhide bets (including private ones).
          </p>
        </div>

        <Link
          href="/admin"
          className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-primary-50 hover:text-primary-800"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total</div>
          <div className="mt-2 text-3xl font-semibold text-gray-900">{counts.total}</div>
          <div className="mt-2 text-xs text-gray-500">All bets on the platform</div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Visible</div>
          <div className="mt-2 text-3xl font-semibold text-gray-900">{counts.visible}</div>
          <div className="mt-2 text-xs text-gray-500">Shown in feed</div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Hidden</div>
          <div className="mt-2 text-3xl font-semibold text-[#EF4444]">{counts.hidden}</div>
          <div className="mt-2 text-xs text-gray-500">Moderated out of feed</div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Locked</div>
          <div className="mt-2 text-3xl font-semibold text-amber-700">{counts.locked}</div>
          <div className="mt-2 text-xs text-gray-500">Past end date, awaiting resolution</div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary-400 via-primary-600 to-primary-800" />

        <div className="p-5 sm:p-6 space-y-5">
          {/* Search row */}
          <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                🔎
              </div>
              <input
                name="search"
                defaultValue={search}
                placeholder="Search title, description, creator..."
                className="block w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-500 focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-200"
              />
              <input type="hidden" name="status" value={statusFilter} />
              <input type="hidden" name="hidden" value={hiddenFilter} />
              <input type="hidden" name="sort" value={sort} />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
              >
                Search
              </button>

              {search && (
                <Link
                  href={buildHref({ status: statusFilter, hidden: hiddenFilter, sort })}
                  className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Clear
                </Link>
              )}
            </div>
          </form>

          {/* Status tabs */}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Status
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {statusTabs.map((tab) => {
                const active = statusFilter === tab.id
                return (
                  <Link
                    key={tab.id}
                    href={buildHref({ status: tab.id, hidden: hiddenFilter, search, sort, page: 1 })}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
                      active
                        ? "border-primary-200 bg-primary-50 text-primary-800"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    {tab.label}
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        active ? "bg-primary-100 text-primary-800" : "bg-gray-100 text-gray-600"
                      )}
                    >
                      {tab.count}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Visibility + Sort */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Visibility
              </div>
              <div className="flex flex-wrap gap-2">
                {visibilityTabs.map((tab) => {
                  const active = hiddenFilter === tab.id
                  return (
                    <Link
                      key={tab.id}
                      href={buildHref({ status: statusFilter, hidden: tab.id, search, sort, page: 1 })}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-semibold transition",
                        active
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      {tab.label}
                    </Link>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:items-end">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Sort
              </div>
              <div className="flex rounded-2xl bg-gray-100 p-1">
                {[
                  { id: "newest", label: "Newest" },
                  { id: "oldest", label: "Oldest" },
                  { id: "ending", label: "Ending" },
                ].map((s) => {
                  const active = sort === s.id
                  return (
                    <Link
                      key={s.id}
                      href={buildHref({ status: statusFilter, hidden: hiddenFilter, search, sort: s.id, page: 1 })}
                      className={cn(
                        "rounded-xl px-3 py-2 text-xs font-semibold transition",
                        active ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-800"
                      )}
                    >
                      {s.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900">Results</div>
              <div className="text-xs text-gray-500">
                Page <span className="font-semibold text-gray-900">{page}</span> • Showing{" "}
                <span className="font-semibold text-gray-900">{bets.length}</span> items
              </div>
            </div>

            <Link
              href="/admin"
              className="hidden sm:inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Admin Home
            </Link>
          </div>
        </div>

        {bets.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-gray-50 p-6">
              <div className="text-4xl">🫥</div>
              <div className="mt-3 text-sm font-semibold text-gray-900">No bets found</div>
              <div className="mt-1 text-sm text-gray-600">
                Try adjusting your search or filters.
              </div>
            </div>
          </div>
        ) : (
          <ul role="list" className="divide-y divide-gray-100">
            {bets.map((bet) => (
              <li
                key={bet.bet_id}
                className={cn(
                  "relative px-4 py-5 sm:px-6 transition",
                  bet.hidden ? "bg-red-50/40" : "hover:bg-gray-50"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 gap-4">
                    {/* left dot */}
                    <div
                      className={cn(
                        "mt-1 h-3 w-3 shrink-0 rounded-full",
                        statusDot(bet.derived_status, bet.hidden)
                      )}
                      aria-hidden="true"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/bets/${bet.bet_id}`}
                          className="min-w-0 truncate text-sm font-semibold text-gray-900 hover:text-primary-800"
                        >
                          {bet.title}
                        </Link>

                        <span className={statusBadge(bet.derived_status)}>{bet.derived_status}</span>

                        {bet.hidden && (
                          <span className="inline-flex items-center rounded-full border border-red-200 bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-[#EF4444]">
                            Hidden
                          </span>
                        )}

                        {bet.audience && bet.audience !== "PUBLIC" && (
                          <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700">
                            {bet.audience}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span>
                          by <span className="font-semibold text-gray-900">@{bet.creator_username || "unknown"}</span>
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span>
                          {bet.category_name ? (
                            <span className="font-semibold text-gray-900">{bet.category_name}</span>
                          ) : (
                            "Uncategorized"
                          )}
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span>Created {formatDay(bet.created_at)}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>Ends {formatDay(bet.end_at)}</span>
                      </div>

                      {bet.description && (
                        <p className="mt-2 line-clamp-2 text-sm text-gray-600 max-w-3xl">
                          {bet.description}
                        </p>
                      )}

                      {/* compact metrics */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                          Pot: {formatCurrency(bet.pot)} Neos
                        </span>
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                          Participants: {bet.participants}
                        </span>

                        {/* Optional distribution */}
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                          FOR: <span className="ml-1 text-[#22C55E]">{formatCurrency(bet.for_total)}</span>
                        </span>
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                          AGAINST: <span className="ml-1 text-[#EF4444]">{formatCurrency(bet.against_total)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    <form action={toggleHidden}>
                      <input type="hidden" name="bet_id" value={bet.bet_id} />
                      <input type="hidden" name="current_hidden" value={String(bet.hidden)} />
                      <button
                        type="submit"
                        className={cn(
                          "inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition",
                          bet.hidden
                            ? "border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
                            : "border-red-200 bg-white text-[#EF4444] hover:bg-red-50"
                        )}
                      >
                        {bet.hidden ? "Unhide" : "Hide"}
                      </button>
                    </form>

                    <Link
                      href={`/bets/${bet.bet_id}`}
                      className="hidden sm:inline-flex items-center justify-center rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
                    >
                      View
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page <span className="font-semibold text-gray-900">{page}</span>
          </div>

          <div className="flex gap-2">
            <Link
              href={buildHref({ page: Math.max(1, page - 1), status: statusFilter, hidden: hiddenFilter, search, sort })}
              className={cn(
                "inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition",
                page <= 1
                  ? "pointer-events-none opacity-50 border-gray-200 bg-white text-gray-500"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              )}
            >
              Previous
            </Link>

            <Link
              href={buildHref({ page: page + 1, status: statusFilter, hidden: hiddenFilter, search, sort })}
              className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Next
            </Link>
          </div>
        </div>
      </div>

      {/* Debug */}
      {process.env.NODE_ENV !== "production" && (
        <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600">
          <div className="font-mono space-y-1">
            <div>Status Filter: {statusFilter}</div>
            <div>Hidden Filter: {hiddenFilter}</div>
            <div>Sort: {sort}</div>
            <div>List Count: {bets.length}</div>
          </div>
        </div>
      )}
    </div>
  )
}
