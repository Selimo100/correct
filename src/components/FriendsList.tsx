'use client'

import { useEffect, useState } from 'react'
import { friends } from '@/lib/friends'
import UserSearch from './UserSearch'

export default function FriendsList() {
  const [activeTab, setActiveTab] = useState<'FRIENDS' | 'REQUESTS'>('FRIENDS')
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
      loadData() // Refresh everything
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Friends & Connections</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Search & Actions */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
             <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Friend</h2>
             <UserSearch />
          </div>
          
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
             <h3 className="font-semibold text-blue-900 mb-2">Why add friends?</h3>
             <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
                <li>See their bets in your "Friends Updates" feed</li>
                <li>Invite them to private bets easily</li>
                <li>Add them to Groups for shared betting pools</li>
             </ul>
          </div>
        </div>

        {/* Right Column: Lists */}
        <div className="lg:col-span-8">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('FRIENDS')}
              className={`px-6 py-3 font-medium text-sm transition-colors relative ${
                 activeTab === 'FRIENDS' 
                   ? 'text-primary-600' 
                   : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              My Friends ({friendList.length})
              {activeTab === 'FRIENDS' && (
                 <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-600 rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('REQUESTS')}
              className={`px-6 py-3 font-medium text-sm transition-colors relative ${
                 activeTab === 'REQUESTS' 
                   ? 'text-primary-600' 
                   : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Requests ({requests.length})
              {activeTab === 'REQUESTS' && (
                 <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-600 rounded-t-full" />
              )}
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
               <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {activeTab === 'FRIENDS' && (
                <>
                  {friendList.length === 0 ? (
                     <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <p className="text-gray-500">No friends yet.</p>
                        <p className="text-gray-400 text-sm mt-1">Search for a username to get started!</p>
                     </div>
                  ) : (
                     <div className="grid gap-4">
                        {friendList.map(friend => (
                          <div key={friend.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:border-gray-200 transition-all">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-primary-700 font-bold text-lg">
                                  {friend.username.charAt(0).toUpperCase()}
                               </div>
                               <div>
                                  <div className="font-bold text-gray-900">@{friend.username}</div>
                                  <div className="text-sm text-gray-500">{friend.first_name} {friend.last_name}</div>
                               </div>
                            </div>
                            <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded-md border border-green-200">
                               Friend
                            </span>
                          </div>
                        ))}
                     </div>
                  )}
                </>
              )}

              {activeTab === 'REQUESTS' && (
                <>
                  {requests.length === 0 ? (
                     <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <p className="text-gray-500">No pending requests.</p>
                     </div>
                  ) : (
                     <div className="space-y-4">
                        {requests.map(req => (
                          <div key={req.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                  ?
                               </div>
                               <div>
                                  <div className="font-bold text-gray-900">@{req.profiles.username}</div>
                                  <div className="text-sm text-gray-500">Sent on {new Date(req.created_at).toLocaleDateString()}</div>
                               </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleRespond(req.id, true)}
                                className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleRespond(req.id, false)}
                                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                Decline
                              </button>
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
  )
}
