import { createClient } from './supabase/client'

export const friends = {
  searchUsers: async (query: string) => {
    const supabase = createClient()
    const { data, error } = await (supabase.rpc as any)('fn_search_users', { p_query: query, p_exclude_friends: true })
    if (error) throw error
    return (data as any[]) || []
  },
  sendRequest: async (username: string) => {
    const supabase = createClient()
    const { data, error } = await (supabase.rpc as any)('fn_send_friend_request', { p_to_username: username })
    if (error) throw error
    return data
  },
  respondToRequest: async (requestId: string, accept: boolean) => {
    const supabase = createClient()
    const { data, error } = await (supabase.rpc as any)('fn_respond_friend_request', { p_request_id: requestId, p_accept: accept })
    if (error) throw error
    return data
  },
  getFriends: async () => {
    const supabase = createClient()
    // Using simple select via RLS
    const { data, error } = await supabase
      .from('friendships')
      .select('friend_id, profiles!friendships_friend_id_fkey(username, first_name, last_name)')
    
    if (error) throw error
    // Flatten
    return data.map((f: any) => ({
      id: f.friend_id,
      ...f.profiles
    }))
  },
  getRequests: async () => {
    const supabase = createClient()
    // Incoming
    const { data, error } = await supabase
      .from('friend_requests')
      .select('created_at, status, id, profiles!friend_requests_from_user_id_fkey(username, first_name, last_name)')
      .eq('status', 'PENDING')
      .neq('from_user_id', (await supabase.auth.getUser()).data.user?.id) // Incoming only
    
    if (error) throw error
    return data
  }
}

export const groups = {
  list: async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('groups')
      .select('*, group_members(count)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },
  create: async (name: string, description: string) => {
    const supabase = createClient()
    const { data, error } = await (supabase.rpc as any)('fn_create_group', { p_name: name, p_description: description })
    if (error) throw error
    return data
  },
  addMember: async (groupId: string, username: string) => {
    const supabase = createClient()
    const { data, error } = await (supabase.rpc as any)('fn_add_group_member', { p_group_id: groupId, p_username: username })
    if (error) throw error
    return data
  }
}
