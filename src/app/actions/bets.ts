'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const INVITE_SECRET = process.env.INVITE_SECRET || 'default-dev-secret-key-123'

export async function createBetAction(formData: FormData) {
  const supabase = await createClient()
  
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const category_id = formData.get('category_id') as string
  const end_at_raw = formData.get('end_at') as string
  
  // Validate date
  let end_at: string
  try {
    const d = new Date(end_at_raw)
    if (isNaN(d.getTime())) {
      throw new Error("Invalid date")
    }
    end_at = d.toISOString()
  } catch (e) {
    throw new Error("Invalid end date provided")
  }

  const max_participants = formData.get('max_participants') ? parseInt(formData.get('max_participants') as string) : null
  const audience = (formData.get('audience') as string) || 'PUBLIC'
  const group_id = formData.get('group_id') as string
  const invite_code_enabled = formData.get('invite_code_enabled') === 'on'
  const hide_participants = formData.get('hide_participants') === 'on'

  // Use V2 RPC for audience support
  const { data, error } = await (supabase.rpc as any)('fn_create_bet_v2', {
    p_title: title,
    p_description: description || null,
    p_category_id: category_id && category_id !== '' ? category_id : null,
    p_end_at: end_at,
    p_max_participants: max_participants,
    p_audience: audience,
    p_group_id: group_id && group_id !== '' ? group_id : null,
    p_invite_code_enabled: invite_code_enabled,
    p_hide_participants: hide_participants,
    p_secret: INVITE_SECRET
  })

  if (error) {
    console.error('Create Bet Error:', error)
    throw new Error(error.message)
  }

  return data as { id: string, invite_code: string | null, audience?: string }
}

export async function getInviteCodeAction(betId: string) {
  const supabase = await createClient()
  
  const { data, error } = await (supabase.rpc as any)('fn_get_invite_code', {
    p_bet_id: betId,
    p_secret: INVITE_SECRET
  })
  
  if (error) throw new Error(error.message)
  
  return data as string
}

export async function rotateInviteCodeAction(betId: string) {
  const supabase = await createClient()
  
  const { data, error } = await (supabase.rpc as any)('fn_rotate_invite_code', {
    p_bet_id: betId,
    p_secret: INVITE_SECRET
  })
  
  if (error) throw new Error(error.message)
  
  revalidatePath(`/bets/${betId}`)
  return data as string
}
