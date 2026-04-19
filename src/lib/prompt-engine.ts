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

// ── Site type (mirrors scrape route) ──

export type SiteType = "ecommerce" | "saas" | "app" | "service" | "generic";

export function siteTypeToFamily(siteType: SiteType | undefined): "physical" | "digital" {
  return siteType === "ecommerce" ? "physical" : "digital";
}

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
  /** What kind of site this is — drives template family selection */
  siteType?: SiteType;
  /** Short noun describing the product: "web app", "mobile app", "project management tool" */
  productKind?: string;
  /** Feature bullets — used for voiceover one-liners */
  features?: string[];
  /** Primary CTA button text from the landing page */
  ctaText?: string;
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
/**
 * POSITIVE prompt fidelity — focus on shape/appearance, NOT text.
 * Avoid mentioning "text", "labels", "logos" etc. in the positive prompt
 * because models interpret those words as generation targets.
 */
const PRODUCT_FIDELITY =
  "Product must match the reference image exactly. Preserve product shape, color, proportions, and surface details. Keep the product unaltered throughout the scene.";

/**
 * NEGATIVE prompt — what to AVOID generating.
 * This is passed as `negative_prompt` to models that support it (Kling, Wan, Seedance).
 * Putting text-related words HERE instead of the positive prompt
 * is far more effective at preventing text hallucination.
 */
export const NEGATIVE_PROMPT =
  "text, words, letters, numbers, labels, logos, watermarks, subtitles, captions, writing, brand names, slogans, signs, stamps, badges, stickers, UI elements, blurry, distorted, low quality, deformed, flicker, jitter, morphing, warping, duplicate objects, multiple copies, extra limbs, extra fingers, mirror errors, glitch artifacts, modified product, altered product details, wrong color variant, unnatural proportions, oversaturated, underexposed";

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

type TemplateFamily = "physical" | "digital";

