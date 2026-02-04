"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Ban, Eye, EyeOff, RefreshCw } from "lucide-react"
import { setBetHiddenAction, resolveBetAction, voidBetAction } from "@/app/actions/admin"

export type AdminBet = {
  id: string
  title: string
  description: string
  creator_id: string
  creator_name: string
  creator_username: string
  category: string
  end_at: string
  created_at: string
  status: string
  derived_status: string
  hidden: boolean
  resolution: boolean | null
  participants_count: number
  total_pot: number
}

interface ModerationTableProps {
  bets: AdminBet[]
  page?: number
  pageSize?: number
  total?: number
  showTabs?: boolean
  title?: string
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

const TABS = ["ALL", "OPEN", "LOCKED", "RESOLVED", "VOID", "HIDDEN"] as const
type Tab = (typeof TABS)[number]

export default function ModerationTable({
  bets,
  page = 1,
  pageSize = 50,
  total = 0,
  showTabs = true,
  title,
}: ModerationTableProps) {
  const searchParams = useSearchParams()
  const currentStatus = (searchParams.get("status") || "ALL") as Tab
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const tabCounts = useMemo(() => {
    const c: Record<Tab, number> = {
      ALL: bets.length,
      OPEN: 0,
      LOCKED: 0,
      RESOLVED: 0,
      VOID: 0,
      HIDDEN: 0,
    }
    for (const b of bets) {
      if (b.hidden) c.HIDDEN += 1
      if (b.status === "VOID") c.VOID += 1
      else if (b.status === "RESOLVED") c.RESOLVED += 1
      else if (b.derived_status === "LOCKED") c.LOCKED += 1
      else c.OPEN += 1
    }
    return c
  }, [bets])

  const handleHideToggle = async (bet: AdminBet) => {
    if (!confirm(bet.hidden ? "Unhide this bet?" : "Hide this bet?")) return
    setLoadingId(bet.id)
    try {
      await setBetHiddenAction(bet.id, !bet.hidden)
    } catch (e) {
      alert("Error: " + e)
    } finally {
      setLoadingId(null)
    }
  }

  const handleResolve = async (bet: AdminBet, outcome: boolean) => {
    if (!confirm(`Resolve as ${outcome ? "YES/FOR" : "NO/AGAINST"}? This will process payouts.`)) return
    setLoadingId(bet.id)
    try {
      await resolveBetAction(bet.id, outcome)
    } catch (e) {
      alert("Error: " + e)
    } finally {
      setLoadingId(null)
    }
  }

  const handleVoid = async (bet: AdminBet) => {
    if (!confirm("VOID this bet? All stakes will be refunded.")) return
    setLoadingId(bet.id)
    try {
      await voidBetAction(bet.id)
    } catch (e) {
      alert("Error: " + e)
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {(title || showTabs) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {title && <h3 className="text-xl font-semibold tracking-tight text-gray-900">{title}</h3>}
            <p className="mt-1 text-sm text-gray-600">
              Review bets, resolve locked ones, and hide content when necessary.
            </p>
          </div>

          {/* Tiny meta (optional) */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-soft">
              Page {page}
            </span>
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-soft">
              Showing {bets.length}
              {total ? ` / ${total}` : ""}
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      {showTabs && (
        <div className="rounded-3xl border border-gray-200 bg-white p-2 shadow-soft">
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => {
              const active = currentStatus === tab
              return (
                <Link
                  key={tab}
                  href={`?status=${tab}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
                    active
                      ? "bg-primary-600 text-white shadow-soft"
                      : "bg-white text-gray-700 hover:bg-primary-50 hover:text-primary-700"
                  )}
                >
                  <span>{tab}</span>
                  <span
                    className={cn(
                      "inline-flex min-w-8 justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
                    )}
                  >
                    {tabCounts[tab]}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* List (responsive) */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-soft overflow-hidden">
        {bets.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gray-100 text-gray-700">
              <span className="text-lg font-bold">?</span>
            </div>
            <div className="text-sm font-semibold text-gray-900">No bets found</div>
            <div className="mt-1 text-sm text-gray-600">Try changing filters or the status tab.</div>
          </div>
        ) : (
          <ul role="list" className="divide-y divide-gray-100">
            {bets.map((bet) => {
              const isLocked = bet.derived_status === "LOCKED"
              const isResolved = bet.status === "RESOLVED"
              const isVoid = bet.status === "VOID"
              const isLoading = loadingId === bet.id

              return (
                <li key={bet.id} className={cn("px-4 py-4 sm:px-6", bet.hidden && "bg-red-50/40")}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left */}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-gray-900">{bet.title}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                            <span>
                              by <span className="font-semibold text-gray-900">@{bet.creator_username}</span>
                            </span>
                            <span className="text-gray-300">•</span>
                            <span>{bet.category || "Uncategorized"}</span>
                          </div>
                        </div>

                        <StatusBadge status={bet.status} derived={bet.derived_status} resolution={bet.resolution} />

                        {bet.hidden && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                            <EyeOff className="h-3.5 w-3.5" />
                            Hidden
                          </span>
                        )}
                      </div>

                      {bet.description && (
                        <p className="mt-2 line-clamp-2 text-sm text-gray-600">{bet.description}</p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 font-semibold text-gray-700">
                          {bet.participants_count} participants
                        </span>
                        <span className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-1 font-semibold text-primary-700">
                          {bet.total_pot} Neos
                        </span>
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 font-semibold text-gray-700">
                          Ends {new Date(bet.end_at).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center justify-end gap-2 sm:justify-start">
                      {isLoading && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Working…
                        </span>
                      )}

                      {!isLoading && (
                        <>
                          <button
                            onClick={() => handleHideToggle(bet)}
                            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-soft transition hover:bg-primary-50 hover:text-primary-700"
                            title={bet.hidden ? "Unhide" : "Hide"}
                          >
                            {bet.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            <span className="hidden sm:inline">{bet.hidden ? "Unhide" : "Hide"}</span>
                          </button>

                          {isLocked && !isResolved && !isVoid && (
                            <>
                              <button
                                onClick={() => handleResolve(bet, true)}
                                className="inline-flex items-center rounded-full bg-[#22C55E] px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:opacity-90"
                                title="Resolve FOR"
                              >
                                FOR
                              </button>
                              <button
                                onClick={() => handleResolve(bet, false)}
                                className="inline-flex items-center rounded-full bg-[#EF4444] px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:opacity-90"
                                title="Resolve AGAINST"
                              >
                                AGAINST
                              </button>
                              <button
                                onClick={() => handleVoid(bet)}
                                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-soft transition hover:bg-red-50 hover:text-red-700"
                                title="Void bet"
                              >
                                <Ban className="h-4 w-4" />
                                <span className="hidden sm:inline">Void</span>
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Optional helper footer */}
      <div className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <span>
          Tip: Locked bets can be resolved or voided. Hidden bets stay hidden from feeds.
        </span>
        <span className="font-semibold text-gray-900">
          Page size: {pageSize}
        </span>
      </div>
    </div>
  )
}

function StatusBadge({
  status,
  derived,
  resolution,
}: {
  status: string
  derived: string
  resolution: boolean | null
}) {
  // VOID
  if (status === "VOID") {
    return (
      <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
        Voided
      </span>
    )
  }

  // RESOLVED
  if (status === "RESOLVED") {
    const winFor = Boolean(resolution)
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
          winFor
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-red-200 bg-red-50 text-red-700"
        )}
      >
        {winFor ? "FOR wins" : "AGAINST wins"}
      </span>
    )
  }

  // LOCKED
  if (derived === "LOCKED") {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
        Locked
      </span>
    )
  }

  // OPEN default
  return (
    <span className="inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
      Open
    </span>
  )
}
