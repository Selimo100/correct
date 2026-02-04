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

export async function setBetHiddenAction(betId: string, hidden: boolean) {
  const supabase = await createClient()
  
  // @ts-ignore - manual type override
  const { error } = await supabase.rpc('fn_admin_set_bet_hidden', {
    p_bet_id: betId,
    p_hidden: hidden
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin')
  return { success: true }
}

export async function resolveBetAction(betId: string, outcome: boolean) {
  const supabase = await createClient()
  
  // @ts-ignore - manual type override
  const { data, error } = await supabase.rpc('fn_admin_resolve_bet', {
    p_bet_id: betId,
    p_outcome: outcome,
    p_fee_bps: 0 // Default 0 for now as per plan
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin')
  return { success: true, result: data }
}

export async function voidBetAction(betId: string) {
  const supabase = await createClient()
  
  // @ts-ignore - manual type override
  const { data, error } = await supabase.rpc('fn_admin_void_bet', {
    p_bet_id: betId
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin')
  return { success: true, result: data }
}