const ROLE_TEMPLATES: Record<TemplateFamily, Record<SceneRole, RoleTemplate[]>> = {
  // Physical products — existing templates (ecommerce)
  physical: {
    hook: [
      {
        subjectAction: (p) => `Extreme close-up of a person's hands lifting ${p.shortName} out of a delivery box, fingers gripping the product clearly`,
        environment: (p) => `clean desk or countertop surface, package tissue paper visible, ${p.visualDescription}`,
        continuityCues: "preserve exact product shape, maintain consistent proportions throughout",
      },
      {
        subjectAction: (p) => `POV shot: a hand reaches toward ${p.shortName} sitting on a table, quick grab motion, then holds it up to camera`,
        environment: (p) => `bright modern kitchen or bathroom counter, morning light, ${p.visualDescription}`,
        continuityCues: "preserve original product appearance exactly, no morphing or warping",
      },
      {
        subjectAction: (p) => `Person scrolling phone stops abruptly, looks up with wide eyes, camera whip-pans to reveal ${p.shortName} on the surface next to them`,
        environment: (p) => `cozy home setting, couch or bed, casual outfit, ${p.visualDescription}`,
        continuityCues: "product appears sharp and in-focus, unaltered from original appearance",
      },
    ],
    problem: [
      {
        subjectAction: (p) => `Person looking frustrated at their current inferior product or situation, sighing, then glancing at ${p.shortName} nearby`,
        environment: () => `everyday setting showing the pain point clearly, slightly messy or imperfect surroundings`,
        continuityCues: "facial expression reads clearly as mild frustration, natural not exaggerated",
      },
      {
        subjectAction: () => `Quick montage: person struggling with an old way of doing things, three rapid cuts showing the inconvenience`,
        environment: () => `realistic everyday environments, bathroom mirror, kitchen counter, desk`,
        continuityCues: "same person across all cuts, consistent clothing and lighting direction",
      },
    ],
    solution: [
      {
        subjectAction: (p) => `Person confidently picks up ${p.shortName} and demonstrates using it, close-up on their hands interacting with the product`,
        environment: (p) => `well-lit lifestyle setting, ${p.visualDescription}, product fills 40-60% of frame during close-up`,
        continuityCues: "preserve exact product appearance from reference, smooth natural hand movements",
      },
      {
        subjectAction: (p) => `Satisfying close-up of ${p.shortName} being opened or activated, then pull back to show person using it with a subtle smile`,
        environment: (p) => `clean surface, ${p.visualDescription}, camera starts tight macro then widens`,
        continuityCues: "product proportions stay consistent between shots, surfaces unaltered",
      },
    ],
    proof: [
      {
        subjectAction: (p) => `Person looking directly at camera, holding ${p.shortName}, nodding with genuine satisfaction, then showing the result`,
        environment: (p) => `natural home or office setting, ${p.visualDescription}, eye-level camera angle`,
        continuityCues: "authentic expression, not over-acted, product visible and unaltered from reference",
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
        continuityCues: "product sharp and well-lit, leave negative space for post-production overlay",
      },
      {
        subjectAction: (p) => `Person holds up ${p.shortName} to camera with a confident smile, product at eye level, natural endorsement pose`,
        environment: (p) => `bright, clean background, ${p.visualDescription}, face and product both in focus`,
        continuityCues: "product and face both sharp, product surface unaltered from reference",
      },
    ],
    custom: [
      {
        subjectAction: (p) => `${p.shortName} shown in use in an authentic setting`,
        environment: (p) => `lifestyle environment appropriate for the product, ${p.visualDescription}`,
        continuityCues: "maintain product appearance consistency",
      },
    ],
  },

  // Digital products — SaaS, mobile apps, services, generic landing pages
  digital: {
    hook: [
      {
        subjectAction: (p) => `POV over-the-shoulder close-up of hands typing on a MacBook, the ${p.shortName} dashboard filling the screen, cursor moving purposefully`,
        environment: (p) => `modern coffee-shop or home-office desk, warm ambient light, coffee cup beside laptop, ${p.visualDescription}`,
        continuityCues: "screen content matches the reference UI exactly, no fake interface elements, laptop bezel visible",
      },
      {
        subjectAction: (p) => `Tight close-up of a phone screen in a person's hands, thumb swipes through the ${p.shortName} app interface, reaction of surprise on the partially-visible face above`,
        environment: (p) => `couch or kitchen counter background soft-focus, daylight from a window, ${p.visualDescription}`,
        continuityCues: "phone UI matches reference screenshot exactly, no hallucinated menu items or fake text",
      },
      {
        subjectAction: (p) => `Person looks directly at camera with a raised eyebrow, says something to the viewer, whip-pan down to their laptop screen already open on ${p.shortName}`,
        environment: (p) => `home workspace, plants and bookshelf softly blurred behind, ${p.visualDescription}`,
        continuityCues: "face stays consistent across the whip-pan, screen content unaltered from reference",
      },
    ],
    problem: [
      {
        subjectAction: () => `Person at their desk looking overwhelmed by a cluttered screen — too many tabs, spreadsheets, sticky notes — head in hands, sighing`,
        environment: () => `messy desk, crumpled paper, coffee rings, afternoon lighting, realistic workplace fatigue`,
        continuityCues: "expression reads as mild frustration not defeat, tabs and windows recognizable as generic work clutter",
      },
      {
        subjectAction: () => `Quick montage: person copying data between three different apps, typing the same info twice, checking a watch in frustration`,
        environment: () => `home office, same person across cuts, repetitive manual-work feel`,
        continuityCues: "same person, same outfit, same room across all cuts",
      },
    ],
    solution: [
      {
        subjectAction: (p) => `Screen recording-style close-up of the ${p.shortName} interface, cursor clicks through a key workflow, smooth transitions between views, subtle zoom on the result`,
        environment: (p) => `pristine screen capture framing, ${p.visualDescription}, the UI is the hero of the shot`,
        continuityCues: "UI elements match reference exactly, no invented buttons or text, cursor movement is deliberate and readable",
      },
      {
        subjectAction: (p) => `Split composition: person's face on the left nodding with satisfaction, ${p.shortName} dashboard on the right showing a task completing or a graph trending up`,
        environment: (p) => `clean home-office setup, ${p.visualDescription}, both halves well-lit`,
        continuityCues: "screen content stays true to reference, face expression natural and believable",
      },
    ],
    proof: [
      {
        subjectAction: (p) => `Person talking directly to camera in a FaceTime-style selfie angle, laptop visible in the lower frame showing ${p.shortName}, gestures at the screen while explaining`,
        environment: (p) => `bedroom or cozy workspace, soft window light, ${p.visualDescription}`,
        continuityCues: "authentic testimonial feel, screen content legible and matches reference",
      },
      {
        subjectAction: (p) => `Before/after split: left side shows frustrating manual work, right side shows the same task done in ${p.shortName} in seconds, timer comparison on top`,
        environment: () => `consistent lighting across both halves, same workspace`,
        continuityCues: "left and right halves cut together cleanly, no flickering UI",
      },
    ],
    cta: [
      {
        subjectAction: (p) => {
          const cta = p.ctaText || "Get started";
          return `Hero end-card: ${p.shortName} logo and dashboard screenshot centered on screen, slow push-in, space above for overlay text "${cta}"`;
        },
        environment: (p) => `clean gradient or blurred desk background, ${p.visualDescription}, minimalist composition`,
        continuityCues: "logo and UI proportions exactly match reference, negative space preserved for post-production text",
      },
      {
        subjectAction: (p) => `Person holds up their laptop screen to the camera, ${p.shortName} open on it, confident smile, end-card composition`,
        environment: (p) => `bright neutral background, ${p.visualDescription}, face and screen both in sharp focus`,
        continuityCues: "screen content unaltered from reference, no glare obscuring UI",
      },
    ],
    custom: [
      {
        subjectAction: (p) => `${p.shortName} shown in use on a laptop or phone in an authentic workspace setting`,
        environment: (p) => `professional but lived-in environment, ${p.visualDescription}`,
        continuityCues: "screen content matches reference UI",
      },
    ],
  },
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
      // Keep short for models that prefer brevity
      const sentences = prompt.split(/\.\s+/);
      return sentences.slice(0, 3).join(". ") + ".";
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
  const family = siteTypeToFamily(product?.siteType);
  const familyTemplates = ROLE_TEMPLATES[family] ?? ROLE_TEMPLATES.physical;
  const templates = familyTemplates[role] ?? familyTemplates.custom;
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
 * Uses entity extraction (category, color, material) for richer prompts.
 */
export function scrapeToProductContext(product: {
  title: string;
  description: string;
  price?: string;
  brand: string;
  images: string[];
  category?: string;
  color?: string;
  material?: string;
  keywords?: string[];
  siteType?: SiteType;
  productKind?: string;
  features?: string[];
  ctaText?: string;
}): ProductContext {
  const name = cleanForPrompt(product.title || "the product");
  // Smart truncation: at word boundary, max ~40 chars
  const shortName = name.length > 40
    ? name.slice(0, name.lastIndexOf(" ", 40)).trim() || name.slice(0, 40)
    : name;
  const desc = product.description || "";
  const siteType: SiteType = product.siteType ?? "ecommerce";

  // Build visual description — branches on siteType (physical vs digital)
  const visualCues = buildVisualDescription(
    name,
    desc,
    siteType,
    product.category,
    product.color,
    product.material,
    product.productKind,
  );

  // Find key benefit — expanded keyword list + first sentence fallback
  const sentences = desc.split(/[.!]/).map((s) => s.trim()).filter((s) => s.length > 10 && s.length < 120);
  const benefitSentence = sentences.find((s) =>
    /easy|fast|comfort|premium|professional|powerful|lightweight|durable|natural|organic|smooth|soft|perfect|convenient|ergonomic|hypoallergenic|weatherproof|antimicrobial|breathable|waterproof|rechargeable|portable|compact|adjustable|versatile|sustainable|saves|automate|automatic|instant|simple|seamless|secure|scalable|unified|collaborative|realtime|real-time|intelligent|smart|productive|efficient/i.test(s),
  );

  // For non-ecommerce, use the first feature bullet as a fallback keyBenefit
  const featureFallback = siteType !== "ecommerce" && product.features && product.features.length > 0
    ? product.features[0]
    : "";

  return {
    name,
    shortName,
    description: desc,
    keyBenefit: benefitSentence || sentences[0] || featureFallback || "",
    price: product.price || "",
    brand: product.brand || "",
    visualDescription: visualCues,
    siteType,
    productKind: product.productKind,
    features: product.features,
    ctaText: product.ctaText,
  };
}

/**
 * Clean a string for use in AI prompts — remove symbols that confuse models.
 */
function cleanForPrompt(s: string): string {
  return s
    .replace(/[®™©°]/g, "")
    .replace(/&reg;/gi, "")
    .replace(/&trade;/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Build a rich visual description from extracted entities.
 * Branches on siteType:
 *   - ecommerce → physical product description (color, material, shape)
 *   - saas/app/service/generic → interface description (device kind, UI hint)
 */
function buildVisualDescription(
  name: string,
  desc: string,
  siteType: SiteType,
  category?: string,
  color?: string,
  material?: string,
  productKind?: string,
): string {
  // Digital products: describe the interface + device, not color/material
  if (siteType !== "ecommerce") {
    return buildDigitalVisualDescription(name, desc, siteType, productKind);
  }

  const parts: string[] = [];

  // Color from entity extraction (best) or keyword fallback
  if (color) {
    parts.push(color.toLowerCase());
  } else {
    const combined = `${name} ${desc}`.toLowerCase();
    const colorWords = ["black", "white", "red", "blue", "green", "gold", "silver", "pink", "brown", "navy", "grey", "gray", "beige", "olive", "coral", "teal"];
    const found = colorWords.filter((c) => combined.includes(c));
    if (found.length > 0) parts.push(found.slice(0, 2).join(" and "));
  }

  // Material from entity extraction or keyword fallback
  if (material) {
    parts.push(material.toLowerCase());
  } else {
    const combined = `${name} ${desc}`.toLowerCase();
    const materialWords = ["glass", "plastic", "metal", "wood", "ceramic", "leather", "fabric", "paper", "cardboard", "silicone", "rubber", "stainless steel", "aluminum", "cotton", "nylon", "canvas"];
    const found = materialWords.find((m) => combined.includes(m));
    if (found) parts.push(found);
  }

  // Category/shape from entity extraction or keyword fallback
  if (category) {
    parts.push(category.toLowerCase());
  } else {
    const combined = `${name} ${desc}`.toLowerCase();
    const shapeWords = ["bottle", "box", "tube", "jar", "can", "pouch", "bar", "stick", "pump", "spray", "dropper", "packet", "bag", "backpack", "umbrella", "shoe", "watch", "phone", "tablet", "headphones", "earbuds", "camera"];
    const found = shapeWords.find((s) => combined.includes(s));
    if (found) parts.push(found);
    else parts.push("product");
  }

  return parts.join(" ") + ", matching the reference image exactly";
}

/**
 * Build a visual description for digital products (SaaS / apps / services).
 * Focuses on the device + interface kind, not physical attributes.
 */
function buildDigitalVisualDescription(
  name: string,
  desc: string,
  siteType: SiteType,
  productKind?: string,
): string {
  const kind = productKind?.toLowerCase() ?? "";
  const combined = `${name} ${desc}`.toLowerCase();

  // Decide device kind
  let device: string;
  if (siteType === "app") {
    device = "mobile app interface on a phone screen";
  } else if (siteType === "saas") {
    device = "web dashboard interface on a laptop screen";
  } else if (siteType === "service") {
    device = "landing page in a browser on a laptop screen";
  } else if (kind.includes("mobile") || kind.includes("ios") || kind.includes("android") || combined.includes("app store")) {
    device = "mobile app interface on a phone screen";
  } else {
    // generic — default to laptop browser
    device = "landing page in a browser on a laptop screen";
  }

  // Extract a short descriptive phrase from the description (first 80 chars at word boundary)
  const cleanedDesc = desc.replace(/\s+/g, " ").trim();
  const shortPhrase = cleanedDesc.length > 0
    ? (cleanedDesc.length > 80
        ? cleanedDesc.slice(0, cleanedDesc.lastIndexOf(" ", 80)).trim() || cleanedDesc.slice(0, 80)
        : cleanedDesc)
    : "";

  const parts = [device];
  if (shortPhrase) parts.push(shortPhrase);
  parts.push("UI matches reference screenshot exactly");

  return parts.join(", ");
}

// Old extractVisualCues removed — replaced by buildVisualDescription with entity support
