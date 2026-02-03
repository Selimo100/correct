import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import StakeForm from '@/components/StakeForm'
import CommentSection, { CommentType } from '@/components/CommentSection'
import { formatToZurich } from '@/lib/date'
import type { Database } from '@/lib/database.types'

type Bet = Database['public']['Tables']['bets']['Row']

type BetStats = {
  total_pot: number
  for_stake: number
  against_stake: number
  participant_count: number
}

type BetEntry = Database['public']['Tables']['bet_entries']['Row']

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function BetDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const user = await getCurrentUser()
  
  // Fetch bet details - simplified query without joins first
  const { data: bet, error: betError } = await supabase
    .from('bets')
    .select('*')
    .eq('id', id)
    .single()
  
  if (betError || !bet) {
    console.error('Bet fetch error:', betError)
    notFound()
  }
  
  // Fetch creator separately
  const { data: creator } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', bet.creator_id)
    .single()
  
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
  
  // Fetch bet stats
  // @ts-expect-error - Supabase RPC typing issue
  const { data: stats } = await supabase.rpc('get_bet_stats', { p_bet_id: id })
  
  // Fetch user's current entry if logged in
  let userEntry: BetEntry | null = null
  let userBalance = 0
  
  if (user) {
    const { data: entry } = await supabase
      .from('bet_entries')
      .select('*')
      .eq('bet_id', id)
      .eq('user_id', user.id)
      .single()
    
    userEntry = entry as BetEntry | null
    
    // @ts-expect-error - Supabase RPC typing issue
    const { data: balance } = await supabase.rpc('get_balance', { p_user_id: user.id })
    userBalance = (balance as unknown as number) || 0
  }
  
  const betData = bet
  const statsData = (stats as unknown as BetStats) || { total_pot: 0, for_stake: 0, against_stake: 0, participant_count: 0 }
  
  const isLocked = new Date(betData.end_at) <= new Date() && betData.status === 'OPEN'
  const canStake = user && betData.status === 'OPEN' && !isLocked
  
  const totalPot = statsData.total_pot || 0
  const forStake = statsData.for_stake || 0
  const againstStake = statsData.against_stake || 0
  const forPercentage = totalPot > 0 ? Math.round((forStake / totalPot) * 100) : 50
  const againstPercentage = totalPot > 0 ? Math.round((againstStake / totalPot) * 100) : 50

  // Fetch comments
  const { data: rawComments } = await supabase
    .from('comments')
    .select('*, profiles(username, first_name, last_name)')
    .eq('bet_id', id)
    .eq('is_hidden', false)
    .order('created_at', { ascending: true })

  // Transform comments into nested structure
  const comments: CommentType[] = []
  const replyMap = new Map<string, any[]>()

  // 1. Collect replies by parent_id
  rawComments?.forEach((c: any) => {
    if (c.parent_id) {
       if (!replyMap.has(c.parent_id)) replyMap.set(c.parent_id, [])
       replyMap.get(c.parent_id)!.push(c)
    }
  })

  // 2. Build root list
  rawComments?.forEach((c: any) => {
    if (!c.parent_id) {
       const commentWithReplies = { 
         ...c, 
         replies: replyMap.get(c.id) || [] 
       }
       comments.push(commentWithReplies)
    }
  })

  // Sort comments: Newest last (chronological) usually for forums, or Newest first?
  // Chat usually Newest bottom. Comments usually Newest top or Chronological.
  // We ordered by created_at ASC in query, so Chronological (Oldest top).

  return (
    <div className="max-w-4xl mx-auto">
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

        {/* User's Current Position */}
        {userEntry && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="font-medium text-blue-900 mb-1">Your Current Position</div>
            <div className="text-blue-800">
              {userEntry.stake} Neos on <span className="font-semibold">{userEntry.side}</span>
            </div>
          </div>
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

      {/* Comment Section */}
      <CommentSection 
        comments={comments} 
        betId={id} 
        userStatus={user?.status || null} 
      />
    </div>
  )
}
