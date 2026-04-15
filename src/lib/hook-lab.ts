import { MODEL_CATALOG, type Scene, type ModelInfo } from "@/types";
import {
  buildScenePrompt,
  scrapeToProductContext,
  getStylePrefix,
  type ProductContext,
} from "@/lib/prompt-engine";
import { generateProductStoryboard, type ProductData } from "@/lib/storyboard-generator";

// ── Hook Styles (shared with BatchPanel) ──

export interface HookStyle {
  id: string;
  label: string;
  emoji: string;
  /** Prompt template — {product} is replaced with the product name */
  template: string;
}

export const HOOK_STYLES: HookStyle[] = [
  {
    id: "surprise",
    label: "Surprise",
    emoji: "😲",
    template: "A person excitedly unboxing {product}, eyes wide with delight, fast camera movement, bright energetic lighting",
  },
  {
    id: "problem",
    label: "Problem",
    emoji: "😤",
    template: "Person visibly frustrated with their current solution, sighing, then notices {product} nearby, slow realization moment",
  },
  {
    id: "pov",
    label: "POV",
    emoji: "👀",
    template: "POV shot: hands reach into frame toward {product} sitting on a surface, quick grab motion, holds it up to camera",
  },
  {
    id: "asmr",
    label: "ASMR",
    emoji: "🤫",
    template: "Extreme satisfying close-up of {product} details and textures, slow rotation, macro lens, soft ambient lighting",
  },
  {
    id: "testimonial",
    label: "Testimonial",
    emoji: "🗣️",
    template: "Person looking directly at camera, holding {product}, genuine excited expression, natural home setting, UGC selfie style",
  },
  {
    id: "trending",
    label: "Trending",
    emoji: "🔥",
    template: "Quick montage cuts: {product} in different settings and angles, fast-paced transitions, social media trend energy",
  },
  {
    id: "luxury",
    label: "Luxury",
    emoji: "✨",
    template: "Cinematic slow reveal of {product} emerging from elegant packaging, dramatic lighting, premium feel, shallow depth of field",
  },
  {
    id: "comedy",
    label: "Comedy",
    emoji: "😂",
    template: "Person doing something the hard way, struggling comically, then {product} appears as the obvious solution, comedic timing",
  },
];

// ── Budget Models (cheapest for hook testing) ──

export const BUDGET_MODELS: ModelInfo[] = MODEL_CATALOG
  .filter((m) => m.supportedDurations.includes(3) || m.supportedDurations.includes(5))
  .sort((a, b) => a.costPerSec - b.costPerSec)
  .slice(0, 3);

// ── Types ──

export interface HookVariation {
  id: string;
  hookStyleId: string;
  hookStyleLabel: string;
  hookStyleEmoji: string;
  modelId: string;
  modelName: string;
  prompt: string;
  duration: number;
  aspectRatio: string;
  estimatedCost: number;
  status: "idle" | "generating" | "completed" | "failed";
  videoUrl?: string;
  error?: string;
}

export interface HookLabConfig {
  selectedStyles: string[];
  selectedModels: string[];
  aspectRatio: string;
}

// ── Plan hook variations (no API calls) ──

export function planHookVariations(
  product: ProductData,
  config: HookLabConfig,
): HookVariation[] {
  const productCtx = scrapeToProductContext(product);
  const productName = productCtx.shortName;
  const prefix = getStylePrefix("ugc", "hook");

  const variations: HookVariation[] = [];

  for (const styleId of config.selectedStyles) {
    const style = HOOK_STYLES.find((s) => s.id === styleId);
    if (!style) continue;

    for (const modelId of config.selectedModels) {
      const model = MODEL_CATALOG.find((m) => m.id === modelId);
      if (!model) continue;

      // Pick shortest duration this model supports (cheapest)
      const duration = model.supportedDurations[0];

      // Build prompt: style template with product name + visual description + UGC hook prefix
      const productWithVisual = productCtx.visualDescription
        ? `${productName} (${productCtx.visualDescription})`
        : productName;
      const styledPrompt = style.template.replace(/\{product\}/g, productWithVisual);
      const fullPrompt = `${prefix.visualStyle}. ${styledPrompt}. ${prefix.cameraFeel}, ${prefix.lighting}. ${prefix.fidelity}.`;

      variations.push({
        id: `hook-${styleId}-${model.name.replace(/\s+/g, "-").toLowerCase()}`,
        hookStyleId: styleId,
        hookStyleLabel: style.label,
        hookStyleEmoji: style.emoji,
        modelId: model.id,
        modelName: model.name,
        prompt: fullPrompt,
        duration,
        aspectRatio: config.aspectRatio,
        estimatedCost: Math.round(model.costPerSec * duration * 100) / 100,
        status: "idle",
      });
    }
  }

  return variations;
}

// ── Cost estimation ──

export function estimateHookLabCost(variations: HookVariation[]): number {
  return Math.round(variations.reduce((s, v) => s + v.estimatedCost, 0) * 100) / 100;
}

// ── Expand winning hook into full storyboard ──

export function expandHookToStoryboard(
  hook: HookVariation,
  product: ProductData,
): Omit<Scene, "id">[] {
  // Generate the standard 4-scene storyboard
  const storyboard = generateProductStoryboard(product);

  // Replace scene 0 (the hook) with the winning hook's data
  if (storyboard[0]) {
    storyboard[0] = {
      ...storyboard[0],
      modelId: hook.modelId,
      prompt: hook.prompt,
      duration: hook.duration,
      trimEnd: hook.duration,
      // Mark as completed since we already have the video
      status: "completed" as const,
      progress: 100,
      videoUrl: hook.videoUrl,
    };
  }

  return storyboard;
}
