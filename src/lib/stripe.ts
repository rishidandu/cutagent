import Stripe from "stripe";

/**
 * Stripe client + tier configuration.
 *
 * Gracefully degrades when env vars missing:
 * - isStripeConfigured() returns false
 * - Billing routes return { configured: false }
 * - Client skips credit checks entirely
 */

let client: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    process.env.STRIPE_PRICE_PREMIUM &&
    process.env.STRIPE_PRICE_PRO
  );
}

export function getStripe(): Stripe {
  if (client) return client;
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe not configured: STRIPE_SECRET_KEY missing");
  }
  client = new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

// ── Tier configuration ──

export const TIERS = {
  free: {
    id: "free" as const,
    label: "Free",
    creditsCents: 100,   // $1.00
    priceCents: 0,
  },
  premium: {
    id: "premium" as const,
    label: "Premium",
    creditsCents: 1500,  // $15.00
    priceCents: 2000,    // $20.00/mo
  },
  pro: {
    id: "pro" as const,
    label: "Pro",
    creditsCents: 4500,  // $45.00
    priceCents: 5000,    // $50.00/mo
  },
} as const;

export type Tier = keyof typeof TIERS;
export type PaidTier = Exclude<Tier, "free">;

export function tierFromPriceId(priceId: string): Tier | null {
  if (priceId === process.env.STRIPE_PRICE_PREMIUM) return "premium";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  return null;
}

export function priceIdForTier(tier: PaidTier): string {
  if (tier === "premium") return process.env.STRIPE_PRICE_PREMIUM!;
  if (tier === "pro") return process.env.STRIPE_PRICE_PRO!;
  throw new Error(`No price ID for tier: ${tier}`);
}

/**
 * Lazy-create a Stripe customer for the user if one doesn't exist.
 * Called when user opens Checkout for the first time.
 */
export async function ensureStripeCustomer(
  userId: string,
  email: string,
  name: string | null,
  existingCustomerId: string | null,
): Promise<string> {
  if (existingCustomerId) return existingCustomerId;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    name: name ?? undefined,
    metadata: { userId },
  });
  return customer.id;
}
