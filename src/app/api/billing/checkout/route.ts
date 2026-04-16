import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth-guard";
import { isStripeConfigured, getStripe, priceIdForTier, ensureStripeCustomer, type PaidTier } from "@/lib/stripe";
import { getServiceSupabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";

/**
 * POST /api/billing/checkout
 * Body: { tier: "premium" | "pro" }
 *
 * Creates a Stripe Checkout session for the requested tier.
 * Lazily creates Stripe customer if user doesn't have one yet.
 */
export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await auth();
  const userEmail = session?.user?.email;
  const userName = session?.user?.name ?? null;
  if (!userEmail) {
    return NextResponse.json({ error: "Missing user email" }, { status: 400 });
  }

  try {
    const { tier } = (await req.json()) as { tier: PaidTier };
    if (tier !== "premium" && tier !== "pro") {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // Lookup existing stripe_customer_id
    const { data: user } = await supabase
      .from("users")
      .select("stripe_customer_id")
      .eq("id", userId)
      .single();

    const customerId = await ensureStripeCustomer(
      userId,
      userEmail,
      userName,
      user?.stripe_customer_id ?? null,
    );

    // Persist new customer ID if just created
    if (!user?.stripe_customer_id) {
      await supabase.from("users").update({ stripe_customer_id: customerId }).eq("id", userId);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const stripe = getStripe();

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceIdForTier(tier), quantity: 1 }],
      success_url: `${appUrl}/?upgraded=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?upgrade_cancelled=true`,
      client_reference_id: userId,
      subscription_data: {
        metadata: { userId, tier },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
