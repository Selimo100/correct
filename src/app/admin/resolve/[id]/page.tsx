import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Database } from '@/lib/database.types'

type Bet = Database['public']['Tables']['bets']['Row'] & {
  profiles?: { username: string }
}

type BetStats = {
  total_pot: number
  for_stake: number
  against_stake: number
  participant_count: number
  for_count: number
  against_count: number
}

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; message?: string }>
}

export default async function ResolveBetPage({ params, searchParams }: Props) {
  await requireAdmin()
  const { id } = await params
  const { error: errorMsg, message: successMsg } = await searchParams
  
  const supabase = await createClient()
  
  const { data: bet } = await supabase
    .from('bets')
    .select(`
      *,
      profiles!bets_creator_id_fkey(username)
    `)
    .eq('id', id)
    .single()
  
  if (!bet) {
    redirect('/admin')
  }
  
  // @ts-expect-error - Supabase RPC typing issue
  const { data: stats } = await supabase.rpc('get_bet_stats', { p_bet_id: id })
  
  const betData = bet as Bet
  const statsData = (stats as unknown as BetStats) || { total_pot: 0, for_stake: 0, against_stake: 0, participant_count: 0, for_count: 0, against_count: 0 }

  async function resolveBet(formData: FormData) {
    'use server'
    
    await requireAdmin()
    const supabase = await createClient()
    
    const betId = formData.get('bet_id') as string
    const resolution = formData.get('resolution') as string
    const feeBps = parseInt(formData.get('fee_bps') as string) || 0
    
    // @ts-expect-error - Supabase RPC typing issue
    const { data, error } = await supabase.rpc('resolve_bet', {
      p_bet_id: betId,
      p_resolution: resolution === 'true',
      p_fee_bps: feeBps,
    })
    
    if (error) {
      // Redirect with error message to display in UI
      console.error("Resolve Error:", error)
      redirect(`/admin/resolve/${betId}?error=${encodeURIComponent(error.message || JSON.stringify(error))}`)
    }
    
    const result = data as unknown as { success: boolean; error?: string; voided?: boolean; already_settled?: boolean }
    
    if (!result || !result.success) {
      redirect(`/admin/resolve/${betId}?error=${encodeURIComponent(result?.error || 'Failed to resolve bet')}`)
    }
    
    // Success - revalidate and redirect
    revalidatePath('/admin')
    revalidatePath(`/bets/${betId}`)
    
    if (result.voided) {
      redirect('/admin?message=Bet auto-voided (no winners) and stakes refunded')
    } else if (result.already_settled) {
      redirect('/admin?message=Bet was already settled')
    } else {
      redirect('/admin?message=Bet resolved successfully')
    }
  }

  async function voidBet(formData: FormData) {
    'use server'
    
    await requireAdmin()
    const supabase = await createClient()
    
    const betId = formData.get('bet_id') as string
    
    // @ts-expect-error - Supabase RPC typing issue
    const { data, error } = await supabase.rpc('void_bet', { p_bet_id: betId })
    
    if (error) {
       redirect(`/admin/resolve/${betId}?error=${encodeURIComponent(error.message)}`)
    }
    
    const result = data as unknown as { success: boolean; error?: string; already_voided?: boolean }
    
    if (!result || !result.success) {
       redirect(`/admin/resolve/${betId}?error=${encodeURIComponent(result?.error || 'Failed to void bet')}`)
    }
    
    // Success - revalidate and redirect
    revalidatePath('/admin')
    revalidatePath(`/bets/${betId}`)
    
    if (result.already_voided) {
      redirect('/admin?message=Bet was already voided')
    } else {
      redirect('/admin?message=Bet voided and stakes refunded')
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Resolve Bet</h1>

      {/* Error/Success Messages */}
      {errorMsg && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 border border-red-200 text-red-700">
          <strong>Error:</strong> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="mb-6 rounded-lg bg-emerald-50 p-4 border border-emerald-200 text-emerald-700">
          {successMsg}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border p-8 mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">{betData.title}</h2>
        
        {betData.description && (
          <p className="text-gray-700 mb-4 whitespace-pre-wrap">{betData.description}</p>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">Total Pot</div>
            <div className="text-2xl font-bold text-gray-900">{statsData.total_pot || 0} Neos</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">Participants</div>
            <div className="text-2xl font-bold text-gray-900">{statsData.participant_count || 0}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">FOR Stake</div>
            <div className="text-2xl font-bold text-green-600">{statsData.for_stake || 0} Neos</div>
            <div className="text-xs text-gray-600">{statsData.for_count || 0} participants</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">AGAINST Stake</div>
            <div className="text-2xl font-bold text-red-600">{statsData.against_stake || 0} Neos</div>
            <div className="text-xs text-gray-600">{statsData.against_count || 0} participants</div>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          <div>Created by: {betData.profiles?.username}</div>
          <div>Ended: {new Date(betData.end_at).toLocaleString()}</div>
        </div>
      </div>

      {/* Resolve Form */}
      <div className="bg-white rounded-lg shadow-sm border p-8 mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Resolve Bet</h3>
        
        <form action={resolveBet} className="space-y-6">
          <input type="hidden" name="bet_id" value={betData.id} />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              What is the resolution? *
            </label>
            <div className="space-y-3">
              <label className="flex items-center p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-green-500">
                <input
                  type="radio"
                  name="resolution"
                  value="true"
                  required
                  className="mr-3"
                />
                <div>
                  <div className="font-medium text-gray-900">FOR (Statement is TRUE/CORRECT)</div>
                  <div className="text-sm text-gray-600">FOR side wins, AGAINST side loses</div>
                </div>
              </label>
              
              <label className="flex items-center p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-red-500">
                <input
                  type="radio"
                  name="resolution"
                  value="false"
                  required
                  className="mr-3"
                />
                <div>
                  <div className="font-medium text-gray-900">AGAINST (Statement is FALSE/INCORRECT)</div>
                  <div className="text-sm text-gray-600">AGAINST side wins, FOR side loses</div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="fee_bps" className="block text-sm font-medium text-gray-700 mb-2">
              Platform Fee (basis points, optional)
            </label>
            <input
              type="number"
              id="fee_bps"
              name="fee_bps"
              min="0"
              max="1000"
              defaultValue="0"
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              100 bps = 1%. Default is 0% (no fee).
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Resolution Process</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Winners receive proportional payouts based on their stake</li>
              <li>• Payout = stake × (total pot - fee) / winners total</li>
              <li>• All transactions are recorded in the wallet ledger</li>
              <li>• If no one bet on the winning side, the bet will be voided</li>
            </ul>
          </div>

          <button
            type="submit"
            className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
          >
            Resolve Bet
          </button>
        </form>
      </div>

      {/* Void Option */}
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Void Bet</h3>
        <p className="text-gray-700 mb-4">
          Use this option if the bet should be canceled (e.g., statement is unclear, 
          circumstances changed, etc.). All stakes will be refunded to participants.
        </p>
        
        <form action={voidBet}>
          <input type="hidden" name="bet_id" value={betData.id} />
          
          <button
            type="submit"
            className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700"
          >
            Void & Refund All Stakes
          </button>
        </form>
      </div>
    </div>
  )
}
