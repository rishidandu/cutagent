import { MODEL_CATALOG, AVATAR_MODEL_CATALOG, type Scene } from "@/types";
import { getServiceSupabase } from "@/lib/supabase";
import { TIERS, type Tier } from "@/lib/stripe";

/**
 * Server-side credit operations.
 * All use service-role Supabase client (bypasses RLS).
 */

export interface BalanceInfo {
  creditsCents: number;
  tier: Tier;
  status: string | null;
  periodEnd: string | null;
}

/**
 * Fetch the current user's credit balance and subscription info.
 */
export async function getBalance(userId: string): Promise<BalanceInfo | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("credits_cents, subscription_tier, subscription_status, period_end")
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  return {
    creditsCents: data.credits_cents ?? 0,
    tier: (data.subscription_tier ?? "free") as Tier,
    status: data.subscription_status ?? null,
    periodEnd: data.period_end ?? null,
  };
}

/**
 * Atomically deduct credits. Returns { ok: true, newBalance } on success,
 * { ok: false, reason: "insufficient" } if user doesn't have enough.
 */
export async function deductCredits(
  userId: string,
  cents: number,
  ctx: { generationId?: string; reason: string },
): Promise<{ ok: boolean; newBalance?: number; reason?: string }> {
  if (cents <= 0) return { ok: true, newBalance: 0 };

  const supabase = getServiceSupabase();

  // Atomic deduction via RPC — returns new balance or NULL if insufficient
  const { data, error } = await supabase.rpc("deduct_credits", {
    p_user: userId,
    p_cents: cents,
  });

  if (error) return { ok: false, reason: error.message };
  if (data === null || data === undefined) return { ok: false, reason: "insufficient" };

  const newBalance = data as number;

  // Log transaction (best effort)
  await supabase.from("credit_transactions").insert({
    user_id: userId,
    delta_cents: -cents,
    balance_after_cents: newBalance,
    reason: ctx.reason,
    generation_id: ctx.generationId ?? null,
  });

  return { ok: true, newBalance };
}

/**
 * Add credits to user balance. Idempotent via stripeEventId.
 */
export async function addCredits(
  userId: string,
  cents: number,
  ctx: { reason: string; stripeEventId?: string },
): Promise<{ ok: boolean; newBalance: number }> {
  const supabase = getServiceSupabase();

  // Idempotency check
  if (ctx.stripeEventId) {
    const { data: existing } = await supabase
      .from("credit_transactions")
      .select("id, balance_after_cents")
      .eq("stripe_event_id", ctx.stripeEventId)
      .maybeSingle();
    if (existing) {
      return { ok: true, newBalance: existing.balance_after_cents };
    }
  }

  // Read current + update
  const { data: user } = await supabase
    .from("users")
    .select("credits_cents")
    .eq("id", userId)
    .single();

  const current = user?.credits_cents ?? 0;
  const newBalance = current + cents;

  await supabase.from("users").update({ credits_cents: newBalance }).eq("id", userId);
  await supabase.from("credit_transactions").insert({
    user_id: userId,
    delta_cents: cents,
    balance_after_cents: newBalance,
    reason: ctx.reason,
    stripe_event_id: ctx.stripeEventId ?? null,
  });

  return { ok: true, newBalance };
}

/**
 * Reset credits to a tier's monthly quota (used on invoice.paid).
 * Not additive — overwrites the balance to tier.creditsCents.
 */
export async function resetCreditsToTier(
  userId: string,
  tier: Tier,
  stripeEventId: string,
): Promise<void> {
  const supabase = getServiceSupabase();

  // Idempotency check
  const { data: existing } = await supabase
    .from("credit_transactions")
    .select("id")
    .eq("stripe_event_id", stripeEventId)
    .maybeSingle();
  if (existing) return;

  const newBalance = TIERS[tier].creditsCents;

  // Get old balance for logging
  const { data: user } = await supabase
    .from("users")
    .select("credits_cents")
    .eq("id", userId)
    .single();
  const oldBalance = user?.credits_cents ?? 0;
  const delta = newBalance - oldBalance;

  await supabase.from("users")
    .update({ credits_cents: newBalance, subscription_tier: tier })
    .eq("id", userId);

  await supabase.from("credit_transactions").insert({
    user_id: userId,
    delta_cents: delta,
    balance_after_cents: newBalance,
    reason: "subscription_refill",
    stripe_event_id: stripeEventId,
  });
}

/**
 * Estimate the cost of a scene in cents (mirrors cost-tracker math).
 * Uses Math.ceil so we never under-charge.
 */
export function estimateSceneCostCents(scene: Scene): number {
  const model = MODEL_CATALOG.find((m) => m.id === scene.modelId)
    ?? AVATAR_MODEL_CATALOG.find((m) => m.id === scene.modelId);
  if (!model) return 0;
  return Math.ceil(model.costPerSec * scene.duration * 100);
}
