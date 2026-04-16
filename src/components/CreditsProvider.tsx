"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

interface CreditsState {
  configured: boolean;
  creditsCents: number | null;
  tier: "free" | "premium" | "pro";
  status: string | null;
  periodEnd: string | null;
  refresh: () => Promise<void>;
}

const CreditsContext = createContext<CreditsState>({
  configured: false,
  creditsCents: null,
  tier: "free",
  status: null,
  periodEnd: null,
  refresh: async () => {},
});

export function useCredits() {
  return useContext(CreditsContext);
}

export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [state, setState] = useState<Omit<CreditsState, "refresh">>({
    configured: false,
    creditsCents: null,
    tier: "free",
    status: null,
    periodEnd: null,
  });

  const refresh = useCallback(async () => {
    try {
      const resp = await fetch("/api/billing/balance");
      if (!resp.ok) return;
      const data = await resp.json();
      setState({
        configured: !!data.configured,
        creditsCents: typeof data.creditsCents === "number" ? data.creditsCents : null,
        tier: data.tier ?? "free",
        status: data.status ?? null,
        periodEnd: data.periodEnd ?? null,
      });
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    refresh();
  }, [session?.user?.id, refresh]);

  return (
    <CreditsContext.Provider value={{ ...state, refresh }}>
      {children}
    </CreditsContext.Provider>
  );
}
