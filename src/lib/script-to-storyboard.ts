import { MODEL_CATALOG, type Scene } from "@/types";

/**
 * Parse a raw script/description into structured scene data using a simple
 * rule-based approach. For LLM-powered parsing, users can integrate their
 * own OpenAI/Claude key in a future update.
 *
 * Input: free-form text like:
 *   "Open on a sunrise over mountains. Cut to a hiker reaching the summit.
 *    Show the product being used outdoors. End with the brand logo."
 *
 * Output: Scene[] with model assignments and prompts.
 */

interface ParsedScene {
  description: string;
  suggestedModel: string;
  duration: number;
  voiceoverText: string;
}

/**
 * Split a script into scenes using sentence/paragraph boundaries
 * and visual cue keywords.
 */
export function parseScript(script: string): ParsedScene[] {
  // Split on explicit scene markers first
  const explicitSplits = script.split(/(?:scene\s*\d+[:\s]|cut\s+to[:\s]|\n\n+|(?:^|\.\s+)(?=open\s+on|close\s+on|we\s+see|shot\s+of|cut\s+to|fade\s+to|end\s+(?:with|on)))/i);

  let segments = explicitSplits
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  // If no explicit splits, split by sentences (aim for 3-6 scenes)
  if (segments.length <= 1) {
    // Split on sentence boundaries — require uppercase letter after period
    // to avoid splitting on "Dr.", "U.S.", URLs, etc.
    const sentences = script
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);

    if (sentences.length <= 4) {
      segments = sentences;
    } else {
      // Group sentences into ~4 scenes
      const perScene = Math.ceil(sentences.length / 4);
      segments = [];
      for (let i = 0; i < sentences.length; i += perScene) {
        segments.push(sentences.slice(i, i + perScene).join(" "));
      }
    }
  }

  // Cap at 8 scenes
  segments = segments.slice(0, 8);

  // If still empty, make one scene from the whole thing
  if (segments.length === 0) {
    segments = [script.trim()];
  }

  return segments.map((text, i) => ({
    description: text,
    suggestedModel: pickModelForScene(text, i, segments.length),
    duration: pickDuration(text),
    voiceoverText: extractVoiceover(text),
  }));
}

/**
 * Pick the best model based on scene content keywords.
 */
function pickModelForScene(text: string, index: number, total: number): string {
  const lower = text.toLowerCase();

  // First scene: action/attention → Kling
  if (index === 0) return "Kling 2.5 Turbo";

  // Last scene: CTA/ending → Seedance (supports audio)
  if (index === total - 1) return "Seedance 1.5";

  // Product shots, realism → Veo 2
  if (/product|detail|close.?up|rotating|hero\s+shot|realistic/i.test(lower)) return "Veo 2";

  // People, lifestyle, UGC → Kling
  if (/person|people|someone|holding|using|smiling|reaction/i.test(lower)) return "Kling 2.5 Turbo";

  // Dreamy, artistic, creative → Luma
  if (/dream|magic|fantasy|surreal|artistic|creative|ethereal/i.test(lower)) return "Luma Ray 2";

  // Anime, stylized → Wan
  if (/anime|cartoon|stylized|illustration|animated/i.test(lower)) return "Wan 2.5";

  // Fast/cheap middle scenes → MiniMax
  if (index > 0 && index < total - 1) return "MiniMax Live";

  return "Veo 2";
}

/**
 * Pick duration based on content complexity.
 */
function pickDuration(text: string): number {
  const wordCount = text.split(/\s+/).length;
  if (wordCount > 30) return 6;
  if (wordCount > 15) return 5;
  return 4;
}

/**
 * Extract voiceover text — if the scene text reads like narration, use it.
 * Strip visual-only directions.
 */
function extractVoiceover(text: string): string {
  // Remove visual direction prefixes
  const cleaned = text
    .replace(/^(open on|close on|we see|shot of|cut to|fade to|end with|end on)\s*/i, "")
    .replace(/\b(camera|pan|zoom|tilt|dolly|tracking|close-up|wide shot|medium shot)\b[^.]*\./gi, "")
    .trim();

  // If mostly visual direction, no voiceover
  if (cleaned.length < 15) return "";

  return cleaned;
}

/**
 * Convert parsed scenes to Scene objects ready for the editor.
 */
export function scriptToScenes(script: string, aspectRatio: string = "9:16"): Omit<Scene, "id">[] {
  const parsed = parseScript(script);

  return parsed.map((p, i) => {
    const model = MODEL_CATALOG.find((m) => m.name === p.suggestedModel) ?? MODEL_CATALOG[0];
    const dur = model.supportedDurations.reduce((best, d) =>
      Math.abs(d - p.duration) < Math.abs(best - p.duration) ? d : best,
    );

    // Assign role based on position in the script
    const roles: Scene["role"][] = ["hook", "solution", "proof", "cta"];
    const role = i < roles.length ? roles[i] : "custom";

    return {
      index: i,
      role,
      modelId: model.id,
      prompt: p.description,
      duration: dur,
      aspectRatio,
      trimStart: 0,
      trimEnd: dur,
      voiceoverText: p.voiceoverText,
      status: "idle" as const,
      progress: 0,
    };
  });
}
