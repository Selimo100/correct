import { createClient } from '@/lib/supabase/server'
import BetCard from '@/components/BetCard'
import Link from 'next/link'
import SearchFilters from '@/components/SearchFilters'
import { Database } from '@/lib/database.types'

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
  
  // Default status to 'OPEN' if not provided.
  // We use 'ALL' as the special value to mean "no filter" (which maps to undefined/null for the RPC)
  let status: string | undefined = typeof searchParams.status === 'string' ? searchParams.status : 'OPEN'
  
  // If user selected 'ALL', we want to pass undefined to the RPC to get all statuses
  if (status === 'ALL') {
    status = undefined
  } else if (!status) {
    // If empty string (sometimes happens depending on how filters update), decide behavior.
    // Assuming empty string means "Clear filter" -> "ALL"? Or "Default"?
    // SearchFilters component currently sends '' for All. So '' -> undefined (pass to RPC)
    status = undefined
  }

  const sort = typeof searchParams.sort === 'string' ? searchParams.sort : 'newest'

  // Fetch categories for filter
  // @ts-expect-error - RPC typing issue
  const { data: categories } = await supabase.rpc('fn_list_categories', {
    p_include_inactive: false
  })

  // Fetch bets using search RPC
  // @ts-expect-error - RPC typing issue
  const { data: searchResults, error } = await supabase.rpc('fn_search_bets', {
    p_search_text: q,
    p_category_id: categoryId,
    p_status: status,
    p_sort_by: sort,
    p_limit: 50 // Increased limit for now
  })
  
  // FALLBACK: If RPC fails, use standard query
  let betsData = searchResults || [];

  if (error || !searchResults) {
    console.warn('RPC fn_search_bets failed, falling back to standard list', error)
    
    // Fallback: Just get latest 20 OPEN bets
    const { data: fallbackBets } = await supabase
      .from('bets')
      .select(`
        *,
        creator:users!poster_id(username, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(20);
      
      betsData = fallbackBets || [];
  }

  // Map result to BetCard structure
  const bets: Bet[] = betsData.map((res: any) => ({
    ...res,
    // Ensure compatibility with BetCard expectations
    profiles: { username: res.creator_username },
    stats: {
      total_pot: res.total_pot,
      participant_count: res.participant_count,
      for_stake: res.for_stake,
      against_stake: res.against_stake
    }
  }))

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Betting Feed</h1>
          <p className="mt-2 text-gray-600">Place bets on statements using Neos</p>
        </div>
        <Link
          href="/bets/new"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 whitespace-nowrap"
        >
          Create Bet
        </Link>
      </div>

      <SearchFilters categories={(categories as unknown as any[]) || []} />

      {!bets || bets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No bets matching your filters.</p>
          {q || categoryId || status ? (
             <Link href="/" className="text-primary-600 hover:underline mt-2 inline-block">
               Clear filters
             </Link>
          ) : (
            <Link
              href="/bets/new"
              className="inline-block mt-4 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
            >
              Create Your First Bet
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
