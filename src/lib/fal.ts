import { fal } from "@fal-ai/client";
import { MODEL_CATALOG, type Scene, type StyleContext, type ReferenceImage, createDefaultStyleContext } from "@/types";
import { resolveAdapter, findModel } from "@/lib/model-adapters";

export function configureFal(apiKey: string) {
  fal.config({ credentials: apiKey });
}

export interface GenerateOptions {
  scene: Scene;
  styleContext?: StyleContext;
  onProgress?: (status: string, logs?: string[]) => void;
}

/**
 * Ensure image URL is accessible to fal.ai servers.
 *
 * Many e-commerce CDNs (Shopify, Demandware, Cloudflare) block both:
 * - fal.ai servers (no browser headers)
 * - Browser cross-origin fetch (CORS)
 *
 * Strategy:
 * 1. If already on fal.ai CDN → pass through
 * 2. If data: URL → direct upload to fal.storage
 * 3. Try browser fetch → if works, upload blob
 * 4. Fallback: proxy through our /api/proxy-image → upload blob
 */
export async function ensureHostedUrl(urlOrDataUrl: string): Promise<string> {
  // Already on fal.ai CDN
  if (urlOrDataUrl.includes("fal.media") || urlOrDataUrl.includes("fal.ai/files")) {
    return urlOrDataUrl;
  }

  // Upscale thumbnail URLs from common CDNs to full-size images
  urlOrDataUrl = upscaleCdnUrl(urlOrDataUrl);

  // Try direct fetch first (works for data: URLs and CORS-friendly servers)
  try {
    const resp = await fetch(urlOrDataUrl);
    if (resp.ok) {
      const blob = await resp.blob();
      if (blob.size > 0) {
        const hostedUrl = await fal.storage.upload(blob);
        return hostedUrl;
      }
    }
  } catch {
    // CORS blocked or network error — fall through to proxy
  }

  // Proxy through our server-side API (bypasses CORS)
  try {
    const proxyResp = await fetch("/api/proxy-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: urlOrDataUrl }),
    });
    if (proxyResp.ok) {
      const blob = await proxyResp.blob();
      if (blob.size > 0) {
        const hostedUrl = await fal.storage.upload(blob);
        return hostedUrl;
      }
    }
  } catch {
    // Proxy also failed
  }

  // Last resort: pass original URL and hope fal.ai can reach it
  return urlOrDataUrl;
}

/**
 * Rewrite known CDN thumbnail URLs to request full-size images (min 300x300 for fal.ai).
 * Also fixes HTML entity encoding issues (&amp; → &).
 */
function upscaleCdnUrl(url: string): string {
  // Fix HTML entity encoding
  let fixed = url.replace(/&amp;/g, "&");

  // Demandware / Salesforce Commerce: sw=256&sh=256 → sw=1200&sh=1200
  if (fixed.includes("demandware.static") || fixed.includes("dw/image")) {
    fixed = fixed.replace(/\bsw=\d+/g, "sw=1200").replace(/\bsh=\d+/g, "sh=1200");
  }

  // Shopify CDN: _100x100, _200x200 etc → _1200x1200
  if (fixed.includes("cdn.shopify.com")) {
    fixed = fixed.replace(/_\d+x\d*(\.[a-z]+)/i, "_1200x$1");
  }

  // Amazon: remove resize params like ._SX200_ or ._SS100_
  if (fixed.includes("media-amazon.com")) {
    fixed = fixed.replace(/\._[A-Z]{2}\d+_/g, "");
  }

  return fixed;
}

/**
 * Resolve which references are active for this scene.
 */
function resolveReferences(scene: Scene, ctx: StyleContext): ReferenceImage[] {
  const activeTypes = scene.activeReferenceTypes ?? ctx.defaultReferenceTypes;
  return ctx.references.filter((r) => activeTypes.includes(r.type));
}

/**
 * Generate a scene using fal.ai with the Style Engine.
 *
 * The adapter system handles:
 * - Prompt augmentation (style brief prepended)
 * - Model-specific parameter formatting
 * - Correct consistency endpoint selection
 * - Reference image formatting per model API
 */
