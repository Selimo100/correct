import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

type WalletEntry = Database['public']['Tables']['wallet_ledger']['Row'] & {
  bets?: { title: string }
}

export const dynamic = 'force-dynamic'

export default async function WalletPage() {
  const user = await requireAuth()
  const supabase = await createClient()
  
  // Get current balance
  // @ts-expect-error - Supabase RPC typing issue
  const { data: balance } = await supabase.rpc('get_balance', { p_user_id: user.id })
  const currentBalance = (balance as unknown as number) || 0
  
  // Get ledger history
  const { data: ledger } = await supabase
    .from('wallet_ledger')
    .select(`
      *,
      bets(title)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const entries = (ledger as WalletEntry[]) || []

  const typeColors: Record<string, string> = {
    STARTER: 'bg-purple-100 text-purple-800',
    BET_STAKE: 'bg-red-100 text-red-800',
    BET_PAYOUT: 'bg-green-100 text-green-800',
    BET_REFUND: 'bg-blue-100 text-blue-800',
    FEE: 'bg-gray-100 text-gray-800',
    ADMIN_ADJUSTMENT: 'bg-yellow-100 text-yellow-800',
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Wallet</h1>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg shadow-lg p-8 mb-8 text-white">
        <div className="text-sm font-medium opacity-90 mb-2">Current Balance</div>
        <div className="text-5xl font-bold">{currentBalance} Neos</div>
        <div className="mt-4 text-sm opacity-75">
          Neo is the internal currency used for placing bets
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Transaction History</h2>
        </div>
        
        {entries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No transactions yet
          </div>
        ) : (
          <div className="divide-y">
            {entries.map((entry) => (
              <div key={entry.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${typeColors[entry.type] || 'bg-gray-100 text-gray-800'}`}>
                        {entry.type.replace('_', ' ')}
                      </span>
                      {entry.bets && (
                        <span className="text-sm text-gray-600">
                          {entry.bets.title.substring(0, 50)}
                          {entry.bets.title.length > 50 && '...'}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(entry.created_at).toLocaleString()}
                    </div>
                    {entry.metadata && (
                      <div className="text-xs text-gray-600 mt-1">
                        {JSON.stringify(entry.metadata)}
                      </div>
                    )}
                  </div>
                  <div className={`text-lg font-semibold ${entry.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {entry.amount > 0 ? '+' : ''}{entry.amount} Neos
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">About Neos</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• New users receive 100 Neos as a starter bonus</li>
          <li>• Use Neos to place stakes on bets</li>
          <li>• Win Neos by betting correctly</li>
          <li>• All transactions are recorded in your ledger</li>
        </ul>
      </div>
    </div>
  )
}
