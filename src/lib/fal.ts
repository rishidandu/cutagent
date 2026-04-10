import { fal } from "@fal-ai/client";
import type { Scene } from "@/types";

export function configureFal(apiKey: string) {
  fal.config({ credentials: apiKey });
}

/**
 * Map text-to-video model IDs to their img2vid counterparts.
 */
const IMG2VID_MODEL_MAP: Record<string, string> = {
  "fal-ai/kling-video/v2.5-turbo/pro/text-to-video": "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
  "fal-ai/minimax/video-01-live": "fal-ai/minimax/video-01-live/image-to-video",
  "fal-ai/bytedance/seedance/v1.5/pro/text-to-video": "fal-ai/bytedance/seedance/v1.5/pro/image-to-video",
};

export interface GenerateOptions {
  scene: Scene;
  onProgress?: (status: string, logs?: string[]) => void;
}

/**
 * Generate a scene using fal.ai.
 * Uses manual queue polling to work around the SDK's path-truncation bug
 * with deep model IDs (e.g. fal-ai/wan-25-preview/text-to-video).
 */
export async function generateScene({ scene, onProgress }: GenerateOptions): Promise<{
  videoUrl: string;
  requestId: string;
}> {
  const hasRef = !!scene.referenceImageUrl;

  // Pick img2vid variant if reference image is present
  let modelId = scene.modelId;
  if (hasRef && IMG2VID_MODEL_MAP[modelId]) {
    modelId = IMG2VID_MODEL_MAP[modelId];
  }

  const input: Record<string, unknown> = {
    prompt: scene.prompt,
    aspect_ratio: scene.aspectRatio,
  };

  // Model-specific params
  if (modelId.includes("kling")) {
    input.duration = `${scene.duration}`;
  } else if (modelId.includes("veo")) {
    input.duration = `${scene.duration}s`;
    input.resolution = "720p";
    input.generate_audio = true;
  } else if (modelId.includes("wan")) {
    input.num_frames = Math.round(scene.duration * 16);
  } else if (!modelId.includes("minimax")) {
    input.duration = `${scene.duration}s`;
  }

  // Reference image for Style Harness
  if (hasRef) {
    input.image_url = scene.referenceImageUrl;
  }

  // Submit to queue
  onProgress?.("Queued", []);
  const submitResult = await fal.queue.submit(modelId, { input });
  const requestId = submitResult.request_id;

  // Poll with full model ID to avoid SDK path-truncation bug
  const POLL_INTERVAL = 3000;
  const MAX_POLLS = 200; // ~10 minutes

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));

    const status = await fal.queue.status(modelId, {
      requestId,
      logs: true,
    });

    if (status.status === "IN_QUEUE") {
      onProgress?.("Queued", []);
    } else if (status.status === "IN_PROGRESS") {
      const logs = "logs" in status
        ? (status.logs ?? []).map((l: { message: string }) => l.message)
        : [];
      onProgress?.("Generating", logs);
    } else if (status.status === "COMPLETED") {
      // Fetch result
      const result = await fal.queue.result(modelId, { requestId });
      const data = result.data as Record<string, unknown>;

      const videoUrl =
        (data.video as { url?: string })?.url ??
        (data.video_url as string) ??
        ((data.videos as { url?: string }[])?.[0]?.url) ??
        "";

      return { videoUrl, requestId };
    }
  }

  throw new Error("Generation timed out after 10 minutes");
}
