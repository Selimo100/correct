import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export default function SignUpPage() {
  async function signUp(formData: FormData) {
    'use server'

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const firstName = formData.get('first_name') as string
    const lastName = formData.get('last_name') as string
    const supabase = await createClient()

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      redirect('/auth/sign-up?error=' + encodeURIComponent(authError.message))
    }

    if (authData.user) {
      // Create profile with PENDING status (requires admin approval)
      const { error: profileError } = await supabase
        .from('profiles')
        // @ts-expect-error - Supabase insert typing issue
        .insert({
          id: authData.user.id,
          first_name: firstName,
          last_name: lastName,
          status: 'PENDING', // Explicitly set to PENDING
        })

      if (profileError) {
        redirect('/auth/sign-up?error=' + encodeURIComponent(profileError.message))
      }
    }

    revalidatePath('/', 'layout')
    // Redirect to approval page instead of home
    redirect('/approval')
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Sign Up</h1>
      
      <form action={signUp} className="space-y-6 bg-white p-8 rounded-lg shadow-sm border">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
              First Name *
            </label>
            <input
              type="text"
              id="first_name"
              name="first_name"
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
              required
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            Your username will be: <strong>FirstName LastInitial.</strong>
            <br />
            <span className="text-xs">Example: "Selina M."</span>
          </p>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            required
            minLength={6}
            className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
          />
          <p className="mt-1 text-sm text-gray-500">
            Minimum 6 characters
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800">
            <strong>🎉 Welcome Bonus:</strong> New users receive 100 Neos to get started!
          </p>
        </div>

        <button
          type="submit"
          className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          Sign Up
        </button>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <a href="/auth/sign-in" className="text-primary-600 hover:text-primary-700 font-medium">
            Sign In
          </a>
        </p>
      </form>
    </div>
  )
}
