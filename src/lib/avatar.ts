import { fal } from "@fal-ai/client";
import { AVATAR_MODEL_CATALOG } from "@/types";
import { ensureHostedUrl } from "@/lib/fal";

/**
 * Generate a talking-head avatar video from a face image + audio.
 *
 * Uses fal.ai avatar endpoints (SadTalker, Kling Avatar v2) which
 * take a portrait image and driven audio, producing lip-synced video.
 */

export interface AvatarGenerateOptions {
  avatarImageUrl: string;
  audioUrl: string;
  avatarModelId: string;
  onProgress?: (status: string) => void;
}

export async function generateAvatarVideo(
  options: AvatarGenerateOptions,
): Promise<{ videoUrl: string; requestId: string }> {
  const model = AVATAR_MODEL_CATALOG.find((m) => m.id === options.avatarModelId);
  if (!model) throw new Error(`Unknown avatar model: ${options.avatarModelId}`);

  options.onProgress?.("Preparing avatar...");

  // Ensure images/audio are hosted on fal.ai CDN
  const imageUrl = await ensureHostedUrl(options.avatarImageUrl);
  const audioUrl = await ensureHostedUrl(options.audioUrl);

  // Build model-specific input
  const input: Record<string, unknown> = {};

  if (model.id === "sadtalker") {
    input.source_image_url = imageUrl;
    input.driven_audio_url = audioUrl;
  } else if (model.id === "kling-avatar-v2") {
    input.image_url = imageUrl;
    input.audio_url = audioUrl;
  } else {
    // Default fallback
    input.image_url = imageUrl;
    input.audio_url = audioUrl;
  }

  // Submit to queue
  options.onProgress?.("Generating avatar video...");
  let submitResult;
  try {
    submitResult = await fal.queue.submit(model.falEndpoint, { input });
  } catch (err: unknown) {
    if (err instanceof Event) {
      throw new Error(`[${model.falEndpoint}] Connection failed`);
    }
    const e = err as { body?: { detail?: string } | string; message?: string };
    const detail = typeof e?.body === "string" ? e.body : e?.body?.detail || e?.message || "Submit failed";
    throw new Error(`[${model.falEndpoint}] ${detail}`);
  }

  const requestId = submitResult.request_id;

  // Poll for result
  const POLL_INTERVAL = 3000;
  const MAX_POLLS = 300; // ~15 minutes (avatars can be slow)

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));

    let status;
    try {
      status = await fal.queue.status(model.falEndpoint, { requestId, logs: true });
    } catch {
      continue; // Network glitch — retry
    }

    if (status.status === "IN_QUEUE") {
      options.onProgress?.("Queued...");
    } else if (status.status === "IN_PROGRESS") {
      options.onProgress?.("Generating avatar...");
    } else if (status.status === "COMPLETED") {
      const result = await fal.queue.result(model.falEndpoint, { requestId });
      const data = result.data as Record<string, unknown>;

      // Extract video URL from various response shapes
      const videoUrl =
        (data.video as { url?: string })?.url ??
        (data.video_url as string) ??
        (data.output as { url?: string })?.url ??
        ((data.videos as { url?: string }[])?.[0]?.url) ??
        "";

      if (!videoUrl) throw new Error("No video URL in avatar response");
      return { videoUrl, requestId };
    } else if (status.status === "FAILED") {
      throw new Error(`Avatar generation failed on ${model.name}`);
    }
  }

  throw new Error("Avatar generation timed out after 15 minutes");
}
