import { createClient } from "@/lib/supabase/server"
import BetCard from "@/components/BetCard"
import Link from "next/link"
import SearchFilters from "@/components/SearchFilters"
import { Globe, Users, UserCheck } from "lucide-react"

// Type definition to satisfy BetCard props (which expects DB Row structure)
type Bet = any

export const dynamic = "force-dynamic"

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const supabase = await createClient()

  // Parse params
  const q = typeof searchParams.q === "string" ? searchParams.q : undefined
  const categoryId =
    typeof searchParams.category === "string" && searchParams.category
      ? searchParams.category
      : undefined

  // Default status
  let status: string | undefined =
    typeof searchParams.status === "string" ? searchParams.status : "OPEN"
  if (status === "ALL" || !status) status = undefined

  const sort = typeof searchParams.sort === "string" ? searchParams.sort : "newest"

  // Ensure feed is one of the valid values
  let feedVal = typeof searchParams.feed === "string" ? searchParams.feed : "PUBLIC"
  if (!["PUBLIC", "FRIENDS", "GROUPS"].includes(feedVal)) {
    feedVal = "PUBLIC"
  }
  const feed = feedVal as "PUBLIC" | "FRIENDS" | "GROUPS"

  // Fetch categories for filter
  const { data: categories } = await (supabase.rpc as any)("fn_list_categories", {
    p_include_inactive: false,
  })

  // Fetch bets using search RPC V2
  const { data: searchResults, error } = await (supabase.rpc as any)("fn_search_bets_v2", {
    p_search_text: q,
    p_category_id: categoryId,
    p_status: status,
    p_sort_by: sort,
    p_limit: 50,
    p_audience_scope: feed,
  })

  if (error) {
    console.error("RPC fn_search_bets_v2 failed", error)
  }

  // Map result to BetCard structure
  const bets: Bet[] = (searchResults || []).map((res: any) => ({
    ...res,
    profiles: {
      username: res.creator_username,
      avatar_url: res.creator_avatar_url,
    },
    group: res.group_name ? { name: res.group_name, id: res.group_id } : undefined,
    stats: {
      total_pot: res.total_pot,
      participant_count: res.participant_count,
      for_stake: res.for_stake,
      against_stake: res.against_stake,
    },
  }))

  const getTabUrl = (tabName: string) => {
    const newParams = new URLSearchParams()
    Object.entries(searchParams).forEach(([key, value]) => {
      if (key !== "feed" && typeof value === "string") {
        newParams.set(key, value)
      }
    })
    newParams.set("feed", tabName)
    return `/?${newParams.toString()}`
  }

  const feedMeta = {
    PUBLIC: {
      label: "Public",
      icon: Globe,
      desc: "Everyone can see these bets.",
    },
    FRIENDS: {
      label: "Friends",
      icon: UserCheck,
      desc: "Only bets from your friends.",
    },
    GROUPS: {
      label: "Groups",
      icon: Users,
      desc: "Bets posted into your groups.",
    },
  } as const

  const ActiveIcon = feedMeta[feed].icon

  return (
    <div className="space-y-6">
      {/* HERO HEADER */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-soft">
        <div className="p-5 sm:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-700 text-white shadow-soft">
                  <ActiveIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
                    Betting Feed
                  </h1>
                  <p className="mt-1 text-sm text-gray-600">{feedMeta[feed].desc}</p>
                </div>
              </div>

              {/* quick pills */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                  {feedMeta[feed].label} feed
                </span>
                {status ? (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                    Status: {status}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                    Status: All
                  </span>
                )}
                {q ? (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                    Search: “{q}”
                  </span>
                ) : null}
              </div>
            </div>

            <Link
              href="/bets/new"
              className="inline-flex items-center justify-center rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-700 whitespace-nowrap"
            >
              Create Bet
            </Link>
          </div>
        </div>

        {/* FEED TABS as pills */}
        <div className="border-t border-gray-200 px-3 sm:px-5 py-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {(["PUBLIC", "FRIENDS", "GROUPS"] as const).map((key) => {
              const Icon = feedMeta[key].icon
              const active = feed === key

              return (
                <Link
                  key={key}
                  href={getTabUrl(key)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition whitespace-nowrap",
                    "border",
                    active
                      ? "bg-primary-600 text-white border-primary-600 shadow-soft"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-primary-50 hover:text-primary-700"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {feedMeta[key].label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* FILTERS CARD */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-soft">
        <div className="p-4 sm:p-6">
          <SearchFilters categories={(categories as unknown as any[]) || []} />
        </div>
      </div>

      {/* RESULTS */}
      {!bets || bets.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white shadow-soft">
          <div className="p-10 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary-50 text-primary-700">
              <ActiveIcon className="h-6 w-6" />
            </div>

            <p className="mt-4 text-sm font-medium text-gray-900">
              {feed === "FRIENDS"
                ? "No active bets from your friends."
                : feed === "GROUPS"
                  ? "No active bets in your groups."
                  : "No bets matching your filters."}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Try changing filters or create a new bet.
            </p>

            <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2">
              <Link
                href="/bets/new"
                className="inline-flex items-center justify-center rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-700"
              >
                Create Bet
              </Link>

              {feed === "FRIENDS" && (
                <Link
                  href="/friends"
                  className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-primary-50 hover:text-primary-700"
                >
                  Manage Friends
                </Link>
              )}

              {feed === "GROUPS" && (
                <Link
                  href="/groups"
                  className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-primary-50 hover:text-primary-700"
                >
                  Join or Create Groups
                </Link>
              )}

              {(q || categoryId || status) && feed === "PUBLIC" && (
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-primary-50 hover:text-primary-700"
                >
                  Clear filters
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {bets.map((bet) => (
            <BetCard key={bet.id} bet={bet} />
          ))}
        </div>
      )}
    </div>
  )
}
