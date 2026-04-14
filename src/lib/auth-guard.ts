import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Require authentication for an API route.
 *
 * Returns null if:
 * - Auth is not configured (self-hosted mode — all requests allowed)
 * - User is signed in (session valid)
 *
 * Returns a 401 NextResponse if auth is configured but user is not signed in.
 *
 * Usage in API routes:
 *   const denied = await requireAuth();
 *   if (denied) return denied;
 */
export async function requireAuth(): Promise<NextResponse | null> {
  // Auth not configured — allow all (self-hosted mode)
  if (!process.env.AUTH_GOOGLE_ID) return null;

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * Get the current user ID from the session.
 * Returns null if not signed in or auth not configured.
 */
export async function getCurrentUserId(): Promise<string | null> {
  if (!process.env.AUTH_GOOGLE_ID) return null;
  const session = await auth();
  return session?.user?.id ?? null;
}
