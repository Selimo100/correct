'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface StakeFormProps {
  betId: string
  currentStake?: number
  currentSide?: 'FOR' | 'AGAINST'
  userBalance: number
}

export default function StakeForm({
  betId,
  currentStake = 0,
  currentSide,
  userBalance,
}: StakeFormProps) {
  const router = useRouter()
  const [side, setSide] = useState<'FOR' | 'AGAINST'>(currentSide || 'FOR')
  const [amount, setAmount] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    
    const stakeAmount = parseInt(amount)
    
    if (!stakeAmount || stakeAmount <= 0) {
      setError('Please enter a valid amount')
      return
    }
    
    if (stakeAmount > userBalance) {
      setError('Insufficient balance')
      return
    }
    
    if (currentSide && currentSide !== side) {
      setError('Cannot switch sides. You must cancel your current stake first.')
      return
    }
    
    setLoading(true)
    
    try {
      const response = await fetch('/api/bets/stake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ betId, side, stake: stakeAmount }),
      })
      
      const data = await response.json()
      
      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to place stake')
        return
      }
      
      setSuccess(true)
      setAmount('')
      
      // Refresh the page to show updated data
      setTimeout(() => router.refresh(), 1000)
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Position
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSide('FOR')}
            disabled={currentSide && currentSide !== 'FOR'}
            className={`px-4 py-3 rounded-lg border-2 font-medium transition-colors ${
              side === 'FOR'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-300 text-gray-700 hover:border-green-300'
            } ${currentSide && currentSide !== 'FOR' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            FOR
            <div className="text-xs font-normal mt-1">I think it's correct</div>
          </button>
          <button
            type="button"
            onClick={() => setSide('AGAINST')}
            disabled={currentSide && currentSide !== 'AGAINST'}
            className={`px-4 py-3 rounded-lg border-2 font-medium transition-colors ${
              side === 'AGAINST'
                ? 'border-red-500 bg-red-50 text-red-700'
                : 'border-gray-300 text-gray-700 hover:border-red-300'
            } ${currentSide && currentSide !== 'AGAINST' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            AGAINST
            <div className="text-xs font-normal mt-1">I think it's incorrect</div>
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
          Stake Amount (Neos)
        </label>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            id="amount"
            value={amount}
            onChange={(e) => {
              // Only allow positive integers
              const val = e.target.value.replace(/[^0-9]/g, '')
              setAmount(val)
            }}
            className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            placeholder="Enter amount"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setAmount(userBalance.toString())}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            Max
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Available balance: {userBalance} Neos
        </p>
      </div>

      {currentStake > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            Current stake: {currentStake} Neos on {currentSide}
            <br />
            <span className="text-xs">New total: {currentStake + parseInt(amount || '0')} Neos</span>
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800">Stake placed successfully!</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !amount}
        className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Placing Stake...' : currentStake > 0 ? 'Increase Stake' : 'Place Stake'}
      </button>
    </form>
  )
}
