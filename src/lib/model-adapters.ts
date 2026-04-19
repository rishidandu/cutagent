import {
  MODEL_CATALOG,
  type ModelInfo,
  type ReferenceImage,
  type Scene,
  type StyleBrief,
} from "@/types";
import { NEGATIVE_PROMPT } from "@/lib/prompt-engine";

// ── Adapter interfaces ──

export interface AdapterInput {
  scene: Scene;
  model: ModelInfo;
  brief: StyleBrief;
  /** References already filtered to active types for this scene */
  references: ReferenceImage[];
  /** Normalized 0-1 strength */
  strength: number;
}

export interface AdapterOutput {
  /** The fal.ai endpoint to submit to */
  endpointId: string;
  /** Fully formatted input for the endpoint */
  input: Record<string, unknown>;
}

// ── Prompt augmentation (shared across all adapters) ──

/**
 * Prepend the style brief to the scene's prompt.
 * Brief goes first because fal.ai models weight the beginning of prompts more heavily.
 */
/**
 * Prepend the style brief to the scene's prompt.
 * Only includes non-empty fields. Removes "X:" prefixes — models respond
 * better to natural language than structured labels.
 */
export function augmentPrompt(basePrompt: string, brief: StyleBrief): string {
  const parts: string[] = [];
  if (brief.description.trim()) parts.push(brief.description.trim());
  if (brief.characterDescription.trim()) parts.push(brief.characterDescription.trim());
  if (brief.lighting.trim()) parts.push(brief.lighting.trim());
  if (brief.colorPalette.trim()) parts.push(brief.colorPalette.trim());
  if (parts.length === 0) return basePrompt;
  return `${parts.join(". ")}. ${basePrompt}`;
}

/**
 * Pick the best reference image for a single-ref model.
 * Priority: character > product > style > last-frame
 */
function pickBestReference(refs: ReferenceImage[]): ReferenceImage | undefined {
  const priority: ReferenceImage["type"][] = ["character", "product", "style", "last-frame"];
  for (const type of priority) {
    const found = refs.find((r) => r.type === type);
    if (found) return found;
  }
  return refs[0];
}

/**
 * Pick the nearest supported numeric option.
 */
function pickNearest(value: number, allowed: readonly number[]): number {
  if (allowed.length === 0) return value;
  let best = allowed[0];
  let bestDist = Math.abs(value - best);
  for (const v of allowed) {
    const dist = Math.abs(value - v);
    if (dist < bestDist) {
      best = v;
      bestDist = dist;
    }
  }
  return best;
}

// ── Model Adapters ──

function buildKlingRequest({ scene, model, brief, references, strength }: AdapterInput): AdapterOutput {
  const hasRefs = references.length > 0 && model.consistency;
  const endpointId = hasRefs ? model.consistency!.endpointId : model.id;

  const prompt = augmentPrompt(scene.prompt, brief);
  const duration = pickNearest(scene.duration, [5, 10]);
  const input: Record<string, unknown> = {
    prompt,
    negative_prompt: NEGATIVE_PROMPT,
    aspect_ratio: scene.aspectRatio,
    duration: `${duration}`,
    // Higher cfg_scale = stricter prompt adherence (better for product fidelity)
    cfg_scale: 0.7,
  };

  if (hasRefs) {
    const ref = pickBestReference(references);
    if (ref) input.image_url = ref.url;
  }

  return { endpointId, input };
}

function buildMiniMaxRequest({ scene, model, brief, references }: AdapterInput): AdapterOutput {
  const hasRefs = references.length > 0 && model.consistency;

  // MiniMax subject-reference endpoint for character refs
  // Falls back to image-to-video for other ref types
  const hasCharacterRef = references.some((r) => r.type === "character");
  const endpointId = hasRefs
    ? hasCharacterRef
      ? "fal-ai/minimax/video-01-subject-reference"
      : "fal-ai/minimax/video-01-live/image-to-video"
    : model.id;

  // MiniMax does NOT support aspect_ratio parameter.
  // Include aspect ratio hint in the prompt so the model infers orientation.
  const arHint = scene.aspectRatio === "9:16" ? "vertical portrait format video, 9:16 aspect ratio"
    : scene.aspectRatio === "1:1" ? "square format video, 1:1 aspect ratio"
    : "horizontal landscape format video, 16:9 aspect ratio";
  const prompt = augmentPrompt(`${arHint}. ${scene.prompt}`, brief);
  const input: Record<string, unknown> = {
    prompt,
    // Do NOT send aspect_ratio — MiniMax doesn't accept it
  };

  if (hasRefs) {
    const ref = pickBestReference(references);
    if (ref) {
      if (hasCharacterRef) {
        // API expects subject_reference_image_url (not subject_reference)
        input.subject_reference_image_url = ref.url;
      } else {
        input.image_url = ref.url;
      }
    }
  }

  return { endpointId, input };
}

function buildWanRequest({ scene, model, brief, references }: AdapterInput): AdapterOutput {
  const hasRefs = references.length > 0 && model.consistency;
  const endpointId = hasRefs ? model.consistency!.endpointId : model.id;

  const prompt = augmentPrompt(scene.prompt, brief);
  const duration = pickNearest(scene.duration, [5, 10]);
  const input: Record<string, unknown> = {
    prompt,
    negative_prompt: NEGATIVE_PROMPT,
    duration: `${duration}`,
  };

  // WAN 2.5 image-to-video infers framing from the input image and does not
  // expose aspect_ratio in its public schema.
  if (!hasRefs) {
    input.aspect_ratio = scene.aspectRatio;
  }

  if (hasRefs) {
    const ref = pickBestReference(references);
    if (ref) input.image_url = ref.url;
  }

  return { endpointId, input };
}

