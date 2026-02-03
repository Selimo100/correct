'use client'

import { useState } from 'react'
import { Globe, Lock, Users, EyeOff, Hash, Info } from 'lucide-react'
import { createBetAction } from '@/app/actions/bets'
import { useRouter } from 'next/navigation'

type Category = {
  id: string
  name: string
  icon: string
}

export default function CreateBetForm({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC')
  const [inviteEnabled, setInviteEnabled] = useState(true)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    try {
      // Append manual states to formData if needed, but <input> elements handle it if present.
      // Since we use custom UI for visibility, we need hidden inputs OR manual append.
      // We will use hidden inputs controlled by state to ensure FormData captures them.
      
      const res = await createBetAction(formData)
      
      if (visibility === 'PRIVATE' && res.invite_code) {
         router.push(`/bets/${res.id}?new=true&code=${res.invite_code}`)
      } else {
         router.push(`/bets/${res.id}`)
      }
    } catch (e: any) {
      alert('Error creating bet: ' + e.message)
      setLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      
      {/* Hidden inputs to sync state with FormData */}
      <input type="hidden" name="visibility" value={visibility} />
      <input type="hidden" name="invite_code_enabled" value={inviteEnabled && visibility === 'PRIVATE' ? 'on' : 'off'} />
      <input type="hidden" name="hide_participants" value={isAnonymous ? 'on' : 'off'} />

      {/* --- SECTION 1: VISIBILITY --- */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Globe className="w-4 h-4 text-gray-500" />
           Visibility
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {/* Public Card */}
           <button
             type="button"
             onClick={() => setVisibility('PUBLIC')}
             className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all ${
               visibility === 'PUBLIC' 
                 ? 'border-primary-600 bg-primary-50/50 ring-1 ring-primary-600/20' 
                 : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
             }`}
           >
             <div className="flex items-center gap-2 mb-2">
                <div className={`p-2 rounded-lg ${visibility === 'PUBLIC' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>
                   <Globe className="w-5 h-5" />
                </div>
                <span className={`font-bold ${visibility === 'PUBLIC' ? 'text-primary-900' : 'text-gray-900'}`}>Public</span>
             </div>
             <p className="text-sm text-gray-500 text-left">
               Visible in the global feed. Anyone can find and join this bet.
             </p>
           </button>

           {/* Private Card */}
           <button
             type="button"
             onClick={() => setVisibility('PRIVATE')}
             className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all relative ${
               visibility === 'PRIVATE' 
                 ? 'border-purple-600 bg-purple-50/50 ring-1 ring-purple-600/20' 
                 : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
             }`}
           >
             <div className="flex items-center gap-2 mb-2">
                <div className={`p-2 rounded-lg ${visibility === 'PRIVATE' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                   <Lock className="w-5 h-5" />
                </div>
                <span className={`font-bold ${visibility === 'PRIVATE' ? 'text-purple-900' : 'text-gray-900'}`}>Private</span>
             </div>
             <p className="text-sm text-gray-500 text-left mb-4">
               Hidden from feed. Only people with the invite code can join.
             </p>

             {/* Invite Code Toggle inside Private Card */}
             {visibility === 'PRIVATE' && (
                <div 
                  className="w-full mt-auto pt-3 border-t border-purple-200/60 flex items-center justify-between"
                  onClick={(e) => e.stopPropagation()} 
                >
                   <div className="flex flex-col items-start">
                      <span className="text-xs font-semibold text-purple-900 flex items-center gap-1">
                        <Hash className="w-3 h-3" /> Invite Code
                      </span>
                      <span className="text-[10px] text-purple-700">Required to join</span>
                   </div>
                   
                   {/* Custom Switch */}
                   <button
                      type="button"
                      role="switch"
                      aria-checked={inviteEnabled}
                      onClick={() => setInviteEnabled(!inviteEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                        inviteEnabled ? 'bg-purple-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          inviteEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                   </button>
                </div>
             )}
           </button>
        </div>
      </div>

      {/* --- SECTION 2: PRIVACY Settings --- */}
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
              <div className="flex flex-col">
                 <span className={`font-medium ${isAnonymous ? 'text-indigo-900' : 'text-gray-900'}`}>Hide Participants</span>
                 <span className="text-sm text-gray-500">Only totals are shown. Usernames hidden.</span>
              </div>
           </div>

           {/* Switch */}
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
         
         {visibility === 'PUBLIC' ? (
           <span className="px-2 py-1 bg-green-100 text-green-700 rounded border border-green-200 flex items-center gap-1">
             <Globe className="w-3 h-3" /> Public
           </span>
         ) : (
           <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded border border-purple-200 flex items-center gap-1">
             <Lock className="w-3 h-3" /> Private
           </span>
         )}

         {visibility === 'PRIVATE' && inviteEnabled && (
           <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded border border-blue-200 flex items-center gap-1">
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
            <label htmlFor="max_participants" className="block text-sm font-medium text-gray-700 mb-2">
              Max Participants (optional)
            </label>
            <input
              type="number"
              id="max_participants"
              name="max_participants"
              min="2"
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              placeholder="Unlimited"
            />
          </div>
        </div>

        <div>
          <label htmlFor="end_at" className="block text-sm font-medium text-gray-700 mb-2">
            End Date & Time *
          </label>
          <input
            type="datetime-local"
            id="end_at"
            name="end_at"
            required
            min={new Date().toISOString().slice(0, 16)}
            className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div className="flex space-x-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {loading ? 'Creating...' : 'Create Bet'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-block px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-center"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  )
}
