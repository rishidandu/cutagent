"use client";

import { useCredits } from "@/components/CreditsProvider";

interface Props {
  onUpgradeClick: () => void;
}

/**
 * Credits badge for the header. Color-coded:
 * - Green: > 25% of tier quota
 * - Amber: 5-25%
 * - Red: < 5% or 0
 * Hidden when Stripe not configured.
 */
export default function CreditsBadge({ onUpgradeClick }: Props) {
  const { configured, creditsCents, tier } = useCredits();

  if (!configured || creditsCents === null) return null;

  const dollars = (creditsCents / 100).toFixed(2);

  // Tier quotas for percentage calc
  const quotas = { free: 100, premium: 1500, pro: 4500 };
  const quota = quotas[tier] || 100;
  const pct = (creditsCents / quota) * 100;

  const color =
    creditsCents <= 0 ? "border-red-500/50 bg-red-500/10 text-red-300"
    : pct < 25 ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";

  return (
    <button
      onClick={onUpgradeClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition hover:brightness-125 ${color}`}
      title={`${tier.toUpperCase()} plan — click to upgrade`}
    >
      <span className="mono-ui">${dollars}</span>
      <span className="text-[10px] uppercase tracking-wider opacity-70">{tier}</span>
    </button>
  );
}
