// ── fal.ai model catalog ──

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  maxDuration: number;
  supportedDurations: number[];
  supportsAudio: boolean;
  supportsImg2Vid: boolean;
  costPerSec: number;
  bestFor: string;
}

export const MODEL_CATALOG: ModelInfo[] = [
  { id: "fal-ai/hunyuan-video",                                   name: "HunyuanVideo",    provider: "Tencent",    maxDuration: 5,  supportedDurations: [3, 5],   supportsAudio: false, supportsImg2Vid: false, costPerSec: 0.075, bestFor: "Cheapest, open-source" },
  { id: "fal-ai/minimax/video-01-live",                            name: "MiniMax Live",    provider: "MiniMax",    maxDuration: 6,  supportedDurations: [3, 6],   supportsAudio: false, supportsImg2Vid: true,  costPerSec: 0.10,  bestFor: "Fast, cheap" },
  { id: "fal-ai/wan-25-preview/text-to-video",                    name: "Wan 2.5",         provider: "Alibaba",    maxDuration: 5,  supportedDurations: [3, 5],   supportsAudio: false, supportsImg2Vid: false, costPerSec: 0.05,  bestFor: "Anime, stylized" },
  { id: "fal-ai/kling-video/v2.5-turbo/pro/text-to-video",        name: "Kling 2.5 Turbo", provider: "Kuaishou",   maxDuration: 10, supportedDurations: [5, 10],  supportsAudio: false, supportsImg2Vid: true,  costPerSec: 0.07,  bestFor: "Action, motion" },
  { id: "fal-ai/luma-dream-machine/ray-2",                        name: "Luma Ray 2",      provider: "Luma",       maxDuration: 5,  supportedDurations: [5],      supportsAudio: false, supportsImg2Vid: true,  costPerSec: 0.10,  bestFor: "Dreamy, creative" },
  { id: "fal-ai/bytedance/seedance/v1.5/pro/text-to-video",       name: "Seedance 1.5",    provider: "ByteDance",  maxDuration: 10, supportedDurations: [5, 10],  supportsAudio: true,  supportsImg2Vid: true,  costPerSec: 0.08,  bestFor: "Multi-shot, audio" },
  { id: "fal-ai/veo2",                                            name: "Veo 2",           provider: "Google",     maxDuration: 8,  supportedDurations: [4, 6, 8], supportsAudio: false, supportsImg2Vid: true,  costPerSec: 0.25, bestFor: "Realism" },
  { id: "fal-ai/veo3",                                            name: "Veo 3",           provider: "Google",     maxDuration: 8,  supportedDurations: [4, 6, 8], supportsAudio: true,  supportsImg2Vid: true,  costPerSec: 0.40, bestFor: "Realism, audio" },
];

// ── Scene / Project types ──

export type SceneStatus = "idle" | "queued" | "generating" | "completed" | "failed";

export interface Scene {
  id: string;
  index: number;
  modelId: string;
  prompt: string;
  duration: number;
  aspectRatio: string;
  referenceImageUrl?: string;
  status: SceneStatus;
  progress: number;
  requestId?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

export interface Project {
  id: string;
  title: string;
  scenes: Scene[];
  aspectRatio: string;
  createdAt: number;
}
