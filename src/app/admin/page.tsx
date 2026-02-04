import { requireAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import ModerationTable, { type AdminBet } from "@/components/ModerationTable"

export const dynamic = "force-dynamic"

export default async function AdminDashboard({ searchParams }: { searchParams: { status?: string, page?: string, search?: string } }) {
  await requireAdmin()
  const supabase = await createClient()

  // 1. Pending Resolutions (Locked bets)
  // We explicitly fetch bets that need resolution
  // @ts-expect-error - RPC args resolution issue
  const { data: pendingBetsData } = await supabase.rpc('fn_admin_list_bets', {
      p_limit: 50,
      p_offset: 0,
      p_status: 'LOCKED',
      p_search: null
  })
  
  const pendingBets = (pendingBetsData as unknown as AdminBet[]) || []

  // 2. Main Moderation List
  const status = searchParams.status || 'ALL'
  const search = searchParams.search || null
  const page = parseInt(searchParams.page || '1')
  const pageSize = 50
  const offset = (page - 1) * pageSize

  // @ts-expect-error - RPC args resolution issue
  const { data: allBetsData, error } = await supabase.rpc('fn_admin_list_bets', {
    p_limit: pageSize,
    p_offset: offset,
    p_status: status as any,
    p_search: search,
  })
  
  const allBets = (allBetsData as unknown as AdminBet[]) || []
  
  if (error) {
     console.error("Admin dashboard error:", error)
  }

  return (
      <div className="space-y-8">
        {/* Pending Resolutions Section */}
        {pendingBets && pendingBets.length > 0 && (
             <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                 <div className="flex items-center gap-2 mb-4">
                     <h2 className="text-xl font-bold text-amber-900">
                        Attention Required: Pending Resolutions
                     </h2>
                     <span className="bg-amber-200 text-amber-900 text-xs px-2 py-0.5 rounded-full font-bold">
                        {pendingBets.length}
                     </span>
                 </div>
                 <p className="text-amber-800 mb-6 text-sm">
                    These bets have passed their deadline and are waiting for an outcome decision.
                 </p>
                 <ModerationTable bets={pendingBets} showTabs={false} title="Pending Resolutions" />
             </div>
        )}

        {/* Main Interface */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
             <h2 className="text-xl font-bold text-gray-900 mb-2">Bet Moderation</h2>
             <p className="text-gray-500 mb-6 text-sm">Manage visibility and status of all bets on the platform.</p>
             <ModerationTable 
                bets={allBets || []} 
                page={page} 
                pageSize={pageSize} 
                showTabs={true}
             />
        </div>
      </div>
  )
}
