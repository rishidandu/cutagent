import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Route protection middleware.
 *
 * When auth is configured (AUTH_GOOGLE_ID present):
 * - /waitlist, /auth/*, /api/auth/*, static files → public
 * - Everything else → requires session, redirects to /auth/signin
 *
 * When auth is NOT configured (self-hosted mode):
 * - Pass-through no-op, zero overhead
 */
export async function middleware(req: NextRequest) {
  // Graceful degradation: if no Google OAuth configured, skip all auth
  if (!process.env.AUTH_GOOGLE_ID) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  // Public routes — no auth required
  if (
    pathname.startsWith("/waitlist") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/") ||    // API routes use requireAuth() internally
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check for session token cookie (NextAuth sets this)
  const sessionToken =
    req.cookies.get("__Secure-authjs.session-token")?.value ||
    req.cookies.get("authjs.session-token")?.value;

  if (!sessionToken) {
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
