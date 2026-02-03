import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Database } from '@/lib/database.types'
import AdminGrantFundsForm from '@/components/AdminGrantFundsForm'

type Profile = Database['public']['Tables']['profiles']['Row']

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const currentUser = await requireAdmin()
  const supabase = await createClient()
  
  const { data: users, error } = await supabase
    .from('profiles')
    .select('*')
    .order('status', { ascending: true }) // PENDING first
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching users:', error)
  }
  
  const userList = (users as Profile[]) || []
  const pendingUsers = userList.filter(u => u.status === 'PENDING')
  const activeUsers = userList.filter(u => u.status === 'ACTIVE')
  const bannedUsers = userList.filter(u => u.status === 'BANNED')

  async function approveUser(formData: FormData) {
    'use server'
    
    const admin = await requireAdmin()
    const supabase = await createClient()
    const userId = formData.get('user_id') as string
    
    // @ts-expect-error - Supabase RPC typing issue
    const { data, error } = await supabase.rpc('fn_approve_user', {
      p_target_user_id: userId,
      p_admin_id: admin.id
    })
    
    if (error) {
      console.error('Error approving user:', error)
    }
    
    revalidatePath('/admin/users')
  }

  async function setUserStatus(formData: FormData) {
    'use server'
    
    const admin = await requireAdmin()
    const supabase = await createClient()
    const userId = formData.get('user_id') as string
    const newStatus = formData.get('new_status') as string
    const reason = formData.get('reason') as string || null
    
    // @ts-expect-error - Supabase RPC typing issue
    const { data, error } = await supabase.rpc('fn_set_user_status', {
      p_target_user_id: userId,
      p_new_status: newStatus,
      p_admin_id: admin.id,
      p_reason: reason
    })
    
    if (error) {
      console.error('Error setting user status:', error)
    }
    
    revalidatePath('/admin/users')
  }

  async function rejectUser(formData: FormData) {
    'use server'
    
    const admin = await requireAdmin()
    const userId = formData.get('user_id') as string
    const reason = formData.get('reason') as string || 'Rejected by admin'
    
    const supabase = await createClient()
    
    // Check if target user is super admin
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('is_super_admin, username')
      .eq('id', userId)
      .single()
    
    // @ts-expect-error - targetProfile types might be strict
    if (targetProfile?.is_super_admin && !admin.is_super_admin) {
      throw new Error('Cannot delete super admin')
    }
    
    // Log the admin action first
    // @ts-expect-error - admin_actions type outdated
    await supabase.from('admin_actions').insert({
      admin_id: admin.id,
      action: 'REJECT_USER',
      target_type: 'USER',
      target_id: userId,
      details: { reason, username: (targetProfile as any)?.username }
    })
    
    // Create service role client
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // Delete the user's auth account using service role
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (authError) {
      console.error('Error deleting auth user:', authError)
    }
    
    // Profile and related data will be deleted by CASCADE foreign keys
    
    revalidatePath('/admin/users')
  }

  async function toggleAdmin(formData: FormData) {
    'use server'
    
    const admin = await requireAdmin()
    
    if (!admin.is_super_admin) {
      throw new Error('Super admin access required')
    }
    
    const supabase = await createClient()
    const userId = formData.get('user_id') as string
    const isAdmin = formData.get('is_admin') === 'true'
    const isSuperAdmin = formData.get('is_super_admin') === 'true'
    
    // @ts-expect-error - Supabase RPC typing issue
    await supabase.rpc('set_admin_status', {
      p_target_user_id: userId,
      p_is_admin: isAdmin,
      p_is_super_admin: isSuperAdmin,
    })
    
    revalidatePath('/admin/users')
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <a
          href="/admin"
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Back to Admin
        </a>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-sm text-gray-600">Total Users</div>
          <div className="text-3xl font-bold text-gray-900">{userList.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-sm text-gray-600">Pending Approval</div>
          <div className="text-3xl font-bold text-yellow-600">{pendingUsers.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-sm text-gray-600">Active</div>
          <div className="text-3xl font-bold text-green-600">{activeUsers.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-sm text-gray-600">Banned</div>
          <div className="text-3xl font-bold text-red-600">{bannedUsers.length}</div>
        </div>
      </div>

      {/* Pending Users */}
      {pendingUsers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Pending Approval ({pendingUsers.length})
          </h2>
          <div className="space-y-3">
            {pendingUsers.map((user) => (
              <div key={user.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{user.username}</div>
                    <div className="text-sm text-gray-600">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Registered: {new Date(user.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <form action={approveUser}>
                      <input type="hidden" name="user_id" value={user.id} />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                      >
                        Approve
                      </button>
                    </form>
                    <form action={rejectUser}>
                      <input type="hidden" name="user_id" value={user.id} />
                      <input type="hidden" name="reason" value="Rejected during approval" />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Users */}
      <div className="bg-white rounded-lg shadow-sm border mb-8">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Active Users ({activeUsers.length})</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.username}</div>
                    <div className="text-sm text-gray-500">
                      {user.first_name} {user.last_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.is_super_admin ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                        Super Admin
                      </span>
                    ) : user.is_admin ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        Admin
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        User
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <div className="mb-2">
                      <AdminGrantFundsForm userId={user.id} username={user.username} />
                    </div>
                    
                    {user.id !== currentUser.id && (
                      <>
                        <form action={setUserStatus} className="inline">
                          <input type="hidden" name="user_id" value={user.id} />
                          <input type="hidden" name="new_status" value="BANNED" />
                          <input type="hidden" name="reason" value="Banned by admin" />
                          <button
                            type="submit"
                            className="text-red-600 hover:text-red-900 font-medium"
                          >
                            Ban
                          </button>
                        </form>
                        
                        {currentUser.is_super_admin && (
                          <form action={toggleAdmin} className="inline ml-3">
                            <input type="hidden" name="user_id" value={user.id} />
                            {!user.is_admin ? (
                              <button
                                type="submit"
                                name="is_admin"
                                value="true"
                                className="text-primary-600 hover:text-primary-900 font-medium"
                              >
                                Make Admin
                              </button>
                            ) : !user.is_super_admin && (
                              <button
                                type="submit"
                                name="is_admin"
                                value="false"
                                className="text-gray-600 hover:text-gray-900 font-medium"
                              >
                                Remove Admin
                              </button>
                            )}
                          </form>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Banned Users */}
      {bannedUsers.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Banned Users ({bannedUsers.length})</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {bannedUsers.map((user) => (
              <div key={user.id} className="px-6 py-4 flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium text-gray-900">{user.username}</div>
                  <div className="text-sm text-gray-500">
                    {user.first_name} {user.last_name}
                  </div>
                </div>
                {user.id !== currentUser.id && (
                  <form action={setUserStatus}>
                    <input type="hidden" name="user_id" value={user.id} />
                    <input type="hidden" name="new_status" value="ACTIVE" />
                    <input type="hidden" name="reason" value="Unbanned by admin" />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                    >
                      Unban
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
