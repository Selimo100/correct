import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Database } from '@/lib/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export async function getCurrentUser(): Promise<Profile | null> {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()
  
  if (!user) return null
  
  // Get profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  return profile
}

export async function requireAuth(): Promise<Profile> {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/auth/sign-in')
  }
  return user
}

export async function requireAdmin(): Promise<Profile> {
  const user = await requireAuth()
  if (!user.is_admin) {
    redirect('/')
  }
  return user
}