function buildSeedanceRequest({ scene, model, brief, references }: AdapterInput): AdapterOutput {
  const hasRefs = references.length > 0 && model.consistency;
  const endpointId = hasRefs ? model.consistency!.endpointId : model.id;

  const prompt = augmentPrompt(scene.prompt, brief);
  // Seedance accepts duration as a plain number string: "4","5",..."12"
  const dur = Math.max(4, Math.min(12, Math.round(scene.duration)));
  const input: Record<string, unknown> = {
    prompt,
    negative_prompt: NEGATIVE_PROMPT,
    aspect_ratio: scene.aspectRatio,
    duration: `${dur}`,
    // Disable native audio if scene has voiceover text — the TTS voiceover
    // will be mixed in during export instead of Seedance's generated audio
    generate_audio: !scene.voiceoverText?.trim(),
  };

  if (hasRefs) {
    const ref = pickBestReference(references);
    if (ref) input.image_url = ref.url;
  }

  return { endpointId, input };
}

function buildHunyuanRequest({ scene, model, brief, references }: AdapterInput): AdapterOutput {
  const hasRefs = references.length > 0 && model.consistency;
  const endpointId = hasRefs ? model.consistency!.endpointId : model.id;

  const prompt = augmentPrompt(scene.prompt, brief);

  // Current public schema exposes "85" or "129" as string-literal enum values
  // for num_frames. Sending integers fails fal's Pydantic validator.
  // Map shorter scenes to "85" and longer scenes to "129".
  const numFrames = scene.duration <= 4 ? "85" : "129";

  const input: Record<string, unknown> = {
    prompt,
    num_frames: numFrames,
    resolution: "720p",
    aspect_ratio: scene.aspectRatio,
  };

  if (hasRefs) {
    const ref = pickBestReference(references);
    if (ref) input.image_url = ref.url;
  }

  return { endpointId, input };
}

function buildLumaRequest({ scene, model, brief, references }: AdapterInput): AdapterOutput {
  const hasRefs = references.length > 0 && model.consistency;
  const endpointId = hasRefs ? model.consistency!.endpointId : model.id;

  const prompt = augmentPrompt(scene.prompt, brief);
  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: scene.aspectRatio,
    duration: `${scene.duration}s`,
  };

  if (hasRefs) {
    const ref = pickBestReference(references);
    if (ref) input.image_url = ref.url;
  }

  return { endpointId, input };
}

function buildVeoRequest({ scene, model, brief, references }: AdapterInput): AdapterOutput {
  const hasRefs = references.length > 0 && model.consistency;
  const endpointId = hasRefs ? model.consistency!.endpointId : model.id;
  const isVeo3 = model.id.includes("veo3");

  // Veo benefits most from prompt-level consistency since its image conditioning
  // is prompt-driven. The augmented prompt is the primary consistency lever.
  const prompt = augmentPrompt(scene.prompt, brief);
  // Veo2 supports 5s/6s/7s/8s. Veo3 supports 4s/6s/8s.
  const veoDur = isVeo3
    ? pickNearest(scene.duration, [4, 6, 8])
    : pickNearest(scene.duration, [5, 6, 7, 8]);

  const input: Record<string, unknown> = {
    prompt,
    duration: `${veoDur}s`,
  };

  // Veo2 image-to-video schema does not expose aspect_ratio; Veo2 text-to-video
  // and Veo3 endpoints do.
  if (!hasRefs || isVeo3) {
    input.aspect_ratio = scene.aspectRatio;
  }

  // Resolution is exposed on Veo3 endpoints.
  if (isVeo3) {
    // Use 1080p for CTA/solution (hero shots benefit from higher res), 720p for others.
    input.resolution = scene.role === "cta" || scene.role === "solution" ? "1080p" : "720p";
    // Enable native audio for Veo 3, but disable if scene has voiceover text
    // (the TTS voiceover will be mixed in during export instead).
    input.generate_audio = !scene.voiceoverText?.trim();
  }

  if (hasRefs) {
    const ref = pickBestReference(references);
    if (ref) input.image_url = ref.url;
  }

  return { endpointId, input };
}

function buildDefaultRequest({ scene, model, brief }: AdapterInput): AdapterOutput {
  const prompt = augmentPrompt(scene.prompt, brief);
  const input: Record<string, unknown> = {
    prompt,
    duration: `${scene.duration}s`,
  };

  // Only send aspect_ratio if model supports it
  if (model.supportedAspectRatios) {
    input.aspect_ratio = scene.aspectRatio;
  }

  return { endpointId: model.id, input };
}

// ── Adapter registry ──

type AdapterFn = (input: AdapterInput) => AdapterOutput;

const ADAPTER_REGISTRY: { pattern: RegExp; adapter: AdapterFn }[] = [
  { pattern: /kling/i, adapter: buildKlingRequest },
  { pattern: /minimax/i, adapter: buildMiniMaxRequest },
  { pattern: /wan/i, adapter: buildWanRequest },
  { pattern: /seedance/i, adapter: buildSeedanceRequest },
  { pattern: /hunyuan/i, adapter: buildHunyuanRequest },
  { pattern: /luma/i, adapter: buildLumaRequest },
  { pattern: /veo/i, adapter: buildVeoRequest },
];

/**
 * Resolve the correct adapter for a model ID.
 * Falls back to DefaultAdapter if no pattern matches.
 */
export function resolveAdapter(modelId: string): AdapterFn {
  for (const { pattern, adapter } of ADAPTER_REGISTRY) {
    if (pattern.test(modelId)) return adapter;
  }
  return buildDefaultRequest;
}

/**
 * Look up ModelInfo from the catalog by ID.
 */
export function findModel(modelId: string): ModelInfo {
  return MODEL_CATALOG.find((m) => m.id === modelId) ?? MODEL_CATALOG[0];
}
