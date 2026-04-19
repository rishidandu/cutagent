import { MODEL_CATALOG, type Scene, type SceneRole } from "@/types";
import {
  buildScenePrompt,
  scrapeToProductContext,
  type ProductContext,
  type SiteType,
} from "@/lib/prompt-engine";

/**
 * Product data extracted from a URL scrape.
 * Mirrors the shape returned by /api/scrape.
 */
export interface ProductData {
  title: string;
  description: string;
  /** Optional because non-ecommerce pages may not have a price */
  price?: string;
  images: string[];
  brand: string;
  source: string;
  /** What kind of site this came from — drives voiceover angle + templates */
  siteType?: SiteType;
  category?: string;
  color?: string;
  material?: string;
  keywords?: string[];
  /** Short noun for the product ("mobile app", "dashboard", etc.) */
  productKind?: string;
  /** Feature bullets extracted from landing page */
  features?: string[];
  /** Primary CTA button text */
  ctaText?: string;
  /** Pricing tier labels (e.g. "Free", "Pro $20/mo") */
  pricingTiers?: string[];
  /** Screenshot image URLs filtered from the page */
  screenshotUrls?: string[];
}

/**
 * Ad structure definition — maps scene roles to recommended models.
 * Each role has a purpose and a preferred model characteristic.
 */
const AD_STRUCTURE: {
  role: SceneRole;
  modelPref: string;
  modelFallback: string;
}[] = [
  { role: "hook",     modelPref: "Kling 2.5 Turbo", modelFallback: "Seedance 1.5" },  // Motion + energy
  { role: "solution", modelPref: "Kling 2.5 Turbo", modelFallback: "Veo 2" },        // Detail + clarity
  { role: "proof",    modelPref: "Kling 2.5 Turbo", modelFallback: "Seedance 1.5" }, // Authenticity (was MiniMax — too low quality)
  { role: "cta",      modelPref: "Veo 2",            modelFallback: "Luma Ray 2" },   // Realism + premium hero shot (was Seedance — overkill)
];

/**
 * Generate a 4-scene ad storyboard from product data using the prompt engine.
 */
export function generateProductStoryboard(
  product: ProductData,
  aspectRatio: string = "9:16",
): Omit<Scene, "id">[] {
  const productCtx = scrapeToProductContext(product);

  // First pass: resolve models and durations for each scene
  const scenePlan = AD_STRUCTURE.map((s) => {
    const model = findModel(s.modelPref) ?? findModel(s.modelFallback) ?? MODEL_CATALOG[0];
    // Duration strategy per role:
    // - Hook: medium (needs time for pattern interrupt payoff, not too rushed)
    // - Solution: longer (product reveal needs breathing room)
    // - Proof: medium (authentic moment)
    // - CTA: longer (slow cinematic push-in, premium feel)
    const durations = model.supportedDurations;
    let dur: number;
    if (s.role === "hook") {
      dur = durations.length > 1 ? durations[1] : durations[0]; // 2nd shortest (usually 5s)
    } else if (s.role === "solution" || s.role === "cta") {
      dur = durations[Math.min(durations.length - 1, 1)]; // longest available (or 2nd)
    } else {
      dur = durations.length > 1 ? durations[1] : durations[0]; // medium
    }
    return { ...s, model, duration: dur };
  });

  // Build duration map for voiceover word budgets
  const durationMap: Record<string, number> = {};
  for (const s of scenePlan) {
    durationMap[s.role] = s.duration;
  }

  // Build voiceovers with awareness of scene durations
  const voiceovers = buildVoiceovers(productCtx, durationMap);

  return scenePlan.map((s, i) => {
    const prompt = buildScenePrompt(s.role, productCtx, s.model.id, "ugc");
    const voKey = s.role as keyof typeof voiceovers;
    const vo = voiceovers[voKey] ?? "";

    return {
      index: i,
      role: s.role,
      modelId: s.model.id,
      prompt,
      duration: s.duration,
      aspectRatio,
      trimStart: 0,
      trimEnd: s.duration,
      voiceoverText: vo,
      status: "idle" as const,
      progress: 0,
    };
  });
}

// ── Voiceover builders ──

