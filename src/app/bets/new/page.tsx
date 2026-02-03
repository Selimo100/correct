import { createClient } from '@/lib/supabase/server'
import CreateBetForm from '@/components/CreateBetForm'

export default async function NewBetPage() {
  const supabase = await createClient()

  // Fetch active categories (using normal select as safe fallback)
  let categories = []
  
  try {
     const { data } = await (supabase.rpc as any)('fn_list_categories', {
       p_include_inactive: false
     })
     categories = data || []
  } catch(e) {
     // Fallback if RPC missing
     const { data } = await supabase
       .from('categories')
       .select('id, name, icon')
       .eq('active', true)
       .order('name')
     categories = data || []
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
         <h1 className="text-3xl font-bold text-gray-900">Create a New Bet</h1>
         <p className="text-gray-500 mt-2">Start a new prediction market for your community.</p>
      </div>
      
      <CreateBetForm categories={categories} />
    </div>
  )
}
