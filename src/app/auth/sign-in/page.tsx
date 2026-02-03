import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export default function SignInPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const errorParam = typeof searchParams?.error === "string" ? searchParams?.error : undefined

  async function signIn(formData: FormData) {
    "use server"

    const email = (formData.get("email") as string) || ""
    const password = (formData.get("password") as string) || ""
    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      redirect("/auth/sign-in?error=Invalid%20credentials")
    }

    revalidatePath("/", "layout")
    redirect("/")
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
            Sign In
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Welcome back. Continue with your email and password.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-gray-200 bg-white shadow-soft overflow-hidden">
          <div className="p-6 sm:p-8">
            {errorParam && (
              <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="text-sm font-semibold text-amber-900">Sign in failed</div>
                <div className="text-sm text-amber-800">{errorParam}</div>
              </div>
            )}

            <form action={signIn} className="space-y-5">
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

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  className="block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
                />
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center rounded-2xl bg-primary-600 px-6 py-3.5 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-200"
              >
                Sign In
              </button>

              <div className="pt-2 text-center text-sm text-gray-600">
                Don't have an account?{" "}
                <a
                  href="/auth/sign-up"
                  className="font-semibold text-primary-700 hover:text-primary-800"
                >
                  Sign Up
                </a>
              </div>

            </form>
          </div>

          {/* Subtle footer */}
          <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 text-center">
            <p className="text-xs text-gray-500">
              By continuing, you agree to our{" "}
              <a className="font-semibold hover:text-primary-700" href="/terms">
                Terms
              </a>{" "}
              and{" "}
              <a className="font-semibold hover:text-primary-700" href="/privacy">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
