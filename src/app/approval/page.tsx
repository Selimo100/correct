import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function ApprovalPage() {
  const user = await getCurrentUser()

  if (!user) redirect("/auth/sign-in")
  if (user.status === "ACTIVE") redirect("/")

  const isAdmin = user.is_admin || user.is_super_admin

  // BANNED STATE
  if (user.status === "BANNED") {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="rounded-3xl border border-red-200 bg-white shadow-soft overflow-hidden">
            <div className="p-6 sm:p-8">
              <div className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                Account status
              </div>

              <div className="mt-5 flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 border border-red-200 text-2xl">
                  🚫
                </div>
                <div className="flex-1">
                  <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900">
                    Account banned
                  </h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Your account has been banned from{" "}
                    <span className="font-semibold text-gray-900">Correct?</span>. If you believe this is a mistake,
                    please contact support.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-800">
                  <span className="font-semibold">Access:</span> Disabled
                </p>
              </div>

              <form action="/auth/sign-out" method="post" className="mt-6">
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center rounded-2xl bg-red-600 px-6 py-3.5 text-sm font-semibold text-white shadow-soft transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-200"
                >
                  Sign Out
                </button>
              </form>
            </div>

            <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 text-center">
              <a href="/privacy" className="text-xs font-semibold text-gray-500 hover:text-red-700">
                Privacy
              </a>
              <span className="mx-2 text-xs text-gray-300">•</span>
              <a href="/terms" className="text-xs font-semibold text-gray-500 hover:text-red-700">
                Terms
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // PENDING STATE
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        {/* Top badge + title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center rounded-full bg-primary-50 px-4 py-2 text-xs font-semibold text-primary-700 border border-primary-100">
            Correct?
          </div>
          <h1 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
            Waiting for approval
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Your account is pending admin review. Once approved, you will get full access.
          </p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white shadow-soft overflow-hidden">
          <div className="p-6 sm:p-8 space-y-6">
            {/* Status row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Account Status</div>
                  <div className="mt-1 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                    Pending approval
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    This usually takes a few hours. If it takes longer, contact an administrator.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 sm:justify-end">
                <Link
                  href="/profile"
                  className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-primary-50 hover:text-primary-700"
                >
                  Edit Profile
                </Link>
                <form action="/auth/sign-out" method="post">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-2xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-200"
                  >
                    Sign Out
                  </button>
                </form>
              </div>
            </div>

            {/* Admin callout */}
            {isAdmin && (
              <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-blue-900">Admin Access</div>
                    <p className="mt-1 text-sm text-blue-800">
                      You are recognized as an admin. You can bypass this screen and manage the platform.
                    </p>
                  </div>
                  <Link
                    href="/admin/users"
                    className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
                  >
                    Go to Admin
                  </Link>
                </div>
              </div>
            )}

            {/* Account details */}
            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-sm font-semibold text-gray-900">Account Details</h2>
                <span className="inline-flex items-center rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                  Secure
                </span>
              </div>

              <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">User ID</dt>
                  <dd className="mt-2 text-sm font-semibold text-gray-900 break-all">{user.id}</dd>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">Name</dt>
                  <dd className="mt-2 text-sm font-semibold text-gray-900">
                    {user.first_name} {user.last_name}
                  </dd>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">Username</dt>
                  <dd className="mt-2 text-sm font-semibold text-gray-900">{user.username}</dd>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">Status</dt>
                  <dd className="mt-2">
                    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                      Pending
                    </span>
                  </dd>
                </div>
              </dl>
            </div>

            {/* Steps */}
            <div className="rounded-3xl border border-primary-100 bg-primary-50 p-6">
              <h3 className="text-sm font-semibold text-primary-900">What happens next?</h3>
              <ol className="mt-3 space-y-2 text-sm text-primary-800">
                <li className="flex gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white border border-primary-200 text-xs font-bold text-primary-700">
                    1
                  </span>
                  An admin reviews your account.
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white border border-primary-200 text-xs font-bold text-primary-700">
                    2
                  </span>
                  Once approved, you will be able to access the feed and create bets.
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white border border-primary-200 text-xs font-bold text-primary-700">
                    3
                  </span>
                  If your name changes, your username updates automatically.
                </li>
              </ol>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 text-center">
            <p className="text-xs text-gray-500">
              Need help? Contact an admin or review{" "}
              <a href="/terms" className="font-semibold hover:text-primary-700">
                Terms
              </a>{" "}
              and{" "}
              <a href="/privacy" className="font-semibold hover:text-primary-700">
                Privacy
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
