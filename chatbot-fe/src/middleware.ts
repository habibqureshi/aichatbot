import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSession } from './app/actions/session'

export async function middleware(request: NextRequest) {
    // return NextResponse.redirect(new URL('/dashboard', request.url))
    const path = request.nextUrl.pathname
    // const publicPaths = ['/auth/login', '/auth/register']
    // console.log('middleware called')
    // const isPublicPath = publicPaths.includes(path)

    // // Get token from request cookies
    // const session = await getSession()
    // const token = session?.token || null

    // // Redirect to login if accessing protected route without token
    // if (!isPublicPath && !token) {
    //     return NextResponse.redirect(new URL('/auth/login', request.url))
    // }

    // // Redirect to dashboard OR related to the user's role if accessing auth pages with valid token
    if (path === '/') {
        return NextResponse.redirect(new URL('/chat', request.url))
    }

    return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (e.g. robots.txt)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ]
} 