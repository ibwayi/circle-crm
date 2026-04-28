/**
 * Next.js 16 Proxy (formerly Middleware).
 *
 * The `middleware.ts` convention was renamed to `proxy.ts` in Next 16.
 * Internal helpers in `lib/supabase/middleware.ts` keep the original name
 * to match Supabase SSR documentation and ergonomics.
 */
import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // Match everything except Next internals, image optimization,
    // and common static assets.
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
