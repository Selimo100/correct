'use client'

import { useState } from 'react'
import { grantFundsAction } from '@/app/actions/admin'

export default function AdminGrantFundsForm({ userId, username }: { userId: string, username: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [amount, setAmount] = useState('100')
  const [reason, setReason] = useState('Bonus')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!confirm(`Give ${amount} Neos to ${username}?`)) return

    setLoading(true)
    try {
      await grantFundsAction(userId, parseFloat(amount), reason)
      alert('Funds granted successfully')
      setIsOpen(false)
      setAmount('100')
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="text-sm text-green-600 hover:text-green-800 underline"
      >
        Grant Funds
      </button>
    )
  }

  return (
    <div className="mt-2 p-3 bg-green-50 rounded border border-green-200">
      <form onSubmit={handleSubmit} className="space-y-2">
        <div>
          <label className="block text-xs font-semibold text-gray-700">Amount</label>
          <input 
            type="number" 
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full text-sm border p-1 rounded"
            min="1"
            required 
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700">Reason</label>
          <input 
            type="text" 
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full text-sm border p-1 rounded"
            placeholder="e.g. Bonus, Correction"
            required 
          />
        </div>
        <div className="flex space-x-2 pt-1">
          <button 
            type="submit" 
            disabled={loading}
            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
          >
            {loading ? 'Processing...' : 'Confirm'}
          </button>
          <button 
            type="button" 
            onClick={() => setIsOpen(false)}
            className="px-2 py-1 text-gray-600 text-xs hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
