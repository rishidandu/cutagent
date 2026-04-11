/**
 * Prompt Engine — generates model-optimized prompts for each scene role.
 *
 * Architecture:
 * 1. Style-locked prefix (same across ALL scenes for visual consistency)
 * 2. Role-specific visual direction (hook=pattern interrupt, proof=authenticity, etc.)
 * 3. Product context (name, key features, visual cues)
 * 4. Model-specific formatting (Kling likes detail, MiniMax likes brevity)
 *
 * Formula: [Style Prefix] + [Subject+Action] + [Environment+Context] + [Camera+Lighting+Style]
 */

import type { SceneRole } from "@/types";

// ── Product context passed from scrape ──

export interface ProductContext {
  name: string;
  shortName: string;
  description: string;
  keyBenefit: string;
  price: string;
  brand: string;
  /** The visual appearance of the product for prompt grounding */
  visualDescription: string;
}

// ── Style prefix system ──

export interface StylePrefix {
  /** Visual style locked across all scenes */
  visualStyle: string;
  /** Camera feel locked across all scenes */
  cameraFeel: string;
  /** Lighting locked across all scenes */
  lighting: string;
  /** Product fidelity rules — prevent hallucinated text/labels */
  fidelity: string;
}

/**
 * Anti-hallucination fidelity rules.
 * These are appended to EVERY prompt to prevent models from adding
 * fake text, logos, labels, or branding to products.
 */
const PRODUCT_FIDELITY = [
  "CRITICAL: Do NOT add, modify, or generate any text, labels, logos, or writing on the product",
  "The product must appear EXACTLY as it looks in the reference image with no alterations",
  "Do not invent brand names, slogans, or decorative text on any surface",
  "Keep all product surfaces, packaging, and labels identical to the original",
  "No floating text, watermarks, or overlaid graphics in the scene",
].join(". ");

export type AdStyle = "ugc" | "studio" | "custom";

/**
 * Role-specific visual treatments.
 *
 * Each scene role gets a DIFFERENT energy, camera style, and lighting
 * so the ad has visual contrast and rhythm — not 4 identical-looking clips.
 *
 * Hook:     Fast, energetic, pattern interrupt — grabs attention
 * Problem:  Raw, relatable, slightly messy — viewer identifies with the pain
 * Solution: Clean, satisfying, product-focused — the "aha" moment
 * Proof:    Warm, authentic, trust-building — social proof / testimonial feel
 * CTA:      Polished, minimal, hero shot — clean composition for text overlay
 */
const UGC_ROLE_STYLES: Record<SceneRole, StylePrefix> = {
  hook: {
    visualStyle: "Fast-paced social media hook, high energy, pattern interrupt, iPhone footage aesthetic",
    cameraFeel: "quick handheld movement, snap zoom, dynamic angle shifts, slightly shaky for urgency",
    lighting: "bright punchy lighting, high contrast, attention-grabbing",
    fidelity: PRODUCT_FIDELITY,
  },
  problem: {
    visualStyle: "Relatable everyday moment, raw authentic footage, slightly imperfect framing",
    cameraFeel: "static or slow handheld, voyeuristic angle, documentary feel",
    lighting: "flat natural indoor lighting, slightly unflattering, real-life feel",
    fidelity: PRODUCT_FIDELITY,
  },
  solution: {
    visualStyle: "Satisfying product reveal, clean and focused, the transformation moment",
    cameraFeel: "smooth slow push-in or orbit, shallow depth of field isolating the product, ASMR-satisfying pacing",
    lighting: "warm golden hour or soft window light, product glows, inviting tones",
    fidelity: PRODUCT_FIDELITY,
  },
  proof: {
    visualStyle: "Authentic testimonial moment, genuine reaction, trust-building social proof",
    cameraFeel: "eye-level static shot or subtle handheld, direct-to-camera framing like a FaceTime call",
    lighting: "natural warm lighting, home environment, soft and approachable",
    fidelity: PRODUCT_FIDELITY,
  },
  cta: {
    visualStyle: "Clean hero product shot, minimal composition, premium end-frame for ad",
    cameraFeel: "very slow controlled dolly push-in, locked off tripod feel, cinematic",
    lighting: "elevated studio-quality lighting even in lifestyle setting, product perfectly lit",
    fidelity: PRODUCT_FIDELITY,
  },
  custom: {
    visualStyle: "Social media content, authentic modern aesthetic",
    cameraFeel: "handheld camera with natural movement",
    lighting: "natural soft lighting",
    fidelity: PRODUCT_FIDELITY,
  },
};

