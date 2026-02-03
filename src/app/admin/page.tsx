import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Database } from '@/lib/database.types'

type Bet = Database['public']['Tables']['bets']['Row'] & {
  profiles?: { username: string }
}

type Profile = Database['public']['Tables']['profiles']['Row']

type AdminAction = Database['public']['Tables']['admin_actions']['Row'] & {
  profiles?: { username: string }
}

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  await requireAdmin()
  const supabase = await createClient()
  
  // Get pending resolution bets (ended but not resolved)
  const { data: pendingBets } = await supabase
    .from('bets')
    .select(`
      *,
      profiles!bets_creator_id_fkey(username)
    `)
    .eq('status', 'OPEN')
    .lt('end_at', new Date().toISOString())
    .order('end_at', { ascending: true })
  
  // Get recent open bets
  const { data: openBets } = await supabase
    .from('bets')
    .select(`
      *,
      profiles!bets_creator_id_fkey(username)
    `)
    .eq('status', 'OPEN')
    .gte('end_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(10)
  
  // Get all users
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  
  // Get recent admin actions
  const { data: actions } = await supabase
    .from('admin_actions')
    .select(`
      *,
      profiles(username)
    `)
    .order('created_at', { ascending: false })
    .limit(20)

  const pendingBetList = (pendingBets as Bet[]) || []
  const openBetList = (openBets as Bet[]) || []
  const userList = (users as Profile[]) || []
  const actionList = (actions as AdminAction[]) || []

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-sm text-gray-600">Pending Resolution</div>
          <div className="text-3xl font-bold text-yellow-600">{pendingBetList.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-sm text-gray-600">Open Bets</div>
          <div className="text-3xl font-bold text-primary-600">{openBetList.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-sm text-gray-600">Total Users</div>
          <div className="text-3xl font-bold text-gray-900">{userList.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-sm text-gray-600">Admins</div>
          <div className="text-3xl font-bold text-purple-600">
            {userList.filter(u => u.is_admin).length}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <div className="flex border-b">
          <Link
            href="/admin"
            className="px-6 py-3 font-medium text-primary-600 border-b-2 border-primary-600"
          >
            Overview
          </Link>
          <Link
            href="/admin/bets"
            className="px-6 py-3 font-medium text-gray-500 hover:text-gray-700"
          >
            Moderate Bets
          </Link>
          <Link
            href="/admin/resolve"
            className="px-6 py-3 font-medium text-gray-500 hover:text-gray-700"
          >
            Resolve Queue
          </Link>
          <Link
            href="/admin/users"
            className="px-6 py-3 font-medium text-gray-500 hover:text-gray-700"
          >
            Users
          </Link>
          <Link
            href="/admin/audit"
            className="px-6 py-3 font-medium text-gray-500 hover:text-gray-700"
          >
            Audit Log
          </Link>
        </div>

        <div className="p-6">
          {/* Pending Resolutions */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Pending Resolutions ({pendingBetList.length})
            </h2>
            {pendingBetList.length === 0 ? (
              <p className="text-gray-500">No bets pending resolution</p>
            ) : (
              <div className="space-y-3">
                {pendingBetList.map((bet) => (
                  <div key={bet.id} className="flex justify-between items-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{bet.title}</div>
                      <div className="text-sm text-gray-600">
                        Ended: {new Date(bet.end_at).toLocaleString()}
                      </div>
                    </div>
                    <Link
                      href={`/admin/resolve/${bet.id}`}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
                    >
                      Resolve
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Actions */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Admin Actions</h2>
            {actionList.length === 0 ? (
              <p className="text-gray-500">No recent actions</p>
            ) : (
              <div className="space-y-2">
                {actionList.slice(0, 5).map((action) => (
                  <div key={action.id} className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">{action.profiles?.username}</span>
                      <span className="text-gray-600"> {action.action.toLowerCase().replace('_', ' ')}</span>
                    </div>
                    <div className="text-gray-500 text-xs">
                      {new Date(action.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
