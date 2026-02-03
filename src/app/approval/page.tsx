import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ApprovalPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth/sign-in')
  }
  
  // If user is active, redirect to home
  if (user.status === 'ACTIVE') {
    redirect('/')
  }
  
  // If user is banned, show banned message
  if (user.status === 'BANNED') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-red-900 mb-4">
            Account Banned
          </h1>
          <p className="text-red-700 mb-6">
            Your account has been banned from Correct?. If you believe this is an error,
            please contact support.
          </p>
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
    )
  }
  
  // User is PENDING
  const isAdmin = user.is_admin || user.is_super_admin

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md w-full bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">⏳</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Waiting for Approval
        </h1>
        <p className="text-gray-700 mb-6">
          Your account is pending admin approval. You'll be able to access Correct? 
          once an administrator reviews and approves your account.
        </p>

        {isAdmin && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
            <h3 className="font-semibold text-blue-900 mb-2">Admin Access</h3>
            <p className="text-blue-700 text-sm mb-3">
              You are recognized as an administrator, but your detailed profile status is pending.
              You can bypass this screen to manage the platform.
            </p>
            <Link 
              href="/admin/users"
              className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go to Admin Dashboard
            </Link>
          </div>
        )}

        <div className="bg-white border border-yellow-300 rounded-lg p-4 mb-6 text-left">
          <h2 className="font-semibold text-gray-900 mb-2">Account Details</h2>
          <div className="space-y-1 text-sm text-gray-600">
            <div><span className="font-medium">Email:</span> {user.id}</div>
            <div><span className="font-medium">Name:</span> {user.first_name} {user.last_name}</div>
            <div><span className="font-medium">Username:</span> {user.username}</div>
            <div><span className="font-medium">Status:</span> <span className="text-yellow-700 font-medium">Pending</span></div>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          This typically takes a few hours. Please check back later or contact an administrator
          if you've been waiting for an extended period.
        </p>
        <div className="flex space-x-4">
          <Link
            href="/profile"
            className="flex-1 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
          >
            Edit Profile
          </Link>
          <form action="/auth/sign-out" method="post" className="flex-1">
            <button
              type="submit"
              className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