const STUDIO_ROLE_STYLES: Record<SceneRole, StylePrefix> = {
  hook: {
    visualStyle: "Cinematic commercial opener, dramatic reveal, high production value",
    cameraFeel: "sweeping crane or drone shot, dramatic dolly zoom, fast editorial cuts",
    lighting: "dramatic rim lighting with lens flare, high contrast, theatrical",
    fidelity: PRODUCT_FIDELITY,
  },
  problem: {
    visualStyle: "Stylized comparison shot, editorial contrast, before-state",
    cameraFeel: "locked tripod, clean geometric framing, symmetrical",
    lighting: "cool desaturated tones, clinical feel",
    fidelity: PRODUCT_FIDELITY,
  },
  solution: {
    visualStyle: "Premium product photography in motion, luxury feel, hero moment",
    cameraFeel: "smooth 360 orbit or controlled slider, macro to wide pull-back",
    lighting: "studio key light with soft fill, product highlights sharp, gradient background",
    fidelity: PRODUCT_FIDELITY,
  },
  proof: {
    visualStyle: "Polished testimonial setup, professional but warm, trust-building",
    cameraFeel: "medium close-up, subtle rack focus between person and product",
    lighting: "warm three-point lighting, interview-style, background slightly blurred",
    fidelity: PRODUCT_FIDELITY,
  },
  cta: {
    visualStyle: "Luxury end-card composition, minimal and elegant, magazine-ad quality",
    cameraFeel: "very slow push-in on product, completely locked off, no shake",
    lighting: "clean studio lighting, pure white or dark gradient background, product perfectly exposed",
    fidelity: PRODUCT_FIDELITY,
  },
  custom: {
    visualStyle: "Professional commercial, clean polished look",
    cameraFeel: "smooth cinematic camera movement",
    lighting: "studio lighting with soft shadows",
    fidelity: PRODUCT_FIDELITY,
  },
};

/**
 * Get the style prefix for a specific scene role and ad style.
 */
export function getStylePrefix(style: AdStyle, role: SceneRole = "custom"): StylePrefix {
  const styles = style === "studio" ? STUDIO_ROLE_STYLES : UGC_ROLE_STYLES;
  return styles[role] ?? styles.custom;
}

// ── Role-specific prompt templates ──

interface RoleTemplate {
  /** What the subject is doing — the core visual */
  subjectAction: (product: ProductContext) => string;
  /** Environment and context details */
  environment: (product: ProductContext) => string;
  /** Continuity cues to prevent AI morphing/warping */
  continuityCues: string;
}

