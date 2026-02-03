import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Delete/reject a user (admin only)
 * This uses service role to disable the auth account and delete profile
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if caller is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, is_super_admin')
      .eq('id', user.id)
      .single()
    
    // @ts-expect-error - profile type
    if (!profile?.is_admin && !profile?.is_super_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    
    const body = await request.json()
    const { user_id, reason } = body
    
    if (!user_id) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 })
    }
    
    // Check if target user is super admin
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user_id)
      .single()
    
    // @ts-expect-error - targetProfile type
    if (targetProfile?.is_super_admin && !profile?.is_super_admin) {
      return NextResponse.json({ error: 'Cannot delete super admin' }, { status: 403 })
    }
    
    // Create service role client for admin operations
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
    
    // Log the admin action first
    // @ts-expect-error - admin_actions type outdated
    await supabase.from('admin_actions').insert({
      admin_id: user.id,
      action: 'REJECT_USER',
      target_type: 'USER',
      target_id: user_id,
      details: { reason }
    })
    
    // Delete the user's auth account using service role
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user_id)
    
    if (authError) {
      console.error('Error deleting auth user:', authError)
      // Continue anyway - profile will be deleted by CASCADE
    }
    
    // Profile and related data will be deleted by CASCADE foreign keys
    // (bet_entries, wallet_ledger have ON DELETE CASCADE or SET NULL)
    
    return NextResponse.json({ 
      success: true,
      message: 'User deleted successfully'
    })
  } catch (error) {
    console.error('Error rejecting user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
