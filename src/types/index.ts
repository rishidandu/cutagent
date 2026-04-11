// ── Style Engine types ──

export type ConsistencyMechanism =
  | "image-to-video"       // Standard img2vid — single image as start frame
  | "reference-to-video"   // Multi-reference — character/style refs (Kling O1, Seedance, Wan)
  | "subject-reference"    // Identity/face consistency (MiniMax)
  | "prompt-only";         // No image input supported, prompt is only lever

export interface ModelConsistency {
  mechanism: ConsistencyMechanism;
  /** The fal.ai endpoint ID for this consistency mode */
  endpointId: string;
  /** Max number of reference images accepted */
  maxRefs: number;
  /** Whether this endpoint supports start-frame anchoring */
  supportsStartFrame: boolean;
}

export interface StyleBrief {
  /** Global style description prepended to every scene's prompt */
  description: string;
  /** Character/subject description for consistency */
  characterDescription: string;
  /** Lighting style keywords */
  lighting: string;
  /** Color palette keywords */
  colorPalette: string;
}

export type ReferenceType = "character" | "style" | "product" | "last-frame";

export interface ReferenceImage {
  id: string;
  /** base64 data URL or fal.ai hosted URL */
  url: string;
  type: ReferenceType;
  label: string;
  /** Scene this was extracted from, if any */
  sourceSceneId?: string;
}

export interface StyleContext {
  brief: StyleBrief;
  references: ReferenceImage[];
  /** Which reference types to use by default */
  defaultReferenceTypes: ReferenceType[];
  /** Global strength 0-1, model adapters map to native range */
  strength: number;
  /** Whether to auto-extract last frame from completed scenes */
  autoChainLastFrame: boolean;
}

export function createDefaultStyleContext(): StyleContext {
  return {
    brief: {
      description: "",
      characterDescription: "",
      lighting: "",
      colorPalette: "",
    },
    references: [],
    defaultReferenceTypes: ["character", "style", "product", "last-frame"],
    strength: 0.7,
    autoChainLastFrame: true,
  };
}

// ── fal.ai model catalog ──

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  maxDuration: number;
  supportedDurations: number[];
  /** Aspect ratios the model accepts. null = model doesn't support aspect ratio control */
  supportedAspectRatios: string[] | null;
  supportsAudio: boolean;
  /** Consistency capability — null if model has no image input support */
  consistency: ModelConsistency | null;
  costPerSec: number;
  bestFor: string;
}

