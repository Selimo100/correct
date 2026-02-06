import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { Database } from '@/lib/database.types'

type GroupRow = Database['public']['Tables']['groups']['Row']

export default async function GroupDetailPage({ params }: { params: { id: string } }) {
  const user = await requireAuth()
  const supabase = await createClient()
  const { id } = params

  // Fetch Group (RLS enforced)
  const { data: groupData, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !groupData) {
    console.error(`[GroupDetail] Error fetching group ${id}:`, error)
    if (!groupData) console.error(`[GroupDetail] Group not found (or RLS filtered it). User: ${user.id}`)
    notFound()
  }
  
  const group = groupData as GroupRow;

  // Fetch Members
  // Relation usage based on schema: group_members -> profiles
  const { data: members, error: membersError } = await supabase
    .from('group_members')
    .select('user_id, role, added_at, profiles(username, first_name, last_name, avatar_url, id)')
    .eq('group_id', id)

  if (membersError) {
      console.error(membersError)
  }

  // Flatten logic
  const memberList = (members || []).map((m: any) => ({
      ...m.profiles,
      id: m.user_id, 
      role: m.role || (group.owner_id === m.user_id ? 'OWNER' : 'MEMBER'),
      joined_at: m.added_at
  }))

  const isOwner = group.owner_id === user.id

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/groups" className="text-sm text-gray-500 hover:text-gray-900 mb-4 inline-block font-medium">
        ← Back to My Groups
      </Link>
      
      <div className="bg-white rounded-3xl border border-gray-200 shadow-soft p-6 sm:p-8 mb-6">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
            </div>
            {isOwner && (
                <span className="bg-primary-50 text-primary-700 px-4 py-1.5 rounded-full text-sm font-semibold border border-primary-100">
                    You are Owner
                </span>
            )}
        </div>
        
        <div className="mt-6 flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                {memberList.length} {memberList.length === 1 ? 'Member' : 'Members'}
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Private Group
            </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-soft overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h2 className="font-semibold text-gray-900">Members List</h2>
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Role</span>
        </div>
        <div className="divide-y divide-gray-100">
            {memberList.map((member: any) => (
                <div key={member.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition group">
                    <Link href={`/u/${member.username}`} className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border border-gray-200 shrink-0">
                            {member.avatar_url ? (
                                <img src={member.avatar_url} alt={member.username} className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-lg font-bold text-gray-500">{member.username?.[0]?.toUpperCase()}</span>
                            )}
                        </div>
                        <div>
                            <div className="font-semibold text-gray-900 group-hover:text-primary-600 transition">@{member.username}</div>
                            {member.first_name && <div className="text-sm text-gray-500">{member.first_name} {member.last_name}</div>}
                        </div>
                    </Link>
                    <div className="text-sm font-medium text-gray-500 uppercase tracking-wider text-right">
                        {member.role === 'OWNER' ? (
                            <span className="text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded text-xs border border-yellow-100">Owner</span>
                        ) : (
                           <span className="text-gray-400">Member</span> 
                        )}
                    </div>
                </div>
            ))}
            
            {memberList.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                    No members found (This shouldn't happen for a valid group).
                </div>
            )}
        </div>
      </div>
    </div>
  )
}
