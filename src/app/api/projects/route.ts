import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getCurrentUserId } from "@/lib/auth-guard";
import { isSupabaseConfigured, getServiceSupabase } from "@/lib/supabase";

/**
 * GET /api/projects — list user's projects (lightweight, no full scene data)
 * POST /api/projects — create a new project
 */

export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;

  if (!isSupabaseConfigured()) {
    return NextResponse.json([]);
  }

  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json([]);

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, updated_at, created_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "Failed to list projects" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      name: body.name || "Untitled",
      scenes: body.scenes || [],
      style_context: body.styleContext || {},
      audio_tracks: body.audioTracks || [],
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
