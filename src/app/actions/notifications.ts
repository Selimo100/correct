'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markRead(notificationId: string) {
  const supabase = await createClient()
  const { error } = await (supabase.rpc as any)('fn_mark_read', {
    p_notification_id: notificationId
  })

  if (error) throw new Error(error.message)
  revalidatePath('/notifications')
}

export async function markAllRead() {
  const supabase = await createClient()
  const { error } = await (supabase.rpc as any)('fn_mark_all_read')

  if (error) throw new Error(error.message)
  revalidatePath('/notifications')
}

export async function getUnreadCount() {
    const supabase = await createClient()
    const { data, error } = await (supabase.rpc as any)('fn_unread_count')
    if(error) return 0
    return data as number
}

export async function listNotifications(limit = 20, offset = 0) {
  const supabase = await createClient()
  const { data, error } = await (supabase.rpc as any)('fn_list_notifications', {
    p_limit: limit,
    p_offset: offset
  })
  
  if (error) throw new Error(error.message)
  return data
}