/**
 * Word budget per scene based on duration.
 * Natural speech ≈ 2.8 words/sec. We target 80% of capacity for breathing room.
 *
 * 3s scene → 6 words max
 * 5s scene → 11 words max
 * 6s scene → 13 words max
 * 8s scene → 18 words max
 * 10s scene → 22 words max
 */
function wordBudget(durationSec: number): number {
  return Math.floor(durationSec * 2.8 * 0.8);
}

/**
 * Truncate text to fit within a word budget, keeping it at a sentence boundary.
 */
function truncateToWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  const truncated = words.slice(0, maxWords).join(" ");
  // End at a natural boundary
  return truncated.replace(/[,\s]+$/, "") + ".";
}

/**
 * Build voiceovers as a NARRATIVE ARC with HARD WORD BUDGETS per scene.
 *
 * Each voiceover is written to fit within the scene's duration at natural
 * speaking pace (~2.8 words/sec). Scenes get durations assigned based on
 * how much dialogue they need.
 *
 * Picks a random "ad angle" so different imports produce different stories.
 */
function buildVoiceovers(
  p: ProductContext,
  sceneDurations: Record<string, number>,
): Record<string, string> {
  // Clean product name for voiceover — strip symbols, keep punchy (max 4 words)
  const cleanName = p.shortName.replace(/[®™©°|]/g, "").replace(/\s+/g, " ").trim();
  const name = cleanName.split(/\s+/).length > 4
    ? cleanName.split(/\s+/).slice(0, 4).join(" ")
    : cleanName;

  // Extract a short benefit phrase from the description for use in VO
  const benefit = p.keyBenefit
    ? p.keyBenefit.split(/[.!]/)[0].trim().slice(0, 60)
    : "";

  type AdAngle = { hook: string; solution: string; proof: string; cta: string };

  // A short feature phrase (used by digital angles) — prefer first feature, fall back to benefit
  const feature = p.features && p.features.length > 0
    ? p.features[0].replace(/[.!]$/, "").slice(0, 50)
    : benefit || "everything you need";

  // Physical product angles (ecommerce)
  const PHYSICAL_ANGLES: AdAngle[] = [
    // Convenience — uses benefit
    {
      hook: "Okay I have to show you this.",
      solution: benefit ? `This is ${name}. ${benefit}.` : `This is ${name}. And it just works.`,
      proof: "Been using it a week. Not going back.",
      cta: `${name}. Link in bio.`,
    },
    // Quality — uses benefit
    {
      hook: "You can tell the second you hold it.",
      solution: benefit ? `${name}. ${benefit}.` : `${name}. Built different.`,
      proof: "The quality is insane. Look at that.",
      cta: `Get yours${p.price ? ` for ${p.price}` : ""}. Trust me.`,
    },
    // Social proof
    {
      hook: "There's a reason this keeps selling out.",
      solution: benefit ? `Meet ${name}. ${benefit}.` : `Meet ${name}. Now you see why.`,
      proof: "Everyone I show this to wants one.",
      cta: `Don't sleep on ${name}. Link below.`,
    },
    // Value
    {
      hook: `${p.price ? `Only ${p.price}.` : "This price?"} I had to try it.`,
      solution: benefit ? `${name}. ${benefit}.` : `${name}. All of this at this price.`,
      proof: "Outperforms stuff twice the cost.",
      cta: `Grab ${name} while you can. Link in bio.`,
    },
    // Unboxing
    {
      hook: "Wait till you see what just arrived.",
      solution: `It's ${name}. Even better in person.`,
      proof: "The packaging, the feel. Premium.",
      cta: `You need this. Go grab it.`,
    },
  ];

  // Digital angles — SaaS / apps / services / landing pages
  const ctaBase = p.ctaText ? p.ctaText.replace(/\.$/, "") : "Link in bio";
  const DIGITAL_ANGLES: AdAngle[] = [
    // Productivity
    {
      hook: "This tool saved me like five hours this week.",
      solution: `${name}. ${feature}.`,
      proof: "Can't believe I was doing this manually.",
      cta: `${ctaBase}. ${name}.`,
    },
    // Problem-solve
    {
      hook: "If you've ever struggled with this, watch.",
      solution: `${name} handles ${feature}.`,
      proof: "Finally, something that just works.",
      cta: `${ctaBase}. Try it.`,
    },
    // Time-save
    {
      hook: "Wait. This does it in ten seconds?",
      solution: `Meet ${name}. ${feature}.`,
      proof: "I've been sleeping on this for months.",
      cta: `${name}. ${ctaBase}.`,
    },
    // Discovery
    {
      hook: "Okay you need to know about this.",
      solution: `${name}. ${feature}.`,
      proof: "Already told three friends.",
      cta: `${ctaBase}. Link below.`,
    },
    // Before/after
    {
      hook: "My workflow before vs after this tool.",
      solution: `${name}. Everything in one place.`,
      proof: "Night and day difference.",
      cta: `${name}. ${ctaBase}.`,
    },
  ];

  const angles = p.siteType && p.siteType !== "ecommerce" ? DIGITAL_ANGLES : PHYSICAL_ANGLES;
  const angle = angles[Math.floor(Math.random() * angles.length)];

  // Enforce word budgets per scene
  const hookBudget = wordBudget(sceneDurations.hook ?? 5);
  const solutionBudget = wordBudget(sceneDurations.solution ?? 5);
  const proofBudget = wordBudget(sceneDurations.proof ?? 5);
  const ctaBudget = wordBudget(sceneDurations.cta ?? 5);

  return {
    hook: truncateToWords(angle.hook, hookBudget),
    problem: "", // Problem scene = visual storytelling only
    solution: truncateToWords(angle.solution, solutionBudget),
    proof: truncateToWords(angle.proof, proofBudget),
    cta: truncateToWords(angle.cta, ctaBudget),
  };
}

