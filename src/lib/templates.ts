import { MODEL_CATALOG, type Scene } from "@/types";

export interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  aspectRatio: "16:9" | "9:16" | "1:1";
  scenes: TemplateScene[];
}

interface TemplateScene {
  modelName: string;
  promptTemplate: string;
  duration: number;
}

function modelId(name: string): string {
  return MODEL_CATALOG.find((m) => m.name === name)?.id ?? MODEL_CATALOG[0].id;
}

function clampDuration(modelName: string, desired: number): number {
  const model = MODEL_CATALOG.find((m) => m.name === modelName);
  if (!model) return desired;
  // Pick the closest supported duration
  const diffs = model.supportedDurations.map((d) => ({ d, diff: Math.abs(d - desired) }));
  diffs.sort((a, b) => a.diff - b.diff);
  return diffs[0]?.d ?? desired;
}

// ── Template Catalog ──

export const TEMPLATE_CATALOG: Template[] = [
  {
    id: "ugc-ad",
    name: "UGC Ad",
    description: "Person-first ad with hook, reaction, demo, and CTA. Vertical 9:16 for TikTok/Reels.",
    icon: "UGC",
    aspectRatio: "9:16",
    scenes: [
      {
        modelName: "Kling 2.5 Turbo",
        promptTemplate: "A person looking directly at the camera with an excited expression, holding up [PRODUCT]. Bright natural lighting, filmed on iPhone, authentic UGC style. They say 'you NEED this'.",
        duration: 5,
      },
      {
        modelName: "Veo 2",
        promptTemplate: "Close-up hands-on demonstration of [PRODUCT] being used. Show the key feature in action. Clean, well-lit setting. Product review style footage.",
        duration: 4,
      },
      {
        modelName: "MiniMax Live",
        promptTemplate: "Before and after comparison — left side shows the problem, right side shows [PRODUCT] solving it. Split screen effect, satisfying transformation.",
        duration: 3,
      },
      {
        modelName: "Seedance 1.5",
        promptTemplate: "[PRODUCT] displayed beautifully with price tag visible. Camera pushes in slowly. Clean background, perfect for text overlay. Final CTA shot.",
        duration: 5,
      },
    ],
  },
  {
    id: "product-showcase",
    name: "Product Showcase",
    description: "Premium product film with hero shots and lifestyle context. Landscape 16:9.",
    icon: "PRO",
    aspectRatio: "16:9",
    scenes: [
      {
        modelName: "Veo 2",
        promptTemplate: "Cinematic opening: [PRODUCT] sits on a sleek surface. Camera slowly orbits. Studio lighting with dramatic shadows and highlights. Premium commercial aesthetic.",
        duration: 6,
      },
      {
        modelName: "Kling 2.5 Turbo",
        promptTemplate: "Extreme macro close-up of [PRODUCT] details and textures. Rack focus between features. Luxury product photography style.",
        duration: 5,
      },
      {
        modelName: "Luma Ray 2",
        promptTemplate: "[PRODUCT] in a beautiful lifestyle setting — on a marble counter, elegant desk, or modern living room. Warm golden hour light streams in. Aspirational lifestyle.",
        duration: 5,
      },
      {
        modelName: "Veo 2",
        promptTemplate: "Final hero shot: [PRODUCT] centered frame, camera slowly pushing in. Gradient background fading from dark to light. Space for logo and text overlay.",
        duration: 4,
      },
    ],
  },
  {
    id: "explainer",
    name: "Explainer",
    description: "Problem → Solution → How it works → Result. Great for complex products.",
    icon: "EDU",
    aspectRatio: "16:9",
    scenes: [
      {
        modelName: "Kling 2.5 Turbo",
        promptTemplate: "A person frustrated with a common problem that [PRODUCT] solves. They look annoyed, struggling with the old way of doing things. Relatable, everyday setting.",
        duration: 5,
      },
      {
        modelName: "MiniMax Live",
        promptTemplate: "Light-bulb moment: the same person discovers [PRODUCT]. Their expression changes from frustration to excitement. Bright, optimistic lighting shift.",
        duration: 3,
      },
      {
        modelName: "Veo 2",
        promptTemplate: "Step-by-step demonstration of [PRODUCT] in use. Clean overhead shot showing hands interacting with the product. Clear, instructional style with good lighting.",
        duration: 6,
      },
      {
        modelName: "Seedance 1.5",
        promptTemplate: "Happy customer using [PRODUCT] effortlessly in their daily life. Smiling, satisfied. The problem is completely solved. Warm, positive atmosphere. Testimonial style.",
        duration: 5,
      },
    ],
  },
  {
    id: "before-after",
    name: "Before / After",
    description: "Dramatic transformation showing life before and after the product.",
    icon: "B/A",
    aspectRatio: "9:16",
    scenes: [
      {
        modelName: "MiniMax Live",
        promptTemplate: "The 'before' state: a messy, disorganized, or frustrating situation that [PRODUCT] will fix. Dull, flat lighting. Everything looks chaotic.",
        duration: 3,
      },
      {
        modelName: "Kling 2.5 Turbo",
        promptTemplate: "Dramatic transition moment: [PRODUCT] enters the frame. Satisfying swoosh or reveal effect. The energy shifts. Quick, dynamic camera movement.",
        duration: 5,
      },
      {
        modelName: "Veo 2",
        promptTemplate: "The 'after' state: everything is clean, organized, beautiful. [PRODUCT] has transformed the space or situation. Bright, warm, aspirational lighting. Night and day difference.",
        duration: 6,
      },
      {
        modelName: "Seedance 1.5",
        promptTemplate: "Side-by-side before/after comparison slowly revealing. [PRODUCT] centered at the bottom. Clean background perfect for 'Shop Now' text overlay.",
        duration: 5,
      },
    ],
  },
  {
    id: "social-proof",
    name: "Social Proof",
    description: "Reviews, reactions, and real-world usage montage. Builds trust fast.",
    icon: "SOC",
    aspectRatio: "9:16",
    scenes: [
      {
        modelName: "Kling 2.5 Turbo",
        promptTemplate: "Montage of different people's hands unboxing [PRODUCT]. Quick cuts between 3-4 unboxing angles. Each person looks excited. Fast-paced, energetic.",
        duration: 5,
      },
      {
        modelName: "MiniMax Live",
        promptTemplate: "A person filming themselves with [PRODUCT], genuine excitement on their face. Raw, authentic phone-camera aesthetic. 'OMG this actually works' energy.",
        duration: 3,
      },
      {
        modelName: "Luma Ray 2",
        promptTemplate: "[PRODUCT] surrounded by floating 5-star ratings and glowing reviews. Dreamy, magical atmosphere. The product levitates slightly. Social proof visualization.",
        duration: 5,
      },
      {
        modelName: "Veo 2",
        promptTemplate: "Compilation of happy customers in different settings, all using [PRODUCT]. Diverse people, authentic moments. Warm color grade. Trust-building montage.",
        duration: 6,
      },
    ],
  },
];

/**
 * Apply a template to generate scene data.
 * Replace [PRODUCT] with the actual product name.
 */
export function applyTemplate(
  template: Template,
  productName?: string,
  aspectRatio?: string,
): Omit<Scene, "id">[] {
  const name = productName?.trim() || "your product";
  const ar = aspectRatio ?? template.aspectRatio;

  return template.scenes.map((ts, i) => {
    const dur = clampDuration(ts.modelName, ts.duration);
    return {
      index: i,
      role: (["hook", "solution", "proof", "cta"][i] ?? "custom") as Scene["role"],
      modelId: modelId(ts.modelName),
      prompt: ts.promptTemplate.replace(/\[PRODUCT\]/g, name),
      duration: dur,
      aspectRatio: ar,
      trimStart: 0,
      trimEnd: dur,
      voiceoverText: "",
      status: "idle" as const,
      progress: 0,
    };
  });
}
