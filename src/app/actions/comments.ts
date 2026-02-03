'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'

export async function createComment(betId: string, content: string, parentId: string | null = null) {
  const user = await requireAuth()
  const supabase = await createClient()

  // Validate input
  if (!content || content.trim().length === 0) {
    return { error: 'Comment cannot be empty' }
  }

  // Use the RPC to create comment securely (checks status ACTIVE)
  // @ts-expect-error - RPC types not auto-generated yet
  const { data, error } = await supabase.rpc('fn_create_comment', {
    p_bet_id: betId,
    p_content: content,
    p_parent_id: parentId
  })

  if (error) {
    console.error('Error creating comment:', error)
    return { error: error.message }
  }

  revalidatePath(`/bets/${betId}`)
  return { success: true }
}