export async function generateScene({ scene, styleContext, onProgress }: GenerateOptions): Promise<{
  videoUrl: string;
  requestId: string;
}> {
  const ctx = styleContext ?? createDefaultStyleContext();
  const model = findModel(scene.modelId);

  // Resolve active references for this scene
  const references = resolveReferences(scene, ctx);
  const strength = scene.strengthOverride ?? ctx.strength;

  // Upload any base64 reference images to hosted URLs
  const hostedRefs = await Promise.all(
    references.map(async (ref) => ({
      ...ref,
      url: await ensureHostedUrl(ref.url),
    })),
  );

  // Get the correct adapter for this model and build the request
  const adapter = resolveAdapter(scene.modelId);
  const { endpointId, input } = adapter({
    scene,
    model,
    brief: ctx.brief,
    references: hostedRefs,
    strength,
  });

  // Submit to queue
  onProgress?.("Queued", []);

  let submitResult;
  try {
    submitResult = await fal.queue.submit(endpointId, { input });
  } catch (submitErr: unknown) {
    // Handle various error shapes from fal SDK:
    // - ValidationError: { body: { detail: "..." }, status: 422 }
    // - Network/WebSocket: Event object or string
    // - Generic: Error with message
    if (submitErr instanceof Event) {
      throw new Error(`[${endpointId}] Connection failed — check your API key and network`);
    }
    if (typeof submitErr === "string") {
      throw new Error(`[${endpointId}] ${submitErr}`);
    }
    const e = submitErr as { body?: { detail?: string } | string; message?: string; status?: number; name?: string };
    const bodyDetail = typeof e?.body === "string" ? e.body : e?.body?.detail ?? "";
    const detail = bodyDetail || e?.message || `${e?.name ?? "Error"} (status ${e?.status ?? "?"})`;
    throw new Error(`[${endpointId}] ${detail}`);
  }

  const requestId = submitResult.request_id;

  // Poll with full endpoint ID to avoid SDK path-truncation bug
  const POLL_INTERVAL = 3000;
  const MAX_POLLS = 300; // ~15 minutes (some models like HunyuanVideo img2vid are slow)

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));

    let status;
    try {
      status = await fal.queue.status(endpointId, {
        requestId,
        logs: true,
      });
    } catch (pollErr: unknown) {
      // WebSocket/network Event — retry
      if (pollErr instanceof Event) continue;
      const pe = pollErr as { body?: unknown; message?: string; name?: string; status?: number };
      // Validation errors are fatal
      if (pe?.name === "ValidationError" || pe?.status === 422 || pe?.status === 400) {
        const bodyDetail = typeof pe?.body === "string" ? pe.body : (pe?.body as { detail?: string })?.detail ?? JSON.stringify(pe?.body);
        throw new Error(`[${endpointId}] ${bodyDetail || pe?.message || "Validation error"}`);
      }
      // Other network errors — retry
      continue;
    }

    if (status.status === "IN_QUEUE") {
      onProgress?.("Queued", []);
    } else if (status.status === "IN_PROGRESS") {
      const logs = "logs" in status
        ? (status.logs ?? []).map((l: { message: string }) => l.message)
        : [];
      onProgress?.("Generating", logs);
    } else if (status.status === "COMPLETED") {
      // Fetch result
      const result = await fal.queue.result(endpointId, { requestId });
      const data = result.data as Record<string, unknown>;

      const videoUrl =
        (data.video as { url?: string })?.url ??
        (data.video_url as string) ??
        ((data.videos as { url?: string }[])?.[0]?.url) ??
        "";

      if (!videoUrl) {
        throw new Error(`No video URL in response from ${endpointId}. Keys: ${Object.keys(data).join(", ")}`);
      }

      return { videoUrl, requestId };
    } else if (status.status === "FAILED") {
      // Handle explicit failure from fal.ai
      const errorMsg = "error" in status
        ? String((status as { error?: unknown }).error)
        : "Generation failed on fal.ai";
      throw new Error(`[${endpointId}] ${errorMsg}`);
    }
  }

  throw new Error(`Generation timed out after 10 minutes [${endpointId}]`);
}
