import { updateSession } from "@/lib/supabase/middleware"
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Clone + extend request headers (needed for server-side active tabs)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-pathname", request.nextUrl.pathname)
  requestHeaders.set("x-full-path", request.nextUrl.pathname + request.nextUrl.search)

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options })

          // keep custom headers
          response = NextResponse.next({
            request: { headers: requestHeaders },
          })

          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: "", ...options })

          // keep custom headers
          response = NextResponse.next({
            request: { headers: requestHeaders },
          })

          response.cookies.set({ name, value: "", ...options })
        },
      },
    }
  )

  // If updateSession is needed, keep it. (If it returns a response in your project, adapt accordingly.)
  try {
    await updateSession(request)
  } catch {
    // ignore
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Separate auth pages from truly public pages
  const authPages = ["/auth/sign-in", "/auth/sign-up"]
  const publicPages = ["/about", "/privacy", "/terms"]

  const isAuthPage = authPages.some((p) => path.startsWith(p))
  const isPublicPage = publicPages.some((p) => path.startsWith(p))
  const isPublicAccessible = isAuthPage || isPublicPage

  // Auth callback path
  if (path.startsWith("/auth/callback")) {
    return response
  }

  // Not logged in and trying to access protected route -> redirect to sign-in
  if (!user && !isPublicAccessible) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/sign-in"
    url.searchParams.set("next", path)
    return NextResponse.redirect(url)
  }

  // If logged in, check user status
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("status, is_admin, is_super_admin")
      .eq("id", user.id)
      .single()

    const userStatus = profile?.status || "PENDING"
    const isAdmin = !!(profile?.is_admin || profile?.is_super_admin)

    // Admin paths - only accessible to admins
    if (path.startsWith("/admin")) {
      if (!isAdmin) {
        const url = request.nextUrl.clone()
        url.pathname = "/"
        return NextResponse.redirect(url)
      }
      return response
    }

    // Approval page
    if (path === "/approval") {
      if (userStatus === "ACTIVE") {
        const url = request.nextUrl.clone()
        url.pathname = "/"
        return NextResponse.redirect(url)
      }
      return response
    }

    // If already logged in, block only the AUTH pages (sign-in / sign-up)
    // but DO NOT block /about /privacy /terms
    if (isAuthPage) {
      const url = request.nextUrl.clone()
      url.pathname = userStatus === "ACTIVE" ? "/" : "/approval"
      return NextResponse.redirect(url)
    }

    // Allow public info pages for everyone (also PENDING)
    if (isPublicPage) {
      return response
    }

    // For all other pages, require ACTIVE
    if (userStatus !== "ACTIVE") {
      // Allow profile and sign-out for PENDING users
      if (path === "/profile" || path === "/auth/sign-out") {
        return response
      }
      const url = request.nextUrl.clone()
      url.pathname = "/approval"
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
