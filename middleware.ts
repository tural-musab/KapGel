import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from 'lib/supabase/middleware'

// Define protected routes and their required roles
const PROTECTED_ROUTES: Record<string, string[]> = {
  '/admin': ['admin'],
  '/vendor': ['vendor_admin'],
  '/courier': ['courier'],
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/auth/callback',
  '/api/auth',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Create Supabase client
  const { supabase, response } = createClient(request)

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect to login if not authenticated
  if (!user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Get user role from database
  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!dbUser?.role) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Check role-based access
  for (const [route, allowedRoles] of Object.entries(PROTECTED_ROUTES)) {
    if (pathname.startsWith(route)) {
      if (!allowedRoles.includes(dbUser.role)) {
        // Redirect to appropriate dashboard based on role
        const roleDashboards: Record<string, string> = {
          'customer': '/',
          'vendor_admin': '/vendor',
          'courier': '/courier',
          'admin': '/admin',
        }
        
        const redirectPath = roleDashboards[dbUser.role] || '/'
        return NextResponse.redirect(new URL(redirectPath, request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
