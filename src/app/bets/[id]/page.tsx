import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import StakeForm from '@/components/StakeForm'
import CommentSection, { CommentType } from '@/components/CommentSection'
import PrivateBetGate from '@/components/PrivateBetGate'
import InviteCodePanel from '@/components/InviteCodePanel'
import { formatToZurich } from '@/lib/date'
import type { Database } from '@/lib/database.types'

type Bet = Database['public']['Tables']['bets']['Row'] & { 
  visibility: 'PUBLIC' | 'PRIVATE', 
  hide_participants: boolean,
  has_access: boolean,
  invite_code_enabled: boolean,
  participants?: any[]
}

type BetStats = {
  total_pot: number
  for_stake: number
  against_stake: number
  participant_count: number
}

type BetEntry = Database['public']['Tables']['bet_entries']['Row']

export const dynamic = 'force-dynamic'

interface Props {
  params: { id: string }
  searchParams: { new?: string, code?: string }
}

export default async function BetDetailPage({ params, searchParams }: Props) {
  const { id } = params
  const { new: isNew, code: inviteCode } = searchParams
  const supabase = await createClient()
  const user = await getCurrentUser()
  
  // Use RPC to get bet details + access check + anonymity handling
  let bet: Bet | null = null
  
  const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('fn_get_bet_detail', {
    p_bet_id: id
  })

  if (!rpcError && rpcData) {
    bet = rpcData as unknown as Bet
  } else {
    // FALLBACK: If RPC missing or failed, try standard select
    console.warn('RPC fn_get_bet_detail failed, falling back to standard query', rpcError)
    
    // We select specific fields if they exist, or * and careful with types
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('bets')
      .select('*')
      .eq('id', id)
      .single()
      
    if (fallbackError || !fallbackData) {
       console.error('Fallback fetch error:', fallbackError)
       notFound()
    }
    
    // Mock the enhanced fields for the fallback
    bet = {
      ...(fallbackData as any),
      visibility: (fallbackData as any).visibility || 'PUBLIC',
      hide_participants: (fallbackData as any).hide_participants || false,
      invite_code_enabled: (fallbackData as any).invite_code_enabled || false,
      has_access: true, // If RLS let us read it, we have access
      participants: [] // Cannot easily fetch participants list in fallback without joining
    } as unknown as Bet
  }
  
  // Final check
  if (!bet) {
    notFound()
  }
  
  // 1. Access Check for Private Bets
  if (bet.visibility === 'PRIVATE' && !bet.has_access) {
     return <PrivateBetGate betId={id} inviteCodeEnabled={bet.invite_code_enabled} initialCode={inviteCode} />
  }

  // Fetch creator separately (if not in RPC details fully, though RPC returns creator_id)
  const { data: creatorData } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', bet.creator_id)
    .single()
  
  const creator = creatorData as { username: string } | null
  
  // Fetch resolver if bet is resolved
  let resolver = null
  if (bet.resolved_by_id) {
    const { data: resolverData } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', bet.resolved_by_id)
      .single()
    resolver = resolverData
  }
  
  // Extract Stats directly from RPC response
  // The RPC returns aggregates in the root object
  const statsData: BetStats = {
     total_pot: (bet as any).pot_total || 0,
     for_stake: (bet as any).amount_yes || 0,
     against_stake: (bet as any).amount_no || 0,
     participant_count: (bet as any).participants_total || 0
  }
  
  // Find my entry from the participants array returned by RPC
  // The RPC guarantees "Only show self" if anonymous, so if I have an entry, it IS in the list.
  const participants = bet.participants || []
  let userEntry: BetEntry | null = null
  let userBalance = 0
  
  if (user) {
    const myEntry = participants.find((p: any) => p.user_id === user.id)
    if (myEntry) {
       // Map to BetEntry shape if needed, or use as is. 
       // BetEntry row shape: id, bet_id, user_id, amount, vote, created_at...
       userEntry = myEntry as BetEntry
    }

    // @ts-expect-error - Supabase RPC typing issue
    const { data: balance } = await supabase.rpc('get_balance', { p_user_id: user.id })
    userBalance = (balance as unknown as number) || 0
  }
  
  const betData = bet
  
  const isLocked = new Date(betData.end_at) <= new Date() && betData.status === 'OPEN'
  const canStake = user && betData.status === 'OPEN' && !isLocked
  
  const totalPot = statsData.total_pot || 0
  const forStake = statsData.for_stake || 0
  const againstStake = statsData.against_stake || 0
  const forPercentage = totalPot > 0 ? Math.round((forStake / totalPot) * 100) : 50
  const againstPercentage = totalPot > 0 ? Math.round((againstStake / totalPot) * 100) : 50

  // Fetch comments via Secure RPC
  // @ts-expect-error - RPC types not auto-generated yet
  const { data: rawComments } = await supabase.rpc('fn_get_comments', { p_bet_id: id })

  // Transform comments into nested structure
  const comments: CommentType[] = []
  const replyMap = new Map<string, any[]>()

  // 1. Collect replies by parent_id
  ;(rawComments as unknown as any[])?.forEach((c: any) => {
    // Map RPC flat response to UI structure
    const mappedComment = {
      id: c.id,
      content: c.content,
      created_at: c.created_at,
      parent_id: c.parent_id,
      user_id: c.user_id,
      profiles: {
        username: c.username,
        first_name: c.first_name,
        last_name: c.last_name
      }
    }

    if (mappedComment.parent_id) {
       if (!replyMap.has(mappedComment.parent_id)) replyMap.set(mappedComment.parent_id, [])
       replyMap.get(mappedComment.parent_id)!.push(mappedComment)
    } else {
       // Temporarily store roots to be enriched later
       comments.push(mappedComment as any)
    }
  })

  // 2. Attach replies to roots
  comments.forEach(c => {
    c.replies = replyMap.get(c.id) || []
  })

  // Sort comments: Newest last (chronological) usually for forums, or Newest first?
  // Chat usually Newest bottom. Comments usually Newest top or Chronological.
  // We ordered by created_at ASC in query, so Chronological (Oldest top).

  return (
    <div className="max-w-4xl mx-auto">
      {isNew === 'true' && betData.visibility === 'PRIVATE' && (
         <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-purple-900 mb-2">Private Bet Created!</h3>
            <p className="text-purple-800 mb-4">
              Your private bet is ready. Share the invite code below with users you want to invite.
            </p>
            {inviteCode && (
               <div className="space-y-4">
                 <div className="bg-white p-4 rounded border border-purple-200 flex justify-between items-center max-w-md">
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Invite Code</div>
                      <code className="text-xl font-mono font-bold tracking-widest">{inviteCode}</code>
                    </div>
                 </div>
                 
                 <div className="bg-white p-4 rounded border border-purple-200">
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Share Link (Auto-fill Code)</div>
                    <code className="block text-sm font-mono bg-gray-50 p-2 rounded break-all">
                       {`${process.env.NEXT_PUBLIC_APP_URL || 'https://correct.app'}/bets/${id}?code=${inviteCode}`}
                    </code>
                 </div>
               </div>
            )}
         </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border p-8 mb-6">
        {/* Status Badge */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            {betData.status === 'RESOLVED' && (
              <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
                RESOLVED: {betData.resolution ? 'FOR WINS' : 'AGAINST WINS'}
              </span>
            )}
            {betData.status === 'VOID' && (
              <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-800">
                VOIDED
              </span>
            )}
            {betData.status === 'OPEN' && isLocked && (
              <span className="px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-800">
                LOCKED
              </span>
            )}
            {betData.status === 'OPEN' && !isLocked && (
              <span className="px-3 py-1 text-sm font-medium rounded-full bg-primary-100 text-primary-800">
                OPEN
              </span>
            )}
            {betData.visibility === 'PRIVATE' && (
              <span className="ml-2 px-3 py-1 text-sm font-medium rounded-full bg-purple-100 text-purple-800">
                PRIVATE
              </span>
            )}
            {betData.hide_participants && (
              <span className="ml-2 px-3 py-1 text-sm font-medium rounded-full bg-slate-100 text-slate-800">
                ANONYMOUS
              </span>
            )}
          </div>
          {betData.category && (
            <span className="px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-700">
              {betData.category}
            </span>
          )}
        </div>

        {/* Title and Creator */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{betData.title}</h1>
        <p className="text-gray-500 mb-4">
          Created by {creator?.username || 'Unknown'} on{' '}
          {formatToZurich(betData.created_at, 'dd.MM.yyyy')}
        </p>

        {/* Description */}
        {betData.description && (
          <p className="text-gray-700 mb-6 whitespace-pre-wrap">{betData.description}</p>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-primary-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">Total Pot</div>
            <div className="text-2xl font-bold text-primary-600">{totalPot} Neos</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">Participants</div>
            <div className="text-2xl font-bold text-gray-900">
              {statsData.participant_count || 0}
              {betData.max_participants && ` / ${betData.max_participants}`}
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">FOR Stake</div>
            <div className="text-2xl font-bold text-green-600">{forStake} Neos</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">AGAINST Stake</div>
            <div className="text-2xl font-bold text-red-600">{againstStake} Neos</div>
          </div>
        </div>

        {/* Distribution Visualization */}
        {totalPot > 0 && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>FOR {forPercentage}%</span>
              <span>AGAINST {againstPercentage}%</span>
            </div>
            <div className="flex h-4 rounded-lg overflow-hidden">
              <div className="bg-green-500" style={{ width: `${forPercentage}%` }} />
              <div className="bg-red-500" style={{ width: `${againstPercentage}%` }} />
            </div>
          </div>
        )}

        {/* End Time */}
        <div className="text-sm text-gray-600">
          <span className="font-medium">Betting ends:</span>{' '}
          {formatToZurich(betData.end_at)}
        </div>

        {/* --- CREATOR ONLY: Invite Code Panel --- */}
        {user?.id === betData.creator_id && betData.visibility === 'PRIVATE' && betData.invite_code_enabled && (
           <InviteCodePanel betId={id} initialCode={isNew === 'true' ? inviteCode : undefined} />
        )}

      </div>

      {/* Stake Form */}
      {canStake ? (
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Place Your Stake</h2>
          <StakeForm
            betId={id}
            currentStake={userEntry?.stake}
            currentSide={userEntry?.side as 'FOR' | 'AGAINST'}
            userBalance={userBalance}
          />
        </div>
      ) : !user ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <p className="text-gray-600 mb-4">Sign in to place a stake on this bet</p>
          <a
            href="/auth/sign-in"
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
          >
            Sign In
          </a>
        </div>
      ) : isLocked ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <p className="text-yellow-800 font-medium">This bet is locked and no longer accepting stakes.</p>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">This bet has been {betData.status.toLowerCase()}.</p>
        </div>
      )}

      {/* Participants Section */}
      <div className="bg-white rounded-lg shadow-sm border p-8 mb-6 mt-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Participants</h3>
        {betData.hide_participants && (!betData.participants || betData.participants.length <= 1) ? (
           <div className="flex items-center text-gray-500 italic">
              <span className="mr-2">👻</span>
              Participants are hidden for this bet (Anonymous Mode).
           </div>
        ) : (
           <div className="space-y-2">
             {betData.participants && betData.participants.length > 0 ? (
                betData.participants.map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center py-2 border-b last:border-0 border-gray-100">
                    <div className="flex items-center">
                       <span className="font-medium text-gray-900">{p.username || 'Unknown'}</span>
                       {p.user_id === user?.id && <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-1.5 rounded">You</span>}
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                       <span className={p.vote === 'FOR' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                         {p.vote === 'FOR' ? 'FOR' : 'AGAINST'}
                       </span>
                       <span className="text-gray-500">{p.amount} Neos</span>
                    </div>
                  </div>
                ))
             ) : (
                <p className="text-gray-500">No participants yet.</p>
             )}
           </div>
        )}
      </div>

      {/* Comment Section */}
      <CommentSection 
        comments={comments} 
        betId={id} 
        userStatus={user?.status || null} 
      />
    </div>
  )
}