const ROLE_TEMPLATES: Record<SceneRole, RoleTemplate[]> = {
  hook: [
    {
      subjectAction: (p) => `Extreme close-up of a person's hands lifting ${p.shortName} out of a delivery box, fingers gripping the product clearly`,
      environment: (p) => `clean desk or countertop surface, package tissue paper visible, ${p.visualDescription}`,
      continuityCues: "preserve exact product shape, do NOT add or change any text or labels on the product, maintain consistent proportions",
    },
    {
      subjectAction: (p) => `POV shot: a hand reaches toward ${p.shortName} sitting on a table, quick grab motion, then holds it up to camera`,
      environment: (p) => `bright modern kitchen or bathroom counter, morning light, ${p.visualDescription}`,
      continuityCues: "do NOT generate fake text or labels on product, preserve original product appearance exactly, no morphing",
    },
    {
      subjectAction: (p) => `Person scrolling phone stops abruptly, looks up with wide eyes, camera whip-pans to reveal ${p.shortName} on the surface next to them`,
      environment: (p) => `cozy home setting, couch or bed, casual outfit, ${p.visualDescription}`,
      continuityCues: "product appears sharp and in-focus, do NOT alter product surface or add any text/logos not in original",
    },
  ],

  problem: [
    {
      subjectAction: (p) => `Person looking frustrated at their current inferior product or situation, sighing, then glancing at ${p.shortName} nearby`,
      environment: (p) => `everyday setting showing the pain point clearly, slightly messy or imperfect surroundings`,
      continuityCues: "facial expression reads clearly as mild frustration, natural not exaggerated",
    },
    {
      subjectAction: (p) => `Quick montage: person struggling with an old way of doing things, three rapid cuts showing the inconvenience`,
      environment: () => `realistic everyday environments, bathroom mirror, kitchen counter, desk`,
      continuityCues: "same person across all cuts, consistent clothing and lighting direction",
    },
  ],

  solution: [
    {
      subjectAction: (p) => `Person confidently picks up ${p.shortName} and demonstrates using it, close-up on their hands interacting with the product`,
      environment: (p) => `well-lit lifestyle setting, ${p.visualDescription}, product fills 40-60% of frame during close-up`,
      continuityCues: "preserve exact product appearance from reference, do NOT add invented text or logos, smooth natural hand movements",
    },
    {
      subjectAction: (p) => `Satisfying close-up of ${p.shortName} being opened or activated, then pull back to show person using it with a subtle smile`,
      environment: (p) => `clean surface, ${p.visualDescription}, camera starts tight macro then widens`,
      continuityCues: "product proportions stay consistent, do NOT alter or add text/branding on any product surface",
    },
  ],

  proof: [
    {
      subjectAction: (p) => `Person looking directly at camera, holding ${p.shortName}, nodding with genuine satisfaction, then showing the result`,
      environment: (p) => `natural home or office setting, ${p.visualDescription}, eye-level camera angle`,
      continuityCues: "authentic expression, not over-acted, product visible and unaltered, no invented text on product",
    },
    {
      subjectAction: (p) => `Before and after comparison: left side shows the old way, right side shows the result with ${p.shortName}`,
      environment: () => `split composition or sequential comparison, same lighting on both sides`,
      continuityCues: "consistent lighting direction so comparison reads as genuine",
    },
  ],

  cta: [
    {
      subjectAction: (p) => `${p.shortName} centered in frame on a clean surface, camera slowly pushing in, product is hero`,
      environment: (p) => `minimalist surface, ${p.visualDescription}, space left for text overlay on top third of frame`,
      continuityCues: "product sharp and well-lit, do NOT render text ON the product that isn't in the original, leave negative space for post-production text overlay",
    },
    {
      subjectAction: (p) => `Person holds up ${p.shortName} to camera with a confident smile, product at eye level, natural endorsement pose`,
      environment: (p) => `bright, clean background, ${p.visualDescription}, face and product both in focus`,
      continuityCues: "product and face both sharp, product surface unaltered from reference, no hallucinated text or logos",
    },
  ],

  custom: [
    {
      subjectAction: (p) => `${p.shortName} shown in use in an authentic setting`,
      environment: (p) => `lifestyle environment appropriate for the product, ${p.visualDescription}`,
      continuityCues: "maintain product appearance consistency",
    },
  ],
};

// ── Model-specific prompt formatting ──

type ModelPromptStyle = "detailed" | "concise" | "structured";

function getModelPromptStyle(modelId: string): ModelPromptStyle {
  if (modelId.includes("kling")) return "detailed";     // Kling handles complex layered prompts well
  if (modelId.includes("minimax")) return "concise";     // MiniMax works best with short single-action prompts
  if (modelId.includes("veo")) return "structured";      // Veo likes clean structured descriptions
  if (modelId.includes("wan")) return "concise";          // Wan prefers simpler prompts
  if (modelId.includes("seedance")) return "detailed";   // Seedance handles detail well
  if (modelId.includes("luma")) return "concise";         // Luma Ray prefers brevity
  if (modelId.includes("hunyuan")) return "concise";     // HunyuanVideo — simpler is better
  return "detailed";
}

function formatForModel(prompt: string, modelId: string): string {
  const style = getModelPromptStyle(modelId);

  switch (style) {
    case "concise": {
      // Keep short for models that prefer brevity, but ALWAYS include the no-text rule
      const sentences = prompt.split(/\.\s+/);
      const core = sentences.slice(0, 3).join(". ") + ".";
      return `${core} Do NOT add any text, labels, or logos onto the product.`;
    }

    case "structured":
      // Veo-style: clean and separated
      return prompt;

    case "detailed":
    default:
      // Full prompt with all details
      return prompt;
  }
}

