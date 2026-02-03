"use client"

import { useEffect, useState } from "react"
import { friends } from "@/lib/friends"
import UserSearch from "./UserSearch"

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

export default function FriendsList() {
  const [activeTab, setActiveTab] = useState<"FRIENDS" | "REQUESTS">("FRIENDS")
  const [friendList, setFriendList] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const [f, r] = await Promise.all([friends.getFriends(), friends.getRequests()])
      setFriendList(f || [])
      setRequests(r || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRespond = async (id: string, accept: boolean) => {
    try {
      await friends.respondToRequest(id, accept)
      loadData()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const tabs = [
    { key: "FRIENDS" as const, label: "Friends", count: friendList.length },
    { key: "REQUESTS" as const, label: "Requests", count: requests.length },
  ]

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10 space-y-6">
      {/* Hero */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-soft">
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
            Friends & Connections
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Add friends, manage requests, and build your betting circle.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
              Friends feed
            </span>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              Private bets
            </span>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              Groups
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Add + tips */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6 shadow-soft">
            <h2 className="text-base font-semibold text-gray-900">Add Friend</h2>
            <p className="mt-1 text-sm text-gray-600">
              Search by username and send a request.
            </p>
            <div className="mt-4">
              <UserSearch />
            </div>
          </div>

          <div className="rounded-3xl border border-primary-200 bg-primary-50 p-5 sm:p-6">
            <h3 className="text-base font-semibold text-gray-900">Why add friends?</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-700 list-disc list-inside">
              <li>See their bets in your Friends feed</li>
              <li>Invite them to private bets faster</li>
              <li>Add them to Groups for shared pools</li>
            </ul>
          </div>
        </div>

        {/* Right: Tabs + list */}
        <div className="lg:col-span-8 space-y-4">
          {/* Tabs */}
          <div className="rounded-3xl border border-gray-200 bg-white p-3 shadow-soft">
            <div className="flex gap-2">
              {tabs.map((t) => {
                const active = activeTab === t.key
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActiveTab(t.key)}
                    className={cn(
                      "flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition border",
                      active
                        ? "bg-primary-600 text-white border-primary-600 shadow-soft"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-primary-50 hover:text-primary-700"
                    )}
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      {t.label}
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                          active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
                        )}
                      >
                        {t.count}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Content */}
          <div className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6 shadow-soft">
            {loading ? (
              <div className="flex items-center justify-center gap-3 py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
                <div className="text-sm font-semibold text-gray-700">Loading…</div>
              </div>
            ) : (
              <div className="space-y-4">
                {activeTab === "FRIENDS" && (
                  <>
                    {friendList.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
                        <p className="text-sm font-semibold text-gray-900">No friends yet.</p>
                        <p className="mt-1 text-sm text-gray-600">
                          Search for a username to get started.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {friendList.map((friend) => (
                          <div
                            key={friend.id}
                            className="rounded-3xl border border-gray-200 bg-white p-4 sm:p-5 transition hover:border-primary-200 hover:shadow-md"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-4 min-w-0">
                                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-50 text-primary-700 font-extrabold">
                                  {String(friend.username || "?").charAt(0).toUpperCase()}
                                </div>

                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-gray-900">
                                    @{friend.username}
                                  </div>
                                  <div className="truncate text-sm text-gray-600">
                                    {friend.first_name} {friend.last_name}
                                  </div>
                                </div>
                              </div>

                              <span className="shrink-0 inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                                Friend
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {activeTab === "REQUESTS" && (
                  <>
                    {requests.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
                        <p className="text-sm font-semibold text-gray-900">No pending requests.</p>
                        <p className="mt-1 text-sm text-gray-600">You are all caught up.</p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {requests.map((req) => (
                          <div
                            key={req.id}
                            className="rounded-3xl border border-gray-200 bg-white p-4 sm:p-5 transition hover:border-primary-200 hover:shadow-md"
                          >
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-4 min-w-0">
                                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gray-100 text-gray-500 font-bold">
                                  {String(req?.profiles?.username || "?")
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>

                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-gray-900">
                                    @{req.profiles.username}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    Sent on{" "}
                                    {new Date(req.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleRespond(req.id, true)}
                                  className="inline-flex items-center justify-center rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-700"
                                >
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRespond(req.id, false)}
                                  className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-primary-50 hover:text-primary-700"
                                >
                                  Decline
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
