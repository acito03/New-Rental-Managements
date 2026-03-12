import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // Admin-only routes
    const adminRoutes = ['/users', '/brands']
    const superAdminRoutes = ['/users']

    if (superAdminRoutes.some((r) => pathname.startsWith(r))) {
      if (token?.role !== 'SUPER_ADMIN' && token?.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    if (adminRoutes.some((r) => pathname.startsWith(r))) {
      if (token?.role === 'USER') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/inventory/:path*',
    '/transactions/:path*',
    '/requests/:path*',
    '/users/:path*',
    '/brands/:path*',
  ],
}
