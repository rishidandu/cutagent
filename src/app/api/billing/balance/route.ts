import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth-guard";
import { isStripeConfigured } from "@/lib/stripe";
import { getBalance } from "@/lib/credits";

/**
 * GET /api/billing/balance
 *
 * Returns current user's credit balance + tier info.
 * Returns { configured: false } if Stripe not set up (client treats as unlimited).
 */
export async function GET() {
  if (!isStripeConfigured()) {
    return NextResponse.json({ configured: false });
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ configured: true, authenticated: false });
  }

  const balance = await getBalance(userId);
  if (!balance) {
    return NextResponse.json({ configured: true, authenticated: true, error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    configured: true,
    authenticated: true,
    creditsCents: balance.creditsCents,
    tier: balance.tier,
    status: balance.status,
    periodEnd: balance.periodEnd,
  });
}
