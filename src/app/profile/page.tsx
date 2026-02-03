import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const user = await requireAuth()

  async function updateProfile(formData: FormData) {
    'use server'
    
    const user = await requireAuth()
    const supabase = await createClient()
    
    const firstName = formData.get('first_name') as string
    const lastName = formData.get('last_name') as string
    
    const { error } = await supabase
      .from('profiles')
      // @ts-expect-error - Supabase update typing issue
      .update({
        first_name: firstName,
        last_name: lastName,
      })
      .eq('id', user.id)
    
    if (error) {
      throw new Error(error.message)
    }
    
    revalidatePath('/profile')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>

      <div className="bg-white rounded-lg shadow-sm border p-8 mb-6">
        <form action={updateProfile} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username (auto-generated)
            </label>
            <input
              type="text"
              id="username"
              value={user.username}
              disabled
              className="block w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 cursor-not-allowed"
            />
            <p className="mt-1 text-sm text-gray-500">
              Username format: FirstName LastInitial. (e.g., "Selina M.")
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                defaultValue={user.first_name}
                required
                className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                defaultValue={user.last_name}
                required
                className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Changing your name will automatically regenerate your username.
              If the new username is taken, a number will be appended (e.g., "Example E. 2").
            </p>
          </div>

          <button
            type="submit"
            className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Update Profile
          </button>
        </form>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
        <dl className="space-y-3">
          <div>
            <dt className="text-sm font-medium text-gray-500">Account Created</dt>
            <dd className="text-sm text-gray-900">{new Date(user.created_at).toLocaleDateString()}</dd>
          </div>
          {user.is_admin && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Admin Status</dt>
              <dd className="text-sm">
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                  {user.is_super_admin ? 'Super Admin' : 'Admin'}
                </span>
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  )
}