// ── Helpers ──

function findModel(name: string) {
  return MODEL_CATALOG.find((m) => m.name === name);
}

/**
 * Build a style brief string for a product that's passed to every scene's
 * prompt/generation so all scenes share the same visual DNA.
 *
 * Branches on siteType:
 *   - ecommerce → physical-product-hands-holding-it brief
 *   - digital (saas/app/service/generic) → device-with-interface-on-screen brief
 *
 * Falls back to ecommerce for legacy saved projects without a siteType.
 */
export function buildStyleBrief(product: ProductData): string {
  const title = product.title || "the product";
  const description = product.description || "";
  const shortDesc = description.length > 400 ? description.slice(0, 400) : description;
  const siteType: SiteType = product.siteType ?? "ecommerce";
  const isDigital = siteType !== "ecommerce";

  const visualCore = isDigital
    ? `The app or interface must be clearly visible on a device screen (laptop or phone) — UI content matches the reference screenshot exactly, no invented buttons, menus, or text.`
    : `The product must be clearly visible and unaltered throughout every scene — preserve its exact shape, color, proportions, and surface details from the reference image.`;

  const actorCue = isDigital
    ? `The person on camera must be interacting with the interface on a laptop or phone — hands typing, thumb swiping, cursor clicking. Screen content matches the reference exactly.`
    : `The person on camera must be holding or interacting with this specific product — not a similar product, not a different variant.`;

  const continuity = isDigital
    ? `Keep the UI, logo, and brand name consistent across all scenes. Avoid fake screens, hallucinated dashboards, or unrelated interfaces.`
    : `Keep packaging, labels, logo, and color consistent across all scenes. Avoid generic stock imagery of similar items.`;

  const parts = [
    `Product: ${title}.`,
    shortDesc ? `About: ${shortDesc}.` : "",
    visualCore,
    actorCue,
    continuity,
  ].filter(Boolean);

  return parts.join(" ");
}

/**
 * Given an existing storyboard, generate N variations with different hooks.
 * Uses the prompt engine to create diverse hook variants.
 */
export function generateVariations(
  baseScenes: Omit<Scene, "id">[],
  count: number,
): Omit<Scene, "id">[][] {
  const variations: Omit<Scene, "id">[][] = [];

  for (let i = 0; i < count; i++) {
    const variant = baseScenes.map((s) => ({ ...s }));
    // Replace the hook (scene 0) with a fresh prompt from the engine
    if (variant[0]) {
      variant[0].prompt = buildScenePrompt(
        "hook",
        null, // No product context — uses generic hook
        variant[0].modelId,
        "ugc",
      );
    }
    variations.push(variant);
  }

  return variations;
}
