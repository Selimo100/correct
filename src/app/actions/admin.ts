'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function grantFundsAction(userId: string, amount: number, reason: string) {
  const supabase = await createClient()

  // Use type casting to bypass any temporary type sync delays, though we updated database.types.ts
  const { data, error } = await (supabase.rpc as any)('fn_admin_add_funds', {
    p_target_user_id: userId,
    p_amount: amount,
    p_reason: reason
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/users')
  return { success: true }
}
