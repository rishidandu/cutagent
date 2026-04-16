import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth-guard";
import { isStripeConfigured, getStripe } from "@/lib/stripe";
import { getServiceSupabase } from "@/lib/supabase";

/**
 * POST /api/billing/portal
 *
 * Creates a Stripe Billing Portal session so users can manage
 * their subscription (cancel, update payment method, etc.).
 */
export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  const { data: user } = await supabase
    .from("users")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  if (!user?.stripe_customer_id) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }

  try {
    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: appUrl,
    });

    return NextResponse.json({ url: portal.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Portal failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
