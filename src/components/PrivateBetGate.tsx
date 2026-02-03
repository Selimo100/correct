'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface PrivateBetGateProps {
  betId: string
  inviteCodeEnabled: boolean
  initialCode?: string
}

export default function PrivateBetGate({ betId, inviteCodeEnabled, initialCode = '' }: PrivateBetGateProps) {
  const [inviteCode, setInviteCode] = useState(initialCode)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await (supabase.rpc as any)('fn_join_private_bet', {
        p_bet_id: betId,
        p_invite_code: inviteCode.trim()
      })

      if (error) throw error

      if (data) {
        // Reload to fetch bet details
        router.refresh()
      } else {
        setError('Invalid invite code')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to unlock bet')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
      <div className="mb-6 flex justify-center">
        <div className="bg-gray-100 p-4 rounded-full">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
           </svg>
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Private Bet</h2>
      <p className="text-gray-500 mb-6">
        This bet is private. You need an invite code to access it.
      </p>

      {inviteCodeEnabled ? (
        <form onSubmit={handleUnlock} className="space-y-4">
          <div>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter invite code"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-center uppercase tracking-widest font-mono"
              required
            />
          </div>
          
          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Unlocking...' : 'Unlock Bet'}
          </button>
        </form>
      ) : (
        <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm">
          This bet is private and requires manual invitation. Please contact the creator.
        </div>
      )}
    </div>
  )
}
