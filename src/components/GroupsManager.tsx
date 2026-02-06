"use client"

import { useState, useEffect } from "react"
import { groups, friends } from "@/lib/friends"

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

const fieldBase =
  "block w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 " +
  "placeholder:text-gray-500 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-200"

export default function GroupsManager() {
  const [myGroups, setMyGroups] = useState<any[]>([])
  const [myFriends, setMyFriends] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [showCreate, setShowCreate] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)

  const [addingMember, setAddingMember] = useState(false)
  const [members, setMembers] = useState<any[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  useEffect(() => {
    if (selectedGroup) {
      setLoadingMembers(true)
      groups.getMembers(selectedGroup)
        .then(setMembers)
        .catch(console.error)
        .finally(() => setLoadingMembers(false))
    } else {
      setMembers([])
    }
  }, [selectedGroup])

  const loadData = async () => {
    setLoading(true)
    try {
      const g = await groups.list()
      setMyGroups(g || [])
      const f = await friends.getFriends()
      setMyFriends(f || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await groups.create(newGroupName, "")
      setNewGroupName("")
      setShowCreate(false)
      loadData()
    } catch (err: any) {
      const msg = String(err?.message || "Unknown error")
      if ((msg.includes("unique constraint") || msg.includes("409")) && newGroupName.trim()) {
        alert("A group with this name already exists. Please choose another name.")
      } else {
        alert(msg)
      }
    }
  }

  const handleAddMember = async (username: string) => {
    if (!selectedGroup) return
    try {
      setAddingMember(true)
      await groups.addMember(selectedGroup, username)
      // keep it simple; you can replace alert with a toast later
      alert(`Added @${username}`)
      loadData()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setAddingMember(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10 space-y-6">
      {/* Hero */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-soft">
        <div className="p-6 sm:p-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
              My Groups
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Groups let you share bets with a specific set of friends.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                Private by design
              </span>
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                Invite friends
              </span>
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                Post group bets
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCreate(!showCreate)}
            className={cn(
              "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold shadow-soft transition whitespace-nowrap",
              showCreate
                ? "border border-gray-200 bg-white text-gray-700 hover:bg-primary-50 hover:text-primary-700"
                : "bg-primary-600 text-white hover:bg-primary-700"
            )}
          >
            {showCreate ? "Cancel" : "Create Group"}
          </button>
        </div>
      </div>

      {/* Create */}
      {showCreate && (
        <div className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6 shadow-soft animate-in fade-in slide-in-from-top-2">
          <h2 className="text-base font-semibold text-gray-900">New Group</h2>
          <p className="mt-1 text-sm text-gray-600">Pick a short, unique name.</p>

          <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group Name (e.g. Work Buddies)"
              className={cn(fieldBase, "sm:flex-1")}
              required
              minLength={3}
            />

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-700"
            >
              Save
            </button>
          </form>

          <p className="mt-2 text-xs text-gray-500">
            You can add members after creating the group.
          </p>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-10 shadow-soft">
          <div className="flex items-center justify-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
            <div className="text-sm font-semibold text-gray-700">Loading groups…</div>
          </div>
        </div>
      ) : (
        <>
          {myGroups.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
              <p className="text-sm font-semibold text-gray-900">No groups yet.</p>
              <p className="mt-1 text-sm text-gray-600">
                Create a group to share bets with specific people.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {myGroups.map((group) => {
                const memberCount =
                  group?.group_members?.[0]?.count ??
                  group?.member_count ??
                  group?.members_count ??
                  0

                const isOpen = selectedGroup === group.id

                return (
                  <div
                    key={group.id}
                    className="rounded-3xl border border-gray-200 bg-white p-5 shadow-soft transition hover:border-primary-200 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-semibold text-gray-900">
                          {group.name}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                          {group.description || "No description."}
                        </p>
                      </div>

                      <span className="shrink-0 inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                        {memberCount} Members
                      </span>
                    </div>

                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <button
                        type="button"
                        onClick={() => setSelectedGroup(isOpen ? null : group.id)}
                        className={cn(
                          "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition border",
                          isOpen
                            ? "bg-primary-600 text-white border-primary-600 shadow-soft"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-primary-50 hover:text-primary-700"
                        )}
                      >
                        {isOpen ? "Close Members" : "Manage Members"}
                      </button>

                      {isOpen && (
                        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 animate-in fade-in slide-in-from-top-2">
                          
                          {/* Members List */}
                          <div className="mb-6">
                            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                              Current Members ({members.length})
                            </h4>
                            <div className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100 max-h-52 overflow-y-auto">
                               {loadingMembers ? (
                                 <div className="p-4 text-sm text-gray-500">Loading members...</div>
                               ) : members.length === 0 ? (
                                 <div className="p-4 text-sm text-gray-500">No members found.</div>
                               ) : (
                                 members.map((m) => (
                                   <div key={m.id} className="flex items-center justify-between px-4 py-3">
                                      <div className="flex items-center gap-3">
                                         <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 overflow-hidden shrink-0">
                                            {m.avatar_url ? <img src={m.avatar_url} alt={m.username} className="w-full h-full object-cover" /> : m.username?.[0]?.toUpperCase()}
                                         </div>
                                         <div className="min-w-0">
                                            <div className="text-sm font-semibold text-gray-900 truncate">@{m.username}</div>
                                            <div className="text-xs text-gray-500 capitalize">{m.role?.toLowerCase() || 'member'}</div>
                                         </div>
                                      </div>
                                   </div>
                                 ))
                               )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                              Add Friend to Group
                            </h4>
                            <span className="text-xs text-gray-500">
                              {myFriends.length} friends
                            </span>
                          </div>

                          <div className="mt-3 max-h-52 overflow-y-auto rounded-2xl border border-gray-200 bg-white">
                            {myFriends.length === 0 ? (
                              <div className="p-4 text-sm text-gray-600">
                                You need to add friends first.
                              </div>
                            ) : (
                              <div className="divide-y divide-gray-100">
                                {myFriends.map((friend) => (
                                  <div
                                    key={friend.id}
                                    className="flex items-center justify-between gap-3 px-4 py-3"
                                  >
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-semibold text-gray-900">
                                        @{friend.username}
                                      </div>
                                      <div className="truncate text-sm text-gray-600">
                                        {friend.first_name} {friend.last_name}
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleAddMember(friend.username)}
                                      disabled={addingMember}
                                      className={cn(
                                        "shrink-0 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition border",
                                        "border-gray-200 bg-white text-gray-700 hover:bg-primary-50 hover:text-primary-700",
                                        addingMember && "opacity-50 cursor-not-allowed"
                                      )}
                                    >
                                      Add
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <p className="mt-3 text-xs text-gray-500">
                            Tip: Only friends can be added to groups.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
