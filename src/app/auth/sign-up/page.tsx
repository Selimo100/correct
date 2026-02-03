import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export default function SignUpPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const errorParam = typeof searchParams?.error === "string" ? searchParams?.error : undefined

  async function signUp(formData: FormData) {
    "use server"

    const email = (formData.get("email") as string) || ""
    const password = (formData.get("password") as string) || ""
    const firstName = (formData.get("first_name") as string) || ""
    const lastName = (formData.get("last_name") as string) || ""

    const supabase = await createClient()

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      redirect("/auth/sign-up?error=" + encodeURIComponent(authError.message))
    }

    if (authData.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        // @ts-expect-error - Supabase insert typing issue
        .insert({
          id: authData.user.id,
          first_name: firstName,
          last_name: lastName,
          status: "PENDING",
        })

      if (profileError) {
        redirect("/auth/sign-up?error=" + encodeURIComponent(profileError.message))
      }
    }

    revalidatePath("/", "layout")
    redirect("/approval")
  }

  return (
    <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center rounded-full bg-primary-50 px-4 py-2 text-xs font-semibold text-primary-700 border border-primary-100">
            Correct?
          </div>
          <h1 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
            Sign Up
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Create your account. You will be approved by an admin before you can access the feed.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-gray-200 bg-white shadow-soft overflow-hidden">
          <div className="p-6 sm:p-8">
            {errorParam && (
              <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="text-sm font-semibold text-amber-900">Sign up failed</div>
                <div className="text-sm text-amber-800">{errorParam}</div>
              </div>
            )}

            <form action={signUp} className="space-y-5">
              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-semibold text-gray-900 mb-2">
                    First Name <span className="text-gray-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    required
                    placeholder="Jane"
                    className="block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
                  />
                </div>

                <div>
                  <label htmlFor="last_name" className="block text-sm font-semibold text-gray-900 mb-2">
                    Last Name <span className="text-gray-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    required
                    placeholder="Example"
                    className="block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
                  />
                </div>
              </div>

              {/* Username hint */}
              <div className="rounded-2xl border border-primary-200 bg-primary-50 p-4">
                <p className="text-sm text-primary-900">
                  <span className="font-semibold">Username format:</span> FirstName + LastInitial.
                  <br />
                  <span className="text-xs text-primary-700">Example: “Example E.”</span>
                </p>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  placeholder="you@example.com"
                  className="block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
                />
                <p className="mt-2 text-xs font-semibold text-gray-500">Minimum 6 characters</p>
              </div>

              {/* Welcome bonus */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm text-emerald-900">
                  <span className="font-semibold">Welcome Bonus:</span> New users receive 100 Neos to get started.
                </p>
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center rounded-2xl bg-primary-600 px-6 py-3.5 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-200"
              >
                Sign Up
              </button>

              <div className="pt-2 text-center text-sm text-gray-600">
                Already have an account?{" "}
                <a
                  href="/auth/sign-in"
                  className="font-semibold text-primary-700 hover:text-primary-800"
                >
                  Sign In
                </a>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 text-center">
            <p className="text-xs text-gray-500">
              After signup your account is{" "}
              <span className="font-semibold text-gray-700">pending approval</span>. You will be redirected to the approval page.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
