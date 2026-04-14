import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getCurrentUserId } from "@/lib/auth-guard";
import { isSupabaseConfigured, getServiceSupabase } from "@/lib/supabase";

/**
 * POST /api/generations — record a completed generation's cost
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
  const { error } = await supabase.from("generation_history").insert({
    user_id: userId,
    project_id: body.project_id || null,
    scene_id: body.scene_id,
    scene_index: body.scene_index ?? 0,
    model_name: body.model_name,
    model_id: body.model_id,
    duration: body.duration,
    cost: body.cost,
  });

  if (error) {
    return NextResponse.json({ error: "Failed to record" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
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
