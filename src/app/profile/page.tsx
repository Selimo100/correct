import { requireAuth } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

function formatDay(d: string) {
  return new Date(d).toLocaleDateString()
}

export default async function ProfilePage() {
  const user = await requireAuth()

  async function updateProfile(formData: FormData) {
    "use server"

    const user = await requireAuth()
    const supabase = await createClient()

    const firstName = (formData.get("first_name") as string) || ""
    const lastName = (formData.get("last_name") as string) || ""

    const { error } = await supabase
      .from("profiles")
      // @ts-expect-error - Supabase update typing issue
      .update({
        first_name: firstName,
        last_name: lastName,
      })
      .eq("id", user.id)

    if (error) throw new Error(error.message)

    revalidatePath("/profile")
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10 space-y-6">
      {/* Hero */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-soft">
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
            My Profile
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Update your name. Your username is generated automatically.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
              Profile settings
            </span>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              Secure
            </span>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-soft">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Personal Details</h2>
          <p className="mt-1 text-sm text-gray-600">These are used for display and your generated username.</p>
        </div>

        <div className="p-6 sm:p-8">
          <form action={updateProfile} className="space-y-6">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-gray-900 mb-2">
                Username (auto-generated)
              </label>
              <input
                type="text"
                id="username"
                value={user.username}
                disabled
                className="block w-full rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-700 cursor-not-allowed"
              />
              <p className="mt-2 text-xs text-gray-500">
                Format: FirstName + LastInitial (e.g., “Example E.”)
              </p>
            </div>

            {/* Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-semibold text-gray-900 mb-2">
                  First Name <span className="text-gray-400 font-semibold">*</span>
                </label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  defaultValue={user.first_name}
                  required
                  className="block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
                />
              </div>

              <div>
                <label htmlFor="last_name" className="block text-sm font-semibold text-gray-900 mb-2">
                  Last Name <span className="text-gray-400 font-semibold">*</span>
                </label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  defaultValue={user.last_name}
                  required
                  className="block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
                />
              </div>
            </div>

            {/* Notice */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-900">
                <span className="font-semibold">Note:</span> Changing your name regenerates your username. If the new
                username is taken, a number will be appended (e.g., “Example E. 2”).
              </p>
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center rounded-2xl bg-primary-600 px-6 py-3.5 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-200"
            >
              Update Profile
            </button>
          </form>
        </div>
      </div>

      {/* Account Info */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-soft overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Account Information</h2>
          <p className="mt-1 text-sm text-gray-600">Basic account metadata.</p>
        </div>

        <div className="p-6 sm:p-8">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">Account Created</dt>
              <dd className="mt-2 text-sm font-semibold text-gray-900">{formatDay(user.created_at)}</dd>
            </div>

            {user.is_admin && (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">Admin Status</dt>
                <dd className="mt-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                      user.is_super_admin
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-primary-50 text-primary-700 border-primary-200"
                    }`}
                  >
                    {user.is_super_admin ? "Super Admin" : "Admin"}
                  </span>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  )
}
