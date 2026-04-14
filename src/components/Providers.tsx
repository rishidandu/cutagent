"use client";

import { SessionProvider } from "next-auth/react";

/**
 * Client-side providers wrapper.
 * Always includes SessionProvider so useSession() works everywhere.
 * When auth is not configured, SessionProvider fetches /api/auth/session
 * which returns an empty session — harmless.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      {children}
    </SessionProvider>
  );
}
