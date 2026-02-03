import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
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
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  
  const path = request.nextUrl.pathname
  
  // Public paths that don't require auth
  const publicPaths = ['/auth/sign-in', '/auth/sign-up', '/about', '/privacy', '/terms']
  const isPublicPath = publicPaths.some(p => path.startsWith(p))
  
  // Auth callback path
  if (path.startsWith('/auth/callback')) {
    return response
  }
  
  // If not logged in and trying to access protected route
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/sign-in'
    return NextResponse.redirect(url)
  }
  
  // If logged in, check user status
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('status, is_admin, is_super_admin')
      .eq('id', user.id)
      .single()
    
    if (profile) {
      const userStatus = profile.status || 'PENDING'
      const isAdmin = profile.is_admin || profile.is_super_admin
      
      // Admin paths - only accessible to admins
      if (path.startsWith('/admin')) {
        if (!isAdmin) {
          const url = request.nextUrl.clone()
          url.pathname = '/'
          return NextResponse.redirect(url)
        }
        // Admins can access admin pages regardless of status
        return response
      }
      
      // Approval page - accessible to all authenticated users
      if (path === '/approval') {
        // If user is ACTIVE, redirect to home
        if (userStatus === 'ACTIVE') {
          const url = request.nextUrl.clone()
          url.pathname = '/'
          return NextResponse.redirect(url)
        }
        return response
      }
      
      // Auth pages - if already logged in, redirect based on status
      if (isPublicPath) {
        if (userStatus === 'ACTIVE') {
          const url = request.nextUrl.clone()
          url.pathname = '/'
          return NextResponse.redirect(url)
        } else {
          const url = request.nextUrl.clone()
          url.pathname = '/approval'
          return NextResponse.redirect(url)
        }
      }
      
      // For all other pages, check if user is ACTIVE
      if (userStatus !== 'ACTIVE') {
        // Allow profile page and sign-out for PENDING users
        if (path === '/profile' || path === '/auth/sign-out') {
          return response
        }
        // Redirect to approval page
        const url = request.nextUrl.clone()
        url.pathname = '/approval'
        return NextResponse.redirect(url)
      }
    }
  }
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
