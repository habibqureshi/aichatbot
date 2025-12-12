import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Public paths that don't require authentication
  const publicPaths = ["/authentication", "/auth/login", "/auth/register"];
  const isPublicPath = publicPaths.includes(path);

  // Check if user has auth token in cookies
  const authToken = request.cookies.get("auth_session")?.value;
  const hasToken = !!authToken;

  // Redirect root to dashboard
  if (path === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If user has token and tries to access auth pages, redirect to dashboard
  if (hasToken && isPublicPath) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If user doesn't have token and tries to access protected route, redirect to authentication
  if (!hasToken && !isPublicPath) {
    return NextResponse.redirect(new URL("/authentication", request.url));
  }

  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - anything with a file extension (static assets)
     * - api (API routes)
     */
    "/((?!_next|.*\\..*|api).*)",
  ],
};
