import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Database } from '@/lib/database.types'

type Bet = Database['public']['Tables']['bets']['Row'] & {
  profiles?: { username: string }
}

export const dynamic = 'force-dynamic'

export default async function ModerateBetsPage() {
  await requireAdmin()
  const supabase = await createClient()

  // Get all bets with moderation focus
  const { data: allBets } = await supabase
    .from('bets')
    .select(`
      *,
      profiles!bets_creator_id_fkey(username)
    `)
    .order('created_at', { ascending: false })

  const betList = (allBets as Bet[]) || []
  const hiddenBets = betList.filter(b => b.hidden)
  const visibleBets = betList.filter(b => !b.hidden)

  async function toggleHidden(formData: FormData) {
    'use server'
    await requireAdmin()
    const supabase = await createClient()
    
    const betId = formData.get('bet_id') as string
    const currentHidden = formData.get('current_hidden') === 'true'
    
    await supabase
      .from('bets')
      // @ts-expect-error - 'hidden' is valid but types might be outdated
      .update({ hidden: !currentHidden })
      .eq('id', betId)
    
    // Log admin action
    const admin = await requireAdmin()
    // @ts-expect-error - 'admin_actions' types are outdated
    await supabase.from('admin_actions').insert({
      admin_id: admin.id,
      action: currentHidden ? 'UNHIDE_BET' : 'HIDE_BET',
      target_type: 'BET',
      target_id: betId,
    })
    
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/admin/bets')
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Moderate Bets</h1>
        <Link
          href="/admin"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-sm text-gray-600">Total Bets</div>
          <div className="text-3xl font-bold text-gray-900">{betList.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-sm text-gray-600">Visible</div>
          <div className="text-3xl font-bold text-green-600">{visibleBets.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="text-sm text-gray-600">Hidden</div>
          <div className="text-3xl font-bold text-red-600">{hiddenBets.length}</div>
        </div>
      </div>

      {/* Hidden Bets */}
      {hiddenBets.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Hidden Bets ({hiddenBets.length})</h2>
          <div className="space-y-3">
            {hiddenBets.map((bet) => (
              <div key={bet.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <Link href={`/bets/${bet.id}`} className="font-medium text-gray-900 hover:text-primary-600">
                      {bet.title}
                    </Link>
                    <div className="text-sm text-gray-600 mt-1">
                      Created by {bet.profiles?.username || 'Unknown'} • {new Date(bet.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Status: {bet.status}
                    </div>
                  </div>
                  <form action={toggleHidden} className="ml-4">
                    <input type="hidden" name="bet_id" value={bet.id} />
                    <input type="hidden" name="current_hidden" value="true" />
                    <button
                      type="submit"
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
                    >
                      Unhide
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visible Bets */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Visible Bets ({visibleBets.length})</h2>
        <div className="space-y-3">
          {visibleBets.map((bet) => (
            <div key={bet.id} className="bg-white border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <Link href={`/bets/${bet.id}`} className="font-medium text-gray-900 hover:text-primary-600">
                    {bet.title}
                  </Link>
                  <div className="text-sm text-gray-600 mt-1">
                    Created by {bet.profiles?.username || 'Unknown'} • {new Date(bet.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {/* @ts-expect-error - total_pot might not be in type definition yet */}
                    Status: {bet.status} • Pot: {bet.total_pot || 0} Neos
                  </div>
                </div>
                <form action={toggleHidden} className="ml-4">
                  <input type="hidden" name="bet_id" value={bet.id} />
                  <input type="hidden" name="current_hidden" value="false" />
                  <button
                    type="submit"
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700"
                  >
                    Hide
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
