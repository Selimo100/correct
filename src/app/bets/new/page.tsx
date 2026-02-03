import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { inputDateToZurichIso } from '@/lib/date'
import type { Database } from '@/lib/database.types'

type BetInsert = Database['public']['Tables']['bets']['Insert']
type BetRow = Database['public']['Tables']['bets']['Row']

export default async function NewBetPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  // Fetch active categories
  const { data: categories } = await supabase.rpc('fn_list_categories', {
    p_include_inactive: false
  })

  async function createBet(formData: FormData) {
    'use server'
    
    // Auth check inside server action
    const user = await requireAuth()
    const supabase = await createClient()
    
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const categoryId = formData.get('category_id') as string
    const endAtRaw = formData.get('end_at') as string
    const maxParticipants = formData.get('max_participants') as string
    
    // Parse the local datetime string as 'Europe/Zurich' and convert to UTC ISO
    const endAt = inputDateToZurichIso(endAtRaw)
    
    const betData: any = { // Using any as the types might not reflect new column yet
      creator_id: user.id,
      title,
      description: description || null,
      category_id: categoryId || null,
      category: null,
      end_at: endAt, // This is now a UTC ISO string representing the Zurich time picked
      max_participants: maxParticipants ? parseInt(maxParticipants) : null,
    }
    
    const { data, error } = await supabase
      .from('bets')
      // @ts-expect-error - Supabase insert typing issue
      .insert(betData)
      .select()
      .single()
    
    if (error) {
      throw new Error(error.message)
    }
    
    const result = data as BetRow
    revalidatePath('/')
    redirect(`/bets/${result.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Create a New Bet</h1>
      
      <form action={createBet} className="space-y-6 bg-white p-8 rounded-lg shadow-sm border">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Statement / Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            minLength={3}
            maxLength={200}
            className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            placeholder="e.g., Bitcoin will reach $100k by end of 2026"
          />
          <p className="mt-1 text-sm text-gray-500">
            Make it clear and measurable
          </p>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description (optional)
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            placeholder="Add more context or clarifications..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              id="category_id"
              name="category_id"
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select a category...</option>
              {categories && (categories as any[]).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="max_participants" className="block text-sm font-medium text-gray-700 mb-2">
              Max Participants (optional)
            </label>
            <input
              type="number"
              id="max_participants"
              name="max_participants"
              min="2"
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              placeholder="Unlimited"
            />
          </div>
        </div>

        <div>
          <label htmlFor="end_at" className="block text-sm font-medium text-gray-700 mb-2">
            End Date & Time *
          </label>
          <input
            type="datetime-local"
            id="end_at"
            name="end_at"
            required
            min={new Date().toISOString().slice(0, 16)}
            className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
          />
          <p className="mt-1 text-sm text-gray-500">
            When should betting close? Must be in the future.
          </p>
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Create Bet
          </button>
          <a
            href="/"
            className="inline-block px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-center"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
