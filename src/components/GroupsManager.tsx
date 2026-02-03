'use client'

import { useState, useEffect } from 'react'
import { groups, friends } from '@/lib/friends'

export default function GroupsManager() {
  const [myGroups, setMyGroups] = useState<any[]>([])
  const [myFriends, setMyFriends] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null) // ID of group being managed
  
  // Member management state
  const [addingMember, setAddingMember] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const g = await groups.list()
      setMyGroups(g || [])
      // Pre-fetch friends for the "Add Member" picker
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
      await groups.create(newGroupName, '')
      setNewGroupName('')
      setShowCreate(false)
      loadData()
    } catch (err: any) {
      if (err.message && err.message.includes('unique constraint') || err.message.includes('409')) {
         alert('A group with this name already exists. Please choose another name.')
      } else {
         alert(err.message)
      }
    }
  }

  const handleAddMember = async (username: string) => {
    if (!selectedGroup) return
    try {
      setAddingMember(true)
      await groups.addMember(selectedGroup, username)
      alert(`Added ${username}`)
      loadData() // Refresh counts
    } catch (err: any) {
      alert(err.message)
    } finally {
      setAddingMember(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Groups</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
        >
          {showCreate ? 'Cancel' : 'Create Group'}
        </button>
      </div>

      {showCreate && (
        <div className="bg-gray-50 p-4 rounded border mb-6">
          <h3 className="font-semibold mb-2">New Group</h3>
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group Name (e.g. Work Buddies)"
              className="flex-1 border rounded px-3 py-2"
              required
              minLength={3}
            />
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">
              Save
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myGroups.length === 0 && (
            <div className="col-span-2 text-center text-gray-500 py-8">
              You haven't created any groups yet. Groups let you share bets with specific people.
            </div>
          )}

          {myGroups.map(group => (
            <div key={group.id} className="bg-white border rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-xl font-bold">{group.name}</h3>
                  <p className="text-sm text-gray-500">{group.description || 'No description'}</p>
                </div>
                <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {group.group_members[0].count} Members
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <button
                  onClick={() => setSelectedGroup(selectedGroup === group.id ? null : group.id)}
                  className="text-sm text-primary-600 hover:underline"
                >
                  {selectedGroup === group.id ? 'Close Members' : 'Manage Members'}
                </button>

                {selectedGroup === group.id && (
                  <div className="mt-3 bg-gray-50 p-3 rounded">
                    <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Add Friend to Group</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {myFriends.map(friend => (
                        <div key={friend.id} className="flex justify-between items-center text-sm p-1 hover:bg-gray-100 rounded">
                          <span>@{friend.username}</span>
                          <button
                            onClick={() => handleAddMember(friend.username)}
                            disabled={addingMember}
                            className="text-xs bg-white border px-2 py-0.5 rounded hover:bg-gray-50"
                          >
                            Add
                          </button>
                        </div>
                      ))}
                      {myFriends.length === 0 && <div className="text-sm text-gray-500">You need to add friends first.</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
