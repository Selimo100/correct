"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { groups, friends } from "@/lib/friends"

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

const fieldBase =
  "block w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 " +
  "placeholder:text-gray-500 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-200"

interface GroupsManagerProps {
  initialGroups: any[]
  userId: string
}

export default function GroupsManager({ initialGroups, userId }: GroupsManagerProps) {
  const [myGroups, setMyGroups] = useState<any[]>(initialGroups || [])
  const [myFriends, setMyFriends] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [showCreate, setShowCreate] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  
  // Inline expansion state - kept for quick access, but we also have /groups/[id]
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [addingMember, setAddingMember] = useState(false)
  const [members, setMembers] = useState<any[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  useEffect(() => {
    // Determine if we need to load members for inline view
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
    // Only reload groups if we really need to (e.g. after create)
    try {
      const g = await groups.list()
      setMyGroups(g || [])
    } catch (e) {
      console.error(e)
    }
  }
  
  const loadFriends = async () => {
    try {
      const f = await friends.getFriends()
      setMyFriends(f || [])
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadFriends()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await groups.create(newGroupName, "")
      setNewGroupName("")
      setShowCreate(false)
      loadData() // Refresh list
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
      alert(`Added @${username}`)
      // Refresh members
      const m = await groups.getMembers(selectedGroup)
      setMembers(m)
      // Refresh list for count update
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

      {/* Create form */}
      {showCreate && (
        <div className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6 shadow-soft animate-in fade-in slide-in-from-top-2">
          <h2 className="text-base font-semibold text-gray-900">New Group</h2>
          <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group Name"
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
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading groups...</div>
      ) : (
        <>
          {myGroups.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
              <p className="text-sm font-semibold text-gray-900">No groups yet.</p>
              <p className="mt-1 text-sm text-gray-600">Create one above!</p>
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
                    className="rounded-3xl border border-gray-200 bg-white p-5 shadow-soft transition hover:border-primary-200 hover:shadow-md flex flex-col"
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-semibold text-gray-900">
                          {group.name}
                        </h3>
                        {group.description && (
                          <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                            {group.description}
                          </p>
                        )}
                        {group.is_owner && (
                           <span className="mt-1 inline-flex items-center rounded-md bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
                             Owner
                           </span>
                        )}
                      </div>

                      <span className="shrink-0 inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                        {memberCount} {memberCount === 1 ? 'Member' : 'Members'}
                      </span>
                    </div>

                    <div className="mt-auto flex items-center gap-2 pt-4 border-t border-gray-100">
                        <Link
                          href={`/groups/${group.id}`}
                          className="flex-1 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                        >
                          View Details
                        </Link>
                        
                        <button
                          onClick={() => setSelectedGroup(isOpen ? null : group.id)}
                          className={cn(
                             "flex-1 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold border transition",
                             isOpen ? "border-primary-600 text-primary-600 bg-primary-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          {isOpen ? 'Close' : 'Quick Add'}
                        </button>
                    </div>

                    {/* Inline View */}
                    {isOpen && (
                        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 animate-in fade-in slide-in-from-top-2">
                          
                          {/* Members List (Mini) */}
                          <div className="mb-6">
                            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                              Members ({members.length})
                            </h4>
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                               {loadingMembers ? (
                                 <div className="p-3 text-sm text-gray-500">Loading...</div>
                               ) : (
                                 <div className="max-h-40 overflow-y-auto divide-y divide-gray-100">
                                   {members.map(m => (
                                      <div key={m.id} className="flex items-center gap-3 p-2 px-3">
                                          <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs overflow-hidden">
                                             {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover"/> : m.username?.[0]}
                                          </div>
                                          <span className="text-sm font-medium text-gray-900">@{m.username}</span>
                                      </div>
                                   ))}
                                 </div>
                               )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3 mb-2">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                              Invite Friend
                            </h4>
                          </div>

                          <div className="max-h-52 overflow-y-auto rounded-2xl border border-gray-200 bg-white">
                            {myFriends.length === 0 ? (
                              <div className="p-4 text-sm text-gray-600">
                                Add friends to invite them.
                              </div>
                            ) : (
                              <div className="divide-y divide-gray-100">
                                {myFriends.map((friend) => (
                                  <div
                                    key={friend.id}
                                    className="flex items-center justify-between gap-3 px-4 py-2"
                                  >
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-medium text-gray-900">
                                        @{friend.username}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleAddMember(friend.username)}
                                      disabled={addingMember}
                                      className="text-xs font-semibold text-primary-600 hover:text-primary-700 disabled:opacity-50"
                                    >
                                      Add
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
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
