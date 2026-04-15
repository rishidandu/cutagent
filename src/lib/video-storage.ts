/**
 * Video persistence — copies generated videos from fal.ai CDN
 * to Supabase Storage for permanent access.
 *
 * fal.ai video URLs (fal.media) expire after ~24-48 hours.
 * This module copies them to Supabase Storage which is permanent.
 */

/**
 * Persist a video to Supabase Storage.
 * Returns the permanent URL, or the original URL if persistence fails.
 */
export async function persistVideo(
  videoUrl: string,
  sceneId: string,
  projectId?: string | null,
): Promise<string> {
  // Skip if already on Supabase Storage
  if (videoUrl.includes("supabase.co/storage")) {
    return videoUrl;
  }

  // Skip if no video URL
  if (!videoUrl || videoUrl.startsWith("blob:")) {
    return videoUrl;
  }

  try {
    const resp = await fetch("/api/storage/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoUrl, sceneId, projectId }),
    });

    if (!resp.ok) {
      console.warn("[video-storage] Persistence failed, keeping original URL");
      return videoUrl;
    }

    const data = await resp.json();
    return data.permanentUrl || videoUrl;
  } catch {
    // Storage not available — keep the fal.ai URL
    return videoUrl;
  }
}

/**
 * Check if a video URL is permanent (Supabase) or temporary (fal.ai).
 */
export function isTemporaryUrl(url: string): boolean {
  return url.includes("fal.media") || url.includes("fal.ai/files");
}
