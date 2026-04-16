import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getCurrentUserId } from "@/lib/auth-guard";
import { isSupabaseConfigured, getServiceSupabase } from "@/lib/supabase";
import { isStripeConfigured } from "@/lib/stripe";
import { deductCredits } from "@/lib/credits";

/**
 * POST /api/generations — record a completed generation's cost
 *                         + deduct credits when Stripe configured
 * GET /api/generations — get cost summary for current user
 */

export async function POST(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, persisted: false });
  }

  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const supabase = getServiceSupabase();
  const { data: inserted, error } = await supabase.from("generation_history").insert({
    user_id: userId,
    project_id: body.project_id || null,
    scene_id: body.scene_id,
    scene_index: body.scene_index ?? 0,
    model_name: body.model_name,
    model_id: body.model_id,
    duration: body.duration,
    cost: body.cost,
  }).select("id").single();

  if (error) {
    return NextResponse.json({ error: "Failed to record" }, { status: 500 });
  }

  // Deduct credits if Stripe is configured. Cost → cents (Math.ceil, never under-charge)
  let newBalance: number | null = null;
  if (isStripeConfigured() && typeof body.cost === "number" && body.cost > 0) {
    const costCents = Math.ceil(body.cost * 100);
    const result = await deductCredits(userId, costCents, {
      generationId: inserted?.id,
      reason: "generation",
    });
    if (result.ok && typeof result.newBalance === "number") {
      newBalance = result.newBalance;
    }
  }

  return NextResponse.json({ ok: true, newBalance });
}

export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ totalSpent: 0, count: 0, entries: [] });
  }

  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ totalSpent: 0, count: 0, entries: [] });

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("generation_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }

  const entries = data ?? [];
  const totalSpent = entries.reduce((s, e) => s + Number(e.cost), 0);

  return NextResponse.json({
    totalSpent: Math.round(totalSpent * 100) / 100,
    count: entries.length,
    entries,
  });
}
