"use client";

import { useState } from "react";
import { useCredits } from "@/components/CreditsProvider";

interface Props {
  open: boolean;
  onClose: () => void;
  reason?: "out_of_credits" | "manual";
}

const TIERS = [
  {
    id: "free" as const,
    name: "Free",
    price: "$0",
    credits: "$1",
    features: [
      "$1 of AI generation credits",
      "All 8 video models",
      "Hook Lab + Avatar scenes",
      "Export with captions",
    ],
  },
  {
    id: "premium" as const,
    name: "Premium",
    price: "$20",
    credits: "$15",
    features: [
      "$15 of credits monthly",
      "All Free features",
      "Priority generation queue",
      "Save unlimited projects",
    ],
    highlight: true,
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "$50",
    credits: "$45",
    features: [
      "$45 of credits monthly",
      "All Premium features",
      "Early access to new models",
      "Dedicated support",
    ],
  },
];

export default function UpgradeModal({ open, onClose, reason }: Props) {
  const { tier: currentTier, configured } = useCredits();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleUpgrade = async (tier: "premium" | "pro") => {
    setLoading(tier);
    setError(null);
    try {
      const resp = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await resp.json();
      if (resp.ok && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Checkout failed");
        setLoading(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setLoading(null);
    }
  };

  const handleManage = async () => {
    setLoading("portal");
    try {
      const resp = await fetch("/api/billing/portal", { method: "POST" });
      const data = await resp.json();
      if (resp.ok && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Portal failed");
        setLoading(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl rounded-3xl border border-zinc-700 bg-zinc-900 p-8 shadow-2xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">
              {reason === "out_of_credits" ? "You're out of credits" : "Upgrade your plan"}
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              {reason === "out_of_credits"
                ? "Upgrade to continue generating videos."
                : "Get more credits and unlock premium features."}
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl">&times;</button>
        </div>

        {!configured && (
          <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Billing is disabled in this deployment. No credit limits are enforced.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {TIERS.map((t) => {
            const isCurrent = t.id === currentTier;
            const isFree = t.id === "free";
            return (
              <div
                key={t.id}
                className={`rounded-2xl border p-5 ${
                  t.highlight
                    ? "border-cyan-500/40 bg-cyan-500/[0.04] shadow-[0_0_40px_rgba(83,212,255,0.1)]"
                    : "border-zinc-700 bg-zinc-800/50"
                } ${isCurrent ? "ring-2 ring-emerald-500/40" : ""}`}
              >
                <div className="flex items-baseline justify-between mb-1">
                  <h3 className="text-lg font-bold text-white">{t.name}</h3>
                  {isCurrent && (
                    <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-400">
                      Current
                    </span>
                  )}
                </div>
                <div className="mb-1">
                  <span className="text-3xl font-bold text-white">{t.price}</span>
                  {!isFree && <span className="text-sm text-zinc-500">/month</span>}
                </div>
                <p className="text-xs text-zinc-400 mb-4">{t.credits} of AI credits</p>

                <ul className="space-y-2 mb-5">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-zinc-300">
                      <span className="text-emerald-400 mt-0.5">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {isFree ? (
                  <button
                    disabled
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-xs font-medium text-zinc-500"
                  >
                    {isCurrent ? "Current plan" : "Default"}
                  </button>
                ) : isCurrent ? (
                  <button
                    onClick={handleManage}
                    disabled={loading !== null}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 px-4 py-2.5 text-xs font-medium text-zinc-300 transition"
                  >
                    {loading === "portal" ? "Loading..." : "Manage billing"}
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(t.id)}
                    disabled={loading !== null || !configured}
                    className={`w-full rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                      t.highlight
                        ? "bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-[0_8px_24px_rgba(83,212,255,0.2)]"
                        : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {loading === t.id ? "Redirecting..." : `Upgrade to ${t.name}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[11px] text-zinc-600">
          Secure payments by Stripe. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
