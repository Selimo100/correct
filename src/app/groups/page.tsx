import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import GroupsManager from '@/components/GroupsManager'

export default async function GroupsPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  // Diagnostic Logs
  const { data: { user: authUser } } = await supabase.auth.getUser()
  console.log('[GroupsPage] Auth User ID:', authUser?.id)
  console.log('[GroupsPage] Profile ID:', user.id)

  if (authUser?.id !== user.id) {
    console.error('[GroupsPage] CRITICAL MISMATCH: Auth User ID != Profile ID')
  }

  // Fetch Groups (Server Side) using the new RPC for efficiency
  const { data: groups, error } = await supabase.rpc('fn_list_my_groups')

  if (error) {
    console.error('[GroupsPage] Error fetching groups:', error)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {authUser?.id !== user.id && (
         <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
           <strong className="font-bold">Debug Error: </strong>
           <span className="block sm:inline">Profile ID mismatch. Auth: {authUser?.id?.slice(0,8)}..., Profile: {user.id?.slice(0,8)}...</span>
         </div>
      )}
      
      <GroupsManager 
        initialGroups={groups || []} 
        userId={user.id} 
      />
    </div>
  )
}
