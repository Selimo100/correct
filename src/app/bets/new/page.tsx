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
  // @ts-expect-error - RPC typing issue
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
    const visibility = (formData.get('visibility') as string) || 'PUBLIC'
    const inviteCodeEnabled = formData.get('invite_code_enabled') === 'on'
    const hideParticipants = formData.get('hide_participants') === 'on'
    
    // Parse the local datetime string as 'Europe/Zurich' and convert to UTC ISO
    const endAt = inputDateToZurichIso(endAtRaw)
    
    const { data, error } = await supabase.rpc('fn_create_bet', {
      p_title: title,
      p_description: description || null,
      p_category_id: categoryId || null,
      p_end_at: endAt,
      p_max_participants: maxParticipants ? parseInt(maxParticipants) : null,
      p_visibility: visibility,
      p_invite_code_enabled: inviteCodeEnabled,
      p_hide_participants: hideParticipants
    })
    
    if (error) {
      throw new Error(error.message)
    }

    const { id, invite_code } = data as { id: string, invite_code: string | null }
    
    revalidatePath('/')
    
    // If private and has code, pass it to the URL so UI can show it
    if (visibility === 'PRIVATE' && invite_code) {
      // Encode code just in case, though it's alphanumeric
      redirect(`/bets/${id}?new=true&code=${invite_code}`)
    } else {
      redirect(`/bets/${id}`)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Create a New Bet</h1>
      
      <form action={createBet} className="space-y-6 bg-white p-8 rounded-lg shadow-sm border">
        {/* Visibility Setting */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
          <h3 className="font-medium text-gray-900">Visibility & Privacy</h3>
          
          <div className="flex flex-col space-y-2">
            <label className="inline-flex items-center">
              <input type="radio" name="visibility" value="PUBLIC" defaultChecked className="text-primary-600 focus:ring-primary-500" />
              <span className="ml-2">Public</span>
              <span className="ml-2 text-sm text-gray-500">- Visible to everyone, anyone can join</span>
            </label>
            <label className="inline-flex items-center">
              <input type="radio" name="visibility" value="PRIVATE" className="text-primary-600 focus:ring-primary-500" />
              <span className="ml-2">Private</span>
              <span className="ml-2 text-sm text-gray-500">- Hidden from feed, requires invite</span>
            </label>
          </div>

          <div className="pl-6 border-l-2 border-gray-200 ml-1">
             <label className="inline-flex items-center">
              <input type="checkbox" name="invite_code_enabled" defaultChecked className="rounded text-primary-600 focus:ring-primary-500" />
              <span className="ml-2 text-sm font-medium text-gray-700">Enable Invite Code</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Generates a code you can share to allow users to join.
            </p>
          </div>

          <div className="pt-2 border-t border-gray-200">
             <label className="inline-flex items-center">
              <input type="checkbox" name="hide_participants" className="rounded text-primary-600 focus:ring-primary-500" />
              <span className="ml-2 font-medium text-gray-700">Hide Participant Names (Anonymous)</span>
            </label>
            <p className="text-sm text-gray-500 mt-1 pl-6">
              If enabled, only totals are shown. Usernames are hidden from the public list.
            </p>
          </div>
        </div>

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
