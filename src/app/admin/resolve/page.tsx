import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Database } from '@/lib/database.types'

type Bet = Database['public']['Tables']['bets']['Row'] & {
  profiles?: { username: string }
}

export const dynamic = 'force-dynamic'

export default async function ResolveQueuePage() {
  await requireAdmin()
  const supabase = await createClient()

  // Get all locked/ended bets that need resolution
  const { data: pendingBets } = await supabase
    .from('bets')
    .select(`
      *,
      profiles!bets_creator_id_fkey(username)
    `)
    .eq('status', 'OPEN')
    .lt('end_at', new Date().toISOString())
    .order('end_at', { ascending: true })

  // Get recently resolved bets for reference
  const { data: resolvedBets } = await supabase
    .from('bets')
    .select(`
      *,
      profiles!bets_creator_id_fkey(username)
    `)
    .eq('status', 'RESOLVED')
    .order('resolved_at', { ascending: false })
    .limit(10)

  const pendingList = (pendingBets as Bet[]) || []
  const resolvedList = (resolvedBets as Bet[]) || []

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Resolution Queue</h1>
        <Link
          href="/admin"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-sm text-gray-600">Pending Resolution</div>
          <div className="text-3xl font-bold text-yellow-600">{pendingList.length}</div>
          <p className="text-xs text-gray-500 mt-2">Bets past their end date</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-sm text-gray-600">Recently Resolved</div>
          <div className="text-3xl font-bold text-green-600">{resolvedList.length}</div>
          <p className="text-xs text-gray-500 mt-2">Last 10 resolutions</p>
        </div>
      </div>

      {/* Pending Resolutions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Pending Resolutions ({pendingList.length})
        </h2>
        {pendingList.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <p className="text-gray-500">🎉 All bets are up to date! No pending resolutions.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingList.map((bet) => {
              const daysOverdue = Math.floor(
                (new Date().getTime() - new Date(bet.end_at).getTime()) / (1000 * 60 * 60 * 24)
              )
              
              return (
                <div key={bet.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <Link
                        href={`/bets/${bet.id}`}
                        className="font-medium text-gray-900 hover:text-primary-600"
                      >
                        {bet.title}
                      </Link>
                      <div className="text-sm text-gray-600 mt-1">
                        Created by {bet.profiles?.username || 'Unknown'} •{' '}
                        Ended {new Date(bet.end_at).toLocaleString()}
                      </div>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>
                          {daysOverdue === 0 ? 'Today' : `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`}
                        </span>
                        {/* @ts-expect-error - RPC typing issue */}
                        <span>Pot: {bet.total_pot} Neos</span>
                        <span>
                          {/* @ts-expect-error - RPC typing issue */}
                          FOR: {bet.stake_for} • AGAINST: {bet.stake_against}
                        </span>
                      </div>
                      {bet.description && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {bet.description}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/admin/resolve/${bet.id}`}
                      className="ml-4 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
                    >
                      Resolve Now
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recently Resolved */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Recently Resolved
        </h2>
        {resolvedList.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <p className="text-gray-500">No resolved bets yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {resolvedList.map((bet) => (
              <div key={bet.id} className="bg-white border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <Link
                      href={`/bets/${bet.id}`}
                      className="font-medium text-gray-900 hover:text-primary-600"
                    >
                      {bet.title}
                    </Link>
                    <div className="text-sm text-gray-600 mt-1">
                      Resolved {bet.resolved_at ? new Date(bet.resolved_at).toLocaleString() : 'Recently'}
                    </div>
                    <div className="flex items-center space-x-4 mt-2 text-xs">
                      <span className={`px-2 py-1 rounded font-medium ${
                        bet.resolution === true
                          ? 'bg-green-100 text-green-700'
                          : bet.resolution === false
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        Outcome: {bet.resolution ? 'FOR' : 'AGAINST'}
                      </span>
                      {/* @ts-expect-error - total_pot missing from type */}
                      <span className="text-gray-500">Pot: {bet.total_pot || 0} Neos</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
