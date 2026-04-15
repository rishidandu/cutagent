import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getCurrentUserId } from "@/lib/auth-guard";
import { isSupabaseConfigured, getServiceSupabase } from "@/lib/supabase";

/**
 * POST /api/storage/upload
 *
 * Downloads a video from a fal.ai URL and persists it to Supabase Storage.
 * Returns a permanent public URL that won't expire.
 *
 * Body: { videoUrl: string, sceneId: string, projectId?: string }
 */
export async function POST(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  if (!isSupabaseConfigured()) {
    // No storage available — return the original URL as-is
    const { videoUrl } = await req.json();
    return NextResponse.json({ permanentUrl: videoUrl, persisted: false });
  }

  const userId = await getCurrentUserId();

  try {
    const { videoUrl, sceneId, projectId } = await req.json();

    if (!videoUrl || typeof videoUrl !== "string") {
      return NextResponse.json({ error: "Missing videoUrl" }, { status: 400 });
    }

    // Download the video from fal.ai CDN
    const resp = await fetch(videoUrl, {
      signal: AbortSignal.timeout(60_000), // 60s timeout for large videos
    });

    if (!resp.ok) {
      return NextResponse.json({ error: `Failed to download video: ${resp.status}` }, { status: 502 });
    }

    const contentType = resp.headers.get("content-type") || "video/mp4";
    const buffer = Buffer.from(await resp.arrayBuffer());

    // Build storage path: users/{userId}/{projectId}/{sceneId}.mp4
    const userFolder = userId || "anonymous";
    const projFolder = projectId || "unsorted";
    const timestamp = Date.now();
    const path = `${userFolder}/${projFolder}/${sceneId}-${timestamp}.mp4`;

    const supabase = getServiceSupabase();

    // Ensure bucket exists (creates if not — idempotent)
    await supabase.storage.createBucket("videos", {
      public: true,
      fileSizeLimit: 100 * 1024 * 1024, // 100MB max
    });

    // Upload
    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(path, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      // Bucket might already exist — try upload without create
      const { error: retryError } = await supabase.storage
        .from("videos")
        .upload(path, buffer, {
          contentType,
          upsert: true,
        });

      if (retryError) {
        return NextResponse.json(
          { error: `Upload failed: ${retryError.message}` },
          { status: 500 },
        );
      }
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from("videos")
      .getPublicUrl(path);

    return NextResponse.json({
      permanentUrl: urlData.publicUrl,
      path,
      persisted: true,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 },
    );
  }
}