// ── Main prompt builder ──

/**
 * Build an optimized prompt for a scene given its role, product context, and model.
 */
export function buildScenePrompt(
  role: SceneRole,
  product: ProductContext | null,
  modelId: string,
  adStyle: AdStyle = "ugc",
  customPrompt?: string,
): string {
  // If user wrote their own prompt, respect it but prepend style + fidelity
  if (customPrompt?.trim()) {
    const prefix = getStylePrefix(adStyle, role);
    return formatForModel(
      `${prefix.visualStyle}. ${customPrompt}. ${prefix.cameraFeel}, ${prefix.lighting}. ${prefix.fidelity}.`,
      modelId,
    );
  }

  const prefix = getStylePrefix(adStyle, role);
  const templates = ROLE_TEMPLATES[role] ?? ROLE_TEMPLATES.custom;
  const template = templates[Math.floor(Math.random() * templates.length)];

  const p: ProductContext = product ?? {
    name: "the product",
    shortName: "the product",
    description: "",
    keyBenefit: "",
    price: "",
    brand: "",
    visualDescription: "a product shown clearly",
  };

  const parts = [
    prefix.visualStyle,
    template.subjectAction(p),
    template.environment(p),
    `${prefix.cameraFeel}, ${prefix.lighting}`,
    template.continuityCues,
    prefix.fidelity,
  ];

  return formatForModel(parts.join(". ") + ".", modelId);
}

/**
 * Extract a ProductContext from scrape data for prompt building.
 */
export function scrapeToProductContext(product: {
  title: string;
  description: string;
  price: string;
  brand: string;
  images: string[];
}): ProductContext {
  const name = product.title || "the product";
  const shortName = name.length > 35 ? name.slice(0, 35) : name;
  const desc = product.description || "";

  // Extract a concise visual description from the product name/description
  const visualCues = extractVisualCues(name, desc);

  // Find key benefit
  const sentences = desc.split(/[.!]/).map((s) => s.trim()).filter((s) => s.length > 10 && s.length < 100);
  const benefitSentence = sentences.find((s) =>
    /easy|fast|comfort|premium|professional|powerful|lightweight|durable|natural|organic|smooth|soft|perfect|convenient/i.test(s),
  );

  return {
    name,
    shortName,
    description: desc,
    keyBenefit: benefitSentence || sentences[0] || "",
    price: product.price || "",
    brand: product.brand || "",
    visualDescription: visualCues,
  };
}

/**
 * Extract visual cues from product name and description for prompt grounding.
 * e.g. "matte black bottle with gold label" or "small rectangular box with colorful packaging"
 */
function extractVisualCues(name: string, description: string): string {
  const combined = `${name} ${description}`.toLowerCase();

  const colors: string[] = [];
  const colorWords = ["black", "white", "red", "blue", "green", "gold", "silver", "pink", "brown", "matte", "glossy", "transparent", "clear"];
  for (const c of colorWords) {
    if (combined.includes(c)) colors.push(c);
  }

  const materials: string[] = [];
  const materialWords = ["glass", "plastic", "metal", "wood", "ceramic", "leather", "fabric", "paper", "cardboard"];
  for (const m of materialWords) {
    if (combined.includes(m)) materials.push(m);
  }

  const shapes: string[] = [];
  const shapeWords = ["bottle", "box", "tube", "jar", "can", "pouch", "bar", "stick", "pump", "spray", "dropper", "packet"];
  for (const s of shapeWords) {
    if (combined.includes(s)) shapes.push(s);
  }

  const parts: string[] = [];
  if (colors.length > 0) parts.push(colors.slice(0, 2).join(" and "));
  if (shapes.length > 0) parts.push(shapes[0]);
  else parts.push("product");
  if (materials.length > 0) parts.push(`(${materials[0]})`);

  // Do NOT say "with visible branding" — that triggers models to hallucinate text
  return parts.join(" ") + ", matching reference image exactly";
}
