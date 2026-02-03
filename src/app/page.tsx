import { createClient } from '@/lib/supabase/server'
import BetCard from '@/components/BetCard'
import Link from 'next/link'
import SearchFilters from '@/components/SearchFilters'
import { Globe, Users, UserCheck } from 'lucide-react'

// Type definition to satisfy BetCard props (which expects DB Row structure)
type Bet = any 

export const dynamic = 'force-dynamic'

export default async function HomePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const supabase = await createClient()
  
  // Parse params
  const q = typeof searchParams.q === 'string' ? searchParams.q : undefined
  const categoryId = typeof searchParams.category === 'string' && searchParams.category ? searchParams.category : undefined
  
  // Default status
  let status: string | undefined = typeof searchParams.status === 'string' ? searchParams.status : 'OPEN'
  if (status === 'ALL' || !status) status = undefined

  const sort = typeof searchParams.sort === 'string' ? searchParams.sort : 'newest'
  
  // Ensure feed is one of the valid values
  let feedVal = typeof searchParams.feed === 'string' ? searchParams.feed : 'PUBLIC'
  if (!['PUBLIC', 'FRIENDS', 'GROUPS'].includes(feedVal)) {
     feedVal = 'PUBLIC'
  }
  const feed = feedVal as 'PUBLIC' | 'FRIENDS' | 'GROUPS'

  // Fetch categories for filter
  const { data: categories } = await (supabase.rpc as any)('fn_list_categories', {
    p_include_inactive: false
  })

  // Fetch bets using search RPC V2
  const { data: searchResults, error } = await (supabase.rpc as any)('fn_search_bets_v2', {
    p_search_text: q,
    p_category_id: categoryId,
    p_status: status,
    p_sort_by: sort,
    p_limit: 50,
    p_audience_scope: feed
  })
  
  if (error) {
    console.error('RPC fn_search_bets_v2 failed', error)
  }

  // Map result to BetCard structure
  const bets: Bet[] = (searchResults || []).map((res: any) => ({
    ...res,
    // Ensure compatibility with BetCard expectations
    profiles: { 
       username: res.creator_username,
       avatar_url: res.creator_avatar_url 
    },
    // Add group info if present
    group: res.group_name ? { name: res.group_name, id: res.group_id } : undefined,
    stats: {
      total_pot: res.total_pot,
      participant_count: res.participant_count,
      for_stake: res.for_stake,
      against_stake: res.against_stake
    }
  }))

  // Helper to construct query string for tabs
  const getTabUrl = (tabName: string) => {
     const newParams = new URLSearchParams()
     // Copy existing params
     Object.entries(searchParams).forEach(([key, value]) => {
        if (key !== 'feed' && typeof value === 'string') {
           newParams.set(key, value)
        }
     })
     newParams.set('feed', tabName)
     return `/?${newParams.toString()}`
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Betting Feed</h1>
          <p className="mt-2 text-gray-600">Place bets on statements using Neos</p>
        </div>
        <Link
          href="/bets/new"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 whitespace-nowrap shadow-sm"
        >
          Create Bet
        </Link>
      </div>

      {/* FEED TABS */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
         <Link 
            href={getTabUrl('PUBLIC')}
            className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
               feed === 'PUBLIC' 
                 ? 'border-primary-600 text-primary-700 bg-primary-50/50' 
                 : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
         >
            <Globe className="w-4 h-4" />
            Public
         </Link>
         <Link 
            href={getTabUrl('FRIENDS')}
            className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
               feed === 'FRIENDS' 
                 ? 'border-blue-600 text-blue-700 bg-blue-50/50' 
                 : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
         >
            <UserCheck className="w-4 h-4" />
            Friends Updates
         </Link>
         <Link 
            href={getTabUrl('GROUPS')}
            className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
               feed === 'GROUPS' 
                 ? 'border-orange-600 text-orange-700 bg-orange-50/50' 
                 : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
         >
            <Users className="w-4 h-4" />
            My Groups
         </Link>
      </div>

      <SearchFilters categories={(categories as unknown as any[]) || []} />

      {!bets || bets.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-500 mb-2">
            {feed === 'FRIENDS' 
               ? "No active bets from your friends." 
               : feed === 'GROUPS' 
                 ? "No active bets in your groups." 
                 : "No bets matching your filters."}
          </p>
          
          {feed === 'FRIENDS' && (
             <div className="mt-4">
                <Link href="/friends" className="text-blue-600 font-medium hover:underline">
                   Manage Friends
                </Link>
             </div>
          )}
          
          {feed === 'GROUPS' && (
             <div className="mt-4">
                <Link href="/groups" className="text-orange-600 font-medium hover:underline">
                   Join or Create Groups
                </Link>
             </div>
          )}

          {(q || categoryId || status) && feed === 'PUBLIC' && (
             <Link href="/" className="text-primary-600 hover:underline mt-2 inline-block">
               Clear filters
             </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {bets.map((bet) => (
            <BetCard key={bet.id} bet={bet} />
          ))}
        </div>
      )}
    </div>
  )
}
