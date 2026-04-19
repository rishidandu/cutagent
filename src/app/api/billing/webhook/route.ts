import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, isStripeConfigured, tierFromPriceId, TIERS } from "@/lib/stripe";
import { getServiceSupabase } from "@/lib/supabase";
import { resetCreditsToTier, addCredits } from "@/lib/credits";

/**
 * POST /api/billing/webhook
 *
 * Stripe webhook handler. Verifies signature, dispatches by event type.
 * Idempotent via credit_transactions.stripe_event_id unique index.
 */
/**
 * Extract period_end from a Stripe subscription.
 * Newer API versions expose it on items.data[0], older on the top-level subscription.
 */
function extractPeriodEnd(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined;
  const subAny = sub as unknown as { current_period_end?: number };
  const sec = item?.current_period_end ?? subAny?.current_period_end;
  return sec ? new Date(sec * 1000).toISOString() : null;
}

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        if (!userId || !session.subscription || !session.customer) break;

        const sub = await stripe.subscriptions.retrieve(session.subscription as string) as unknown as Stripe.Subscription;
        const priceId = sub.items.data[0]?.price.id;
        const tier = priceId ? tierFromPriceId(priceId) : null;
        if (!tier || tier === "free") break;

        // Link subscription and reset credits
        await supabase.from("users").update({
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: sub.id,
          subscription_tier: tier,
          subscription_status: sub.status,
          ...(extractPeriodEnd(sub) ? { period_end: extractPeriodEnd(sub)! } : {}),
        }).eq("id", userId);

        await resetCreditsToTier(userId, tier, event.id);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null };
        if (!invoice.customer || !invoice.subscription) break;

        // Find user by customer
        const { data: user } = await supabase
          .from("users")
          .select("id")
          .eq("stripe_customer_id", invoice.customer as string)
          .single();
        if (!user) break;

        const sub = await stripe.subscriptions.retrieve(invoice.subscription as string) as unknown as Stripe.Subscription;
        const priceId = sub.items.data[0]?.price.id;
        const tier = priceId ? tierFromPriceId(priceId) : null;
        if (!tier || tier === "free") break;

        await supabase.from("users").update({
          subscription_status: "active",
          ...(extractPeriodEnd(sub) ? { period_end: extractPeriodEnd(sub)! } : {}),
        }).eq("id", user.id);

        await resetCreditsToTier(user.id, tier, event.id);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const { data: user } = await supabase
          .from("users")
          .select("id, subscription_tier, credits_cents")
          .eq("stripe_customer_id", sub.customer as string)
          .single();
        if (!user) break;

        const priceId = sub.items.data[0]?.price.id;
        const newTier = priceId ? tierFromPriceId(priceId) : null;
        if (!newTier) break;

        // On upgrade (premium → pro), top up the difference
        if (user.subscription_tier === "premium" && newTier === "pro") {
          const diff = TIERS.pro.creditsCents - TIERS.premium.creditsCents;
          await addCredits(user.id, diff, {
            reason: "upgrade",
            stripeEventId: event.id,
          });
        }

        await supabase.from("users").update({
          subscription_tier: newTier,
          subscription_status: sub.status,
          ...(extractPeriodEnd(sub) ? { period_end: extractPeriodEnd(sub)! } : {}),
        }).eq("id", user.id);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const { data: user } = await supabase
          .from("users")
          .select("id")
          .eq("stripe_customer_id", sub.customer as string)
          .single();
        if (!user) break;

        // Downgrade to free but keep existing credits (user paid for them)
        await supabase.from("users").update({
          subscription_tier: "free",
          subscription_status: "canceled",
          stripe_subscription_id: null,
        }).eq("id", user.id);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const { data: user } = await supabase
          .from("users")
          .select("id")
          .eq("stripe_customer_id", invoice.customer as string)
          .single();
        if (!user) break;

        await supabase.from("users").update({
          subscription_status: "past_due",
        }).eq("id", user.id);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook] Handler error:", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }
}