export const MODEL_CATALOG: ModelInfo[] = [
  {
    id: "fal-ai/hunyuan-video",
    name: "HunyuanVideo",
    provider: "Tencent",
    maxDuration: 5,
    supportedDurations: [3, 5],
    supportedAspectRatios: ["16:9", "9:16"],
    supportsAudio: false,
    consistency: {
      mechanism: "image-to-video",
      endpointId: "fal-ai/hunyuan-video-image-to-video",
      maxRefs: 1,
      supportsStartFrame: true,
    },
    costPerSec: 0.075,
    bestFor: "Cheapest, open-source",
  },
  {
    id: "fal-ai/minimax/video-01-live",
    name: "MiniMax Live",
    provider: "MiniMax",
    maxDuration: 6,
    supportedDurations: [3, 6],
    supportedAspectRatios: null, // MiniMax does NOT support aspect ratio control
    supportsAudio: false,
    consistency: {
      mechanism: "subject-reference",
      endpointId: "fal-ai/minimax/video-01-subject-reference",
      maxRefs: 1,
      supportsStartFrame: false,
    },
    costPerSec: 0.10,
    bestFor: "Fast, cheap",
  },
  {
    id: "fal-ai/wan-25-preview/text-to-video",
    name: "Wan 2.5",
    provider: "Alibaba",
    maxDuration: 5,
    supportedDurations: [3, 5],
    supportedAspectRatios: ["16:9", "9:16", "1:1"],
    supportsAudio: false,
    consistency: {
      mechanism: "image-to-video",
      endpointId: "fal-ai/wan-25-preview/image-to-video",
      maxRefs: 1,
      supportsStartFrame: true,
    },
    costPerSec: 0.05,
    bestFor: "Anime, stylized",
  },
  {
    id: "fal-ai/kling-video/v2.5-turbo/pro/text-to-video",
    name: "Kling 2.5 Turbo",
    provider: "Kuaishou",
    maxDuration: 10,
    supportedDurations: [5, 10],
    supportedAspectRatios: ["16:9", "9:16", "1:1"],
    supportsAudio: false,
    consistency: {
      mechanism: "image-to-video",
      endpointId: "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
      maxRefs: 1,
      supportsStartFrame: true,
    },
    costPerSec: 0.07,
    bestFor: "Action, motion",
  },
  {
    id: "fal-ai/luma-dream-machine/ray-2",
    name: "Luma Ray 2",
    provider: "Luma",
    maxDuration: 5,
    supportedDurations: [5],
    supportedAspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "9:21"],
    supportsAudio: false,
    consistency: {
      mechanism: "image-to-video",
      endpointId: "fal-ai/luma-dream-machine/ray-2/image-to-video",
      maxRefs: 1,
      supportsStartFrame: true,
    },
    costPerSec: 0.10,
    bestFor: "Dreamy, creative",
  },
  {
    id: "fal-ai/bytedance/seedance/v1.5/pro/text-to-video",
    name: "Seedance 1.5",
    provider: "ByteDance",
    maxDuration: 10,
    supportedDurations: [5, 10],
    supportedAspectRatios: ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"],
    supportsAudio: true,
    consistency: {
      mechanism: "image-to-video",
      endpointId: "fal-ai/bytedance/seedance/v1.5/pro/image-to-video",
      maxRefs: 1,
      supportsStartFrame: true,
    },
    costPerSec: 0.08,
    bestFor: "Multi-shot, audio",
  },
  {
    id: "fal-ai/veo2",
    name: "Veo 2",
    provider: "Google",
    maxDuration: 8,
    supportedDurations: [5, 6, 7, 8],
    supportedAspectRatios: ["16:9", "9:16"],
    supportsAudio: false,
    consistency: {
      mechanism: "image-to-video",
      endpointId: "fal-ai/veo2/image-to-video",
      maxRefs: 1,
      supportsStartFrame: true,
    },
    costPerSec: 0.25,
    bestFor: "Realism",
  },
  {
    id: "fal-ai/veo3",
    name: "Veo 3",
    provider: "Google",
    maxDuration: 8,
    supportedDurations: [5, 6, 7, 8],
    supportedAspectRatios: ["16:9", "9:16"],
    supportsAudio: true,
    consistency: {
      mechanism: "image-to-video",
      endpointId: "fal-ai/veo3/image-to-video",
      maxRefs: 1,
      supportsStartFrame: true,
    },
    costPerSec: 0.40,
    bestFor: "Realism, audio",
  },
];

// ── Scene / Project types ──

export type SceneStatus = "idle" | "queued" | "generating" | "completed" | "failed";

/** Scene role in the ad framework (Hook-Problem-Solution-Proof-CTA) */
export type SceneRole = "hook" | "problem" | "solution" | "proof" | "cta" | "custom";

export interface Scene {
  id: string;
  index: number;
  /** Scene's role in the ad structure — drives prompt style and visual treatment */
  role: SceneRole;
  modelId: string;
  prompt: string;
  duration: number;
  aspectRatio: string;
  /** Per-scene override: which reference types to apply */
  activeReferenceTypes?: ReferenceType[];
  /** Per-scene strength override (null = use project default) */
  strengthOverride?: number | null;
  /** Trim: start point in seconds (0 = beginning) */
  trimStart: number;
  /** Trim: end point in seconds (= duration by default) */
  trimEnd: number;
  /** Voiceover script for this scene */
  voiceoverText: string;
  /** Generated voiceover audio URL */
  audioUrl?: string;
  /** Audio generation status */
  audioStatus?: "idle" | "generating" | "completed" | "failed";
  status: SceneStatus;
  progress: number;
  requestId?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  /** @deprecated Use StyleContext.references instead */
  referenceImageUrl?: string;
}

export interface Project {
  id: string;
  title: string;
  scenes: Scene[];
  aspectRatio: string;
  createdAt: number;
}
