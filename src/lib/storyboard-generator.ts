import { MODEL_CATALOG, type Scene, type SceneRole } from "@/types";
import { buildScenePrompt, scrapeToProductContext, type ProductContext } from "@/lib/prompt-engine";

/**
 * Product data extracted from a URL scrape.
 */
export interface ProductData {
  title: string;
  description: string;
  price: string;
  images: string[];
  brand: string;
  source: string;
  category?: string;
  color?: string;
  material?: string;
  keywords?: string[];
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
  { role: "hook",     modelPref: "Kling 2.5 Turbo", modelFallback: "MiniMax Live" },
  { role: "solution", modelPref: "Kling 2.5 Turbo", modelFallback: "Veo 2" },
  { role: "proof",    modelPref: "MiniMax Live",     modelFallback: "Kling 2.5 Turbo" },
  { role: "cta",      modelPref: "Seedance 1.5",     modelFallback: "Veo 2" },
];

/**
 * Generate a 4-scene ad storyboard from product data using the prompt engine.
 */
export function generateProductStoryboard(product: ProductData): Omit<Scene, "id">[] {
  const productCtx = scrapeToProductContext(product);

  // First pass: resolve models and durations for each scene
  const scenePlan = AD_STRUCTURE.map((s) => {
    const model = findModel(s.modelPref) ?? findModel(s.modelFallback) ?? MODEL_CATALOG[0];
    // Pick duration based on scene role:
    // - Hook: short and punchy (use shortest)
    // - Solution/Proof: medium (use middle or first)
    // - CTA: short (use shortest)
    const durations = model.supportedDurations;
    let dur: number;
    if (s.role === "hook" || s.role === "cta") {
      dur = durations[0]; // shortest
    } else {
      dur = durations.length > 1 ? durations[1] : durations[0]; // second option or shortest
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
      aspectRatio: "9:16",
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

  const angles: AdAngle[] = [
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
