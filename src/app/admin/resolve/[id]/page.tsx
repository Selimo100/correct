import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Ban, Calendar, Users, DollarSign, AlertTriangle } from 'lucide-react'

// Define the type based on the RPC response we just created
type AdminBetDetail = {
  id: string
  title: string
  description: string
  creator_id: string
  creator_name: string
  creator_username: string
  category: string
  end_at: string
  created_at: string
  status: string
  derived_status: string
  hidden: boolean
  resolution: boolean | null
  participants_count: number
  total_pot: number
  for_stake: number
  against_stake: number
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

  // Use the new SECURITY DEFINER RPC
  // @ts-ignore - type missing in regenerated types
  const { data, error } = await supabase.rpc('fn_admin_get_bet', {
    p_bet_id: id
  })

  // Since RPC returns a set of rows (TABLE), accessing single() or data[0]
  // data is likely an array if type is inferred correctly, or we cast.
  const betRows = data as unknown as AdminBetDetail[] | null
  const bet = betRows && betRows.length > 0 ? betRows[0] : null

  if (error || !bet) {
    // If it fails, we assume bet doesn't exist or admin lacks something, but RPC should handle it.
    // However, user complained about redirect. We will show error page instead of redirect if possible,
    // or redirect to /admin/moderate if not found.
    console.error('Failed to fetch bet for resolution:', error)
    if (!bet) {
         redirect('/admin/moderate')
    }
  }

  // Helper actions
  async function resolveBet(formData: FormData) {
    'use server'
    await requireAdmin()
    const supabase = await createClient()
    
    const betId = formData.get('bet_id') as string
    const resolution = formData.get('resolution') === 'true'
    
    // Call the new idempotent RPC
    // @ts-ignore - manual override
    const { data: result, error: rpcError } = await supabase.rpc('fn_admin_resolve_bet', {
      p_bet_id: betId,
      p_outcome: resolution,
      p_fee_bps: 0
    })

    if (rpcError) {
      redirect(`/admin/resolve/${betId}?error=${encodeURIComponent(rpcError.message)}`)
    }

    const res = result as any
    if (res.status === 'ALREADY_SETTLED') {
        redirect(`/admin/resolve/${betId}?error=Already settled`)
    }

    revalidatePath('/admin/moderate')
    revalidatePath(`/bets/${betId}`)
    redirect('/admin/moderate?status=RESOLVED')
  }

  async function voidBet(formData: FormData) {
    'use server'
    await requireAdmin()
    const supabase = await createClient()
    const betId = formData.get('bet_id') as string

    // @ts-ignore - manual override
    const { data: result, error: rpcError } = await supabase.rpc('fn_admin_void_bet', {
      p_bet_id: betId
    })

    if (rpcError) {
      redirect(`/admin/resolve/${betId}?error=${encodeURIComponent(rpcError.message)}`)
    }

    revalidatePath('/admin/moderate')
    revalidatePath(`/bets/${betId}`)
    redirect('/admin/moderate?status=VOID')
  }

  const isLocked = bet!.derived_status === 'LOCKED'
  const isResolved = bet!.status === 'RESOLVED'
  const isVoid = bet!.status === 'VOID'
  const isOpen = bet!.status === 'OPEN' && !isLocked

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/admin/moderate"
        className="mb-6 inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Moderate
      </Link>

      {errorMsg && (
         <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 border border-red-200">
           <div className="flex items-center gap-2">
             <AlertTriangle className="w-5 h-5"/>
             <span className="font-bold">Error:</span> {decodeURIComponent(errorMsg)}
           </div>
         </div>
      )}
      
      {successMsg && (
         <div className="mb-6 rounded-lg bg-green-50 p-4 text-green-700 border border-green-200">
           <span className="font-bold">Success:</span> {successMsg}
         </div>
      )}

      <div className="rounded-3xl border border-gray-200 bg-white shadow-lg overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Resolution Console
            </span>
            <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
                isLocked ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                isResolved ? 'bg-green-100 text-green-700 border-green-200' :
                isVoid ? 'bg-gray-100 text-gray-700 border-gray-200' :
                'bg-blue-100 text-blue-700 border-blue-200'
            }`}>
                {isResolved ? 'RESOLVED' : isVoid ? 'VOID' : isLocked ? 'LOCKED (Ready)' : 'OPEN'}
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-8">
          {/* Bet Details */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{bet!.title}</h1>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
               <span>by @{bet!.creator_username}</span>
               <span>•</span>
               <span>{new Date(bet!.created_at).toLocaleDateString()}</span>
            </div>
            {bet!.description && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg text-gray-700">
                    {bet!.description}
                </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                <div className="text-xs text-gray-500 uppercase font-semibold">Total Pot</div>
                <div className="text-2xl font-bold text-gray-900">{bet!.total_pot}</div>
             </div>
             <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                <div className="text-xs text-gray-500 uppercase font-semibold">Participants</div>
                <div className="text-2xl font-bold text-gray-900">{bet!.participants_count}</div>
             </div>
             <div className="p-4 rounded-xl border border-green-100 bg-green-50/30">
                <div className="text-xs text-green-700 uppercase font-semibold">FOR Stake</div>
                <div className="text-xl font-bold text-green-700">{bet!.for_stake}</div>
             </div>
             <div className="p-4 rounded-xl border border-red-100 bg-red-50/30">
                <div className="text-xs text-red-700 uppercase font-semibold">AGAINST Stake</div>
                <div className="text-xl font-bold text-red-700">{bet!.against_stake}</div>
             </div>
          </div>

          {/* Action Panel */}
          <div className="border-t border-gray-100 pt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Settlement Actions</h3>
            
            {!isLocked && !isResolved && !isVoid && (
                <div className="bg-blue-50 text-blue-800 p-4 rounded-lg">
                    This bet is still OPEN. It must be LOCKED (end date passed) before resolution.
                    <br/>
                    Ends at: {new Date(bet!.end_at).toLocaleString()}
                </div>
            )}

            {(isResolved || isVoid) && (
                <div className="bg-gray-100 text-gray-700 p-4 rounded-lg">
                    This bet has already been settled.
                    {isResolved && (
                        <div className="mt-2 font-semibold">
                            Outcome: {bet!.resolution ? 'FOR WINS' : 'AGAINST WINS'}
                        </div>
                    )}
                </div>
            )}

            {isLocked && !isResolved && !isVoid && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                         <form action={resolveBet}>
                            <input type="hidden" name="bet_id" value={bet!.id} />
                            <input type="hidden" name="resolution" value="true" />
                            <button
                                type="submit"
                                className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-soft transition-all"
                            >
                                <CheckCircle2 className="w-6 h-6" />
                                <span>Resolve FOR Wins</span>
                            </button>
                            <p className="text-xs text-gray-500 text-center px-4">
                                Winners on FOR side receive a share of {bet!.total_pot} Neos.
                            </p>
                         </form>
                    </div>

                    <div className="space-y-3">
                         <form action={resolveBet}>
                            <input type="hidden" name="bet_id" value={bet!.id} />
                            <input type="hidden" name="resolution" value="false" />
                            <button
                                type="submit"
                                className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-soft transition-all"
                            >
                                <CheckCircle2 className="w-6 h-6" />
                                <span>Resolve AGAINST Wins</span>
                            </button>
                            <p className="text-xs text-gray-500 text-center px-4">
                                Winners on AGAINST side receive a share of {bet!.total_pot} Neos.
                            </p>
                         </form>
                    </div>

                    <div className="md:col-span-2 pt-6 border-t border-gray-100 mt-2">
                        <form action={voidBet}>
                            <input type="hidden" name="bet_id" value={bet!.id} />
                            <button
                                type="submit"
                                className="w-full md:w-auto px-8 py-3 flex items-center justify-center gap-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-all mx-auto"
                            >
                                <Ban className="w-5 h-5" />
                                <span>Void Bet (Refund All)</span>
                            </button>
                         </form>
                    </div>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}