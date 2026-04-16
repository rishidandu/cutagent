"use client";

import { SessionProvider } from "next-auth/react";
import { CreditsProvider } from "@/components/CreditsProvider";

/**
 * Client-side providers wrapper.
 * SessionProvider: auth context
 * CreditsProvider: billing credits + tier (graceful degrades when Stripe not configured)
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      <CreditsProvider>{children}</CreditsProvider>
    </SessionProvider>
  );
}
