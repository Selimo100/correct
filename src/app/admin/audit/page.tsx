import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Database } from '@/lib/database.types'

type AdminAction = Database['public']['Tables']['admin_actions']['Row'] & {
  profiles?: { username: string }
}

export const dynamic = 'force-dynamic'

export default async function AuditLogPage() {
  await requireAdmin()
  const supabase = await createClient()

  // Get all admin actions
  const { data: actions } = await supabase
    .from('admin_actions')
    .select(`
      *,
      profiles(username)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  const actionList = (actions as AdminAction[]) || []

  // Group by action type for stats
  const actionCounts = actionList.reduce((acc, action) => {
    acc[action.action] = (acc[action.action] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
        <Link
          href="/admin"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-sm text-gray-600">Total Actions</div>
          <div className="text-3xl font-bold text-gray-900">{actionList.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-sm text-gray-600">Resolutions</div>
          <div className="text-3xl font-bold text-green-600">
            {actionCounts.RESOLVE_BET || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-sm text-gray-600">Voids</div>
          <div className="text-3xl font-bold text-yellow-600">
            {actionCounts.VOID_BET || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-sm text-gray-600">Moderations</div>
          <div className="text-3xl font-bold text-red-600">
            {(actionCounts.HIDE_BET || 0) + (actionCounts.UNHIDE_BET || 0)}
          </div>
        </div>
      </div>

      {/* Action Log */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Actions</h2>
          {actionList.length === 0 ? (
            <p className="text-gray-500">No admin actions recorded yet</p>
          ) : (
            <div className="space-y-2">
              {actionList.map((action) => {
                let actionColor = 'text-gray-600'
                let actionBg = 'bg-gray-50'
                
                if (action.action === 'RESOLVE_BET') {
                  actionColor = 'text-green-700'
                  actionBg = 'bg-green-50'
                } else if (action.action === 'VOID_BET') {
                  actionColor = 'text-yellow-700'
                  actionBg = 'bg-yellow-50'
                } else if (action.action === 'HIDE_BET') {
                  actionColor = 'text-red-700'
                  actionBg = 'bg-red-50'
                } else if (action.action === 'UNHIDE_BET') {
                  actionColor = 'text-blue-700'
                  actionBg = 'bg-blue-50'
                } else if (action.action.includes('ADMIN')) {
                  actionColor = 'text-purple-700'
                  actionBg = 'bg-purple-50'
                }

                return (
                  <div key={action.id} className={`flex justify-between items-center p-3 rounded ${actionBg}`}>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          {action.profiles?.username || 'Unknown Admin'}
                        </span>
                        <span className={`text-sm font-medium ${actionColor}`}>
                          {action.action.toLowerCase().replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 text-right">
                      {new Date(action.created_at).toLocaleString()}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Action Type Breakdown */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Action Breakdown</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(actionCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([action, count]) => (
              <div key={action} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-sm font-medium text-gray-700">
                  {action.toLowerCase().replace(/_/g, ' ')}
                </span>
                <span className="text-lg font-bold text-gray-900">{count}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
