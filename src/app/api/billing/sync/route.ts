import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth-guard";
import { isStripeConfigured, getStripe, tierFromPriceId } from "@/lib/stripe";
import { getServiceSupabase } from "@/lib/supabase";
import { resetCreditsToTier } from "@/lib/credits";
import { auth } from "@/lib/auth";

/**
 * POST /api/billing/sync
 *
 * Manual subscription sync — useful when the webhook hasn't fired
 * (e.g. during local dev without Stripe CLI). Pulls the user's
 * active subscription from Stripe and updates Supabase.
 */
export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await auth();
  const userEmail = session?.user?.email;

  const supabase = getServiceSupabase();
  const { data: user } = await supabase
    .from("users")
    .select("stripe_customer_id, subscription_tier, credits_cents")
    .eq("id", userId)
    .single();

  const stripe = getStripe();

  // Find customer — use existing ID or search by email
  let customerId = user?.stripe_customer_id;
  if (!customerId && userEmail) {
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      await supabase.from("users").update({ stripe_customer_id: customerId }).eq("id", userId);
    }
  }

  if (!customerId) {
    return NextResponse.json({ error: "No Stripe customer found for this user" }, { status: 404 });
  }

  // Find active subscription
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 1,
  });

  if (subs.data.length === 0) {
    return NextResponse.json({
      synced: false,
      message: "No active subscription found on this Stripe customer",
      customerId,
    });
  }

  const sub = subs.data[0];
  const priceId = sub.items.data[0]?.price.id;
  const tier = priceId ? tierFromPriceId(priceId) : null;

  if (!tier || tier === "free") {
    return NextResponse.json({
      synced: false,
      message: `Unknown price ID: ${priceId}`,
    });
  }

  // Extract period_end — newer Stripe API exposes it on subscription.items[0], older on top level
  const item = sub.items.data[0] as unknown as { current_period_end?: number };
  const subAny = sub as unknown as { current_period_end?: number };
  const periodEndSec = item?.current_period_end ?? subAny?.current_period_end;
  const periodEnd = periodEndSec ? new Date(periodEndSec * 1000).toISOString() : null;

  // Update user record
  await supabase.from("users").update({
    stripe_subscription_id: sub.id,
    subscription_tier: tier,
    subscription_status: sub.status,
    ...(periodEnd ? { period_end: periodEnd } : {}),
  }).eq("id", userId);

  // Set credits to tier quota (use sub.id as idempotency key)
  await resetCreditsToTier(userId, tier, `manual-sync-${sub.id}`);

  return NextResponse.json({
    synced: true,
    tier,
    customerId,
    subscriptionId: sub.id,
  });
}
