/**
 * Next.js 16 Proxy (formerly Middleware).
 *
 * The `middleware.ts` convention was renamed to `proxy.ts` in Next 16.
 * Internal helpers in `lib/supabase/middleware.ts` keep the original name
 * to match Supabase SSR documentation and ergonomics.
 *
 * Responsibilities:
 *   1. Refresh the Supabase auth session on every request.
 *   2. Redirect unauthenticated users away from protected routes → /login.
 *   3. Redirect authenticated users away from auth-only routes → /dashboard.
 */
import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

// Routes anyone can hit while signed out.
const PUBLIC_PATHS = new Set(["/login", "/signup"])

// Routes that authenticated users should be redirected away from.
// `/` falls in here too — once signed in, the home path goes to the dashboard.
const AUTH_REDIRECT_PATHS = new Set(["/login", "/signup", "/"])

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const pathname = request.nextUrl.pathname

  // API routes manage their own auth (e.g. /api/cron/reset-demo verifies
  // CRON_SECRET in its header). The proxy still refreshes any session
  // cookies that might be present, but it doesn't redirect API requests
  // to /login — that would break programmatic clients.
  if (pathname.startsWith("/api/")) {
    return response
  }

  if (!user && !PUBLIC_PATHS.has(pathname)) {
    return redirectWithCookies(request, response, "/login")
  }

  if (user && AUTH_REDIRECT_PATHS.has(pathname)) {
    return redirectWithCookies(request, response, "/dashboard")
  }

  return response
}

// Redirects must carry over any Set-Cookie headers the session refresh
// produced, otherwise the browser keeps the stale auth cookies and the
// next request triggers another refresh.
function redirectWithCookies(
  request: NextRequest,
  sessionResponse: NextResponse,
  pathname: string
): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  url.search = ""
  const redirect = NextResponse.redirect(url)
  for (const cookie of sessionResponse.cookies.getAll()) {
    redirect.cookies.set(cookie)
  }
  return redirect
}

export const config = {
  matcher: [
    // Match everything except Next internals, image optimization,
    // and common static assets. API routes are matched here so that any
    // session cookies they carry get refreshed; the in-code check inside
    // `proxy()` skips the page-level redirect logic for `/api/`.
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
