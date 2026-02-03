'use client'

import { useState, useEffect } from 'react'
import { Globe, Lock, Users, EyeOff, Hash, UserCheck, Info } from 'lucide-react'
import { createBetAction } from '@/app/actions/bets'
import { useRouter } from 'next/navigation'
import { groups } from '@/lib/friends'

type Category = {
  id: string
  name: string
  icon: string
}

type Group = {
  id: string
  name: string
  description: string
}

export default function CreateBetForm({ categories }: { categories: Category[] }) {
  const router = useRouter()
  
  const [audience, setAudience] = useState<'PUBLIC' | 'FRIENDS' | 'GROUP' | 'PRIVATE'>('PUBLIC')
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [myGroups, setMyGroups] = useState<Group[]>([])
  const [inviteEnabled, setInviteEnabled] = useState(true)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [loading, setLoading] = useState(false)

  // Load groups on mount
  useEffect(() => {
    groups.list()
      .then(data => setMyGroups(data || []))
      .catch(err => console.error('Failed to load groups:', err))
  }, [])

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    try {
      // Validate Group Selection
      if (audience === 'GROUP' && !selectedGroupId) {
        alert('Please select a group.')
        setLoading(false)
        return
      }

      // If audience is not PRIVATE, force inviteEnabled to false (or just ignore it on server)
      // but strictly speaking, UI logic handles display.
      
      const res = await createBetAction(formData)
      
      if (audience === 'PRIVATE' && res.invite_code) {
         router.push(`/bets/${res.id}?new=true&code=${res.invite_code}`)
      } else {
         router.push(`/bets/${res.id}`)
      }
    } catch (e: any) {
      alert('Error creating bet: ' + e.message)
      setLoading(false)
    }
  }

  const selectedGroupName = myGroups.find(g => g.id === selectedGroupId)?.name

  return (
    <form action={handleSubmit} className="space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      
      {/* Hidden inputs to sync state with FormData */}
      <input type="hidden" name="audience" value={audience} />
      <input type="hidden" name="group_id" value={selectedGroupId} />
      <input type="hidden" name="invite_code_enabled" value={inviteEnabled && audience === 'PRIVATE' ? 'on' : 'off'} />
      <input type="hidden" name="hide_participants" value={isAnonymous ? 'on' : 'off'} />

      {/* --- SECTION 1: AUDIENCE --- */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Globe className="w-4 h-4 text-gray-500" />
           Audience
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {/* Public */}
           <button
             type="button"
             onClick={() => setAudience('PUBLIC')}
             className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all ${
               audience === 'PUBLIC' 
                 ? 'border-primary-600 bg-primary-50/50 ring-1 ring-primary-600/20' 
                 : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
             }`}
           >
             <div className="flex items-center gap-2 mb-2">
                <div className={`p-2 rounded-lg ${audience === 'PUBLIC' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>
                   <Globe className="w-5 h-5" />
                </div>
                <span className={`font-bold ${audience === 'PUBLIC' ? 'text-primary-900' : 'text-gray-900'}`}>Public</span>
             </div>
             <p className="text-sm text-gray-500 text-left">
               Visible to everyone. Anyone can find and join.
             </p>
           </button>

           {/* Friends Only */}
           <button
             type="button"
             onClick={() => setAudience('FRIENDS')}
             className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all ${
               audience === 'FRIENDS' 
                 ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600/20' 
                 : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
             }`}
           >
             <div className="flex items-center gap-2 mb-2">
                <div className={`p-2 rounded-lg ${audience === 'FRIENDS' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                   <UserCheck className="w-5 h-5" />
                </div>
                <span className={`font-bold ${audience === 'FRIENDS' ? 'text-blue-900' : 'text-gray-900'}`}>Friends Only</span>
             </div>
             <p className="text-sm text-gray-500 text-left">
               Only your confirmed friends can see and join.
             </p>
           </button>

           {/* Group */}
           <button
             type="button"
             onClick={() => setAudience('GROUP')}
             className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all ${
               audience === 'GROUP' 
                 ? 'border-orange-600 bg-orange-50/50 ring-1 ring-orange-600/20' 
                 : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
             }`}
           >
             <div className="flex items-center gap-2 mb-2">
                <div className={`p-2 rounded-lg ${audience === 'GROUP' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                   <Users className="w-5 h-5" />
                </div>
                <span className={`font-bold ${audience === 'GROUP' ? 'text-orange-900' : 'text-gray-900'}`}>Specific Group</span>
             </div>
             <p className="text-sm text-gray-500 text-left">
               Visible only to members of a selected group.
             </p>
           </button>

           {/* Private Link */}
           <button
             type="button"
             onClick={() => setAudience('PRIVATE')}
             className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all ${
               audience === 'PRIVATE' 
                 ? 'border-purple-600 bg-purple-50/50 ring-1 ring-purple-600/20' 
                 : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
             }`}
           >
             <div className="flex items-center gap-2 mb-2">
                <div className={`p-2 rounded-lg ${audience === 'PRIVATE' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                   <Lock className="w-5 h-5" />
                </div>
                <span className={`font-bold ${audience === 'PRIVATE' ? 'text-purple-900' : 'text-gray-900'}`}>Private Link</span>
             </div>
             <p className="text-sm text-gray-500 text-left">
               Hidden from feed. Invite via link/code only.
             </p>
           </button>
        </div>

        {/* Group Picker */}
        {audience === 'GROUP' && (
           <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-100 animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-medium text-orange-900 mb-2">Select Group</label>
              <select 
                value={selectedGroupId} 
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="block w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900"
              >
                <option value="">-- Choose a group --</option>
                {myGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              {myGroups.length === 0 && (
                <p className="text-xs text-orange-700 mt-2">
                  No groups found. <a href="/groups" target="_blank" className="font-bold underline">Create a group</a> first.
                </p>
              )}
           </div>
        )}

        {/* Private Settings */}
        {audience === 'PRIVATE' && (
             <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-100 animate-in fade-in slide-in-from-top-2 flex items-center justify-between">
                <div className="flex flex-col items-start">
                   <span className="text-sm font-semibold text-purple-900 flex items-center gap-1">
                     <Hash className="w-4 h-4" /> Require Invite Code
                   </span>
                   <span className="text-xs text-purple-700">Recommended for security</span>
                </div>
                
                <button
                   type="button"
                   role="switch"
                   aria-checked={inviteEnabled}
                   onClick={() => setInviteEnabled(!inviteEnabled)}
                   className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                     inviteEnabled ? 'bg-purple-600' : 'bg-gray-200'
                   }`}
                 >
                   <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${inviteEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
             </div>
        )}
      </div>

      {/* --- SECTION 2: Anonymity --- */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <EyeOff className="w-4 h-4 text-gray-500" />
           Anonymity
        </h3>
        
        <div 
          className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
             isAnonymous ? 'border-indigo-600 bg-indigo-50/30' : 'border-gray-200 hover:bg-gray-50'
          }`}
          onClick={() => setIsAnonymous(!isAnonymous)}
        >
           <div className="flex gap-4 items-center">
              <div className={`p-2 rounded-lg ${isAnonymous ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>
                 <Users className="w-5 h-5" />
              </div>
              <div className="flex flex-col text-left">
                 <span className={`font-medium ${isAnonymous ? 'text-indigo-900' : 'text-gray-900'}`}>Hide Participants</span>
                 <span className="text-sm text-gray-500">Only totals are shown. Usernames hidden.</span>
              </div>
           </div>

           <button
              type="button"
              role="switch"
              aria-checked={isAnonymous}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isAnonymous ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isAnonymous ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
           </button>
        </div>
      </div>

      {/* LIVE PREVIEW PILLS */}
      <div className="flex flex-wrap gap-2 text-xs font-medium pt-2 border-t border-dashed border-gray-200">
         <span className="text-gray-400 uppercase tracking-wider py-1">Settings:</span>
         
         {audience === 'PUBLIC' && (
           <span className="px-2 py-1 bg-green-100 text-green-700 rounded border border-green-200 flex items-center gap-1">
             <Globe className="w-3 h-3" /> Public
           </span>
         )}

         {audience === 'FRIENDS' && (
           <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded border border-blue-200 flex items-center gap-1">
             <UserCheck className="w-3 h-3" /> Friends Only
           </span>
         )}

         {audience === 'GROUP' && (
           <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded border border-orange-200 flex items-center gap-1">
             <Users className="w-3 h-3" /> Group: {selectedGroupName || 'Select Group'}
           </span>
         )}
         
         {audience === 'PRIVATE' && (
           <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded border border-purple-200 flex items-center gap-1">
             <Lock className="w-3 h-3" /> Private
           </span>
         )}

         {audience === 'PRIVATE' && inviteEnabled && (
           <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded border border-purple-200 flex items-center gap-1">
             <Hash className="w-3 h-3" /> Invite Code
           </span>
         )}

         {isAnonymous && (
           <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded border border-indigo-200 flex items-center gap-1">
             <EyeOff className="w-3 h-3" /> Anonymous
           </span>
         )}
      </div>

      <hr className="border-gray-200" />

      {/* --- STANDARD FIELDS --- */}
      <div className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Statement / Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            minLength={3}
            maxLength={200}
            className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            placeholder="e.g., Bitcoin will reach $100k by end of 2026"
          />
        </div>

        <div>
           <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
             Description (optional)
           </label>
           <textarea
             id="description"
             name="description"
             rows={4}
             className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
             placeholder="Add more context or clarifications..."
           />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              id="category_id"
              name="category_id"
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white"
            >
              <option value="">Select a category...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
             <label htmlFor="end_at" className="block text-sm font-medium text-gray-700 mb-2">
               Resolution Date *
             </label>
             <input
               type="datetime-local"
               id="end_at"
               name="end_at"
               required
               className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
             />
          </div>
        </div>
        
        <div>
          <label htmlFor="max_participants" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
             Max Participants <span className="text-xs text-gray-400 font-normal">(Optional)</span>
          </label>
          <input
            type="number"
            id="max_participants"
            name="max_participants"
            min={2}
            className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            placeholder="No limit"
          />
        </div>
        
        {/* Info Box */}
        <div className="bg-blue-50 p-4 rounded-lg flex gap-3 text-sm text-blue-700">
           <Info className="w-5 h-5 flex-shrink-0" />
           <p>
              Once created, you cannot change the betting terms or the resolution criteria. 
              The creator (you) will be responsible for resolving this bet unless overruled by moderators.
           </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating Prediction...' : 'Create Prediction Market'}
        </button>
      </div>
    </form>
  )
}
