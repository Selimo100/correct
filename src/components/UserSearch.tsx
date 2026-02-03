'use client'

import { useState } from 'react'
import { friends } from '@/lib/friends'

interface User {
  id: string
  username: string
  first_name: string
  last_name: string
}

export default function UserSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setSuccessMsg('')
    try {
      const data = await friends.searchUsers(query)
      setResults(data)
      if (data.length === 0) setError('No users found')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (username: string) => {
    try {
      await friends.sendRequest(username)
      setSuccessMsg(`Request sent to ${username}`)
      setResults(results.filter(r => r.username !== username)) // Remove from list
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
      <h3 className="font-semibold text-lg mb-4">Add Friend</h3>
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username..."
          className="flex-1 border rounded px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-primary-600 text-white px-4 py-2 rounded text-sm hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
      {successMsg && <div className="text-green-600 text-sm mb-2">{successMsg}</div>}

      <div className="space-y-2">
        {results.map(user => (
          <div key={user.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <div>
              <div className="font-medium">@{user.username}</div>
              <div className="text-xs text-gray-500">{user.first_name} {user.last_name}</div>
            </div>
            <button
              onClick={() => handleAdd(user.username)}
              className="text-primary-600 text-sm hover:underline"
            >
              Add Friend
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
