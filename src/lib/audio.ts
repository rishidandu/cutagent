import { fal } from "@fal-ai/client";

// ── TTS Voice catalog ──

export interface TTSVoice {
  id: string;
  name: string;
  gender: "male" | "female";
}

export interface TTSModel {
  id: string;
  name: string;
  falEndpoint: string;
  costPer1KChars: number;
  voices: TTSVoice[];
}

export const TTS_MODELS: TTSModel[] = [
  {
    id: "kokoro",
    name: "Kokoro",
    falEndpoint: "fal-ai/kokoro/american-english",
    costPer1KChars: 0.02,
    voices: [
      { id: "af_heart", name: "Heart", gender: "female" },
      { id: "af_bella", name: "Bella", gender: "female" },
      { id: "af_sarah", name: "Sarah", gender: "female" },
      { id: "af_nova", name: "Nova", gender: "female" },
      { id: "af_sky", name: "Sky", gender: "female" },
      { id: "am_adam", name: "Adam", gender: "male" },
      { id: "am_echo", name: "Echo", gender: "male" },
      { id: "am_eric", name: "Eric", gender: "male" },
      { id: "am_liam", name: "Liam", gender: "male" },
      { id: "am_michael", name: "Michael", gender: "male" },
    ],
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    falEndpoint: "fal-ai/elevenlabs/tts/turbo-v2.5",
    costPer1KChars: 0.05,
    voices: [
      { id: "Aria", name: "Aria", gender: "female" },
      { id: "Sarah", name: "Sarah", gender: "female" },
      { id: "Laura", name: "Laura", gender: "female" },
      { id: "Roger", name: "Roger", gender: "male" },
      { id: "Charlie", name: "Charlie", gender: "male" },
      { id: "George", name: "George", gender: "male" },
    ],
  },
];

// ── Music generation catalog ──

export interface MusicModel {
  id: string;
  name: string;
  falEndpoint: string;
  costDescription: string;
  maxDuration: number;
}

export const MUSIC_MODELS: MusicModel[] = [
  {
    id: "cassette",
    name: "CassetteAI",
    falEndpoint: "cassetteai/music-generator",
    costDescription: "$0.02/min",
    maxDuration: 180,
  },
  {
    id: "stable-audio",
    name: "Stable Audio 2.5",
    falEndpoint: "fal-ai/stable-audio-25/text-to-audio",
    costDescription: "$0.20 flat",
    maxDuration: 190,
  },
];

// ── Audio types ──

export interface AudioTrack {
  id: string;
  type: "voiceover" | "music";
  url: string;
  label: string;
  duration?: number;
  /** For voiceover: the text that was spoken */
  text?: string;
  /** For voiceover: TTS model + voice used */
  ttsModelId?: string;
  voiceId?: string;
  /** For music: the prompt used */
  musicPrompt?: string;
}

// ── TTS generation ──

/**
 * Estimate speech duration in seconds for a given text.
 * Average speaking rate: ~2.8 words/sec for natural speech, ~3.2 for slightly fast.
 */
export function estimateSpeechDuration(text: string, speed: number = 1.0): number {
  const wordCount = text.trim().split(/\s+/).length;
  const baseDuration = wordCount / 2.8; // seconds at 1x speed
  return baseDuration / speed;
}

/**
 * Trim voiceover text to fit within a target duration.
 * Removes words from the end and adjusts speed if needed.
 * Returns the adjusted text and recommended speed.
 */
export function fitVoiceoverToScene(
  text: string,
  sceneDurationSec: number,
): { text: string; speed: number } {
  const trimmed = text.trim();
  if (!trimmed) return { text: "", speed: 1.0 };

  // Leave 0.5s buffer so audio doesn't cut right at the end
  const targetDuration = sceneDurationSec - 0.5;
  if (targetDuration <= 0) return { text: trimmed, speed: 1.0 };

  const estDuration = estimateSpeechDuration(trimmed);

  // If it fits naturally, use normal speed
  if (estDuration <= targetDuration) {
    return { text: trimmed, speed: 1.0 };
  }

  // If it's slightly over (up to 30%), speed up rather than cutting words
  const speedNeeded = estDuration / targetDuration;
  if (speedNeeded <= 1.3) {
    return { text: trimmed, speed: Math.round(speedNeeded * 100) / 100 };
  }

  // Too long — trim words from the end to fit at 1.15x speed
  const words = trimmed.split(/\s+/);
  const maxWords = Math.floor(targetDuration * 2.8 * 1.15); // words that fit at 1.15x
  const shortened = words.slice(0, Math.max(3, maxWords)).join(" ");

  // Add period if the truncation removed one
  const ended = shortened.endsWith(".") || shortened.endsWith("!") || shortened.endsWith("?")
    ? shortened
    : shortened + ".";

  return { text: ended, speed: 1.15 };
}

export async function generateVoiceover(options: {
  text: string;
  ttsModelId: string;
  voiceId: string;
  speed?: number;
  /** Scene duration in seconds — used to auto-fit voiceover length */
  sceneDuration?: number;
  onProgress?: (status: string) => void;
}): Promise<{ url: string }> {
  const model = TTS_MODELS.find((m) => m.id === options.ttsModelId);
  if (!model) throw new Error(`Unknown TTS model: ${options.ttsModelId}`);

  options.onProgress?.("Generating voiceover...");

  // Auto-fit text to scene duration if provided
  let voText = options.text;
  let speed = options.speed ?? 1.0;
  if (options.sceneDuration) {
    const fit = fitVoiceoverToScene(options.text, options.sceneDuration);
    voText = fit.text;
    speed = Math.max(speed, fit.speed); // Use the faster of user-set or auto-fit speed
  }

  const input: Record<string, unknown> = {};

  if (model.id === "kokoro") {
    input.prompt = voText;
    input.voice = options.voiceId;
    input.speed = speed;
  } else if (model.id === "elevenlabs") {
    input.text = voText;
    input.voice = options.voiceId;
    input.speed = speed;
  }

  // Submit to queue
  let requestId: string;
  try {
    const submitResult = await fal.queue.submit(model.falEndpoint, { input });
    requestId = submitResult.request_id;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // fal.ai returns ValidationError with detail array
    if (msg.includes("ValidationError") || msg.includes("detail")) {
      throw new Error(`TTS validation error: ${msg.slice(0, 200)}`);
    }
    throw new Error(`TTS submission failed: ${msg}`);
  }

  // Poll
  const POLL_INTERVAL = 2000;
  const MAX_POLLS = 60;

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));

    let status: { status: string };
    try {
      status = await fal.queue.status(model.falEndpoint, { requestId, logs: true });
    } catch {
      // Network glitch — retry on next poll
      continue;
    }

    if (status.status === "COMPLETED") {
      const result = await fal.queue.result(model.falEndpoint, { requestId });
      const data = result.data as Record<string, unknown>;

      const audioUrl =
        (data.audio as { url?: string })?.url ??
        (data.audio_url as string) ??
        ((data.audios as { url?: string }[])?.[0]?.url) ??
        "";

      if (!audioUrl) throw new Error("No audio URL in response");
      return { url: audioUrl };
    } else if (status.status === "FAILED") {
      throw new Error("TTS generation failed on fal.ai");
    }
  }

  throw new Error("TTS generation timed out");
}

// ── Music generation ──

export async function generateMusic(options: {
  prompt: string;
  duration: number;
  musicModelId: string;
  onProgress?: (status: string) => void;
}): Promise<{ url: string }> {
  const model = MUSIC_MODELS.find((m) => m.id === options.musicModelId);
  if (!model) throw new Error(`Unknown music model: ${options.musicModelId}`);

  options.onProgress?.("Generating music...");

  const input: Record<string, unknown> = {
    prompt: options.prompt,
  };

  if (model.id === "cassette") {
    input.duration = options.duration;
  } else if (model.id === "stable-audio") {
    input.seconds_total = Math.min(options.duration, model.maxDuration);
  }

  let requestId: string;
  try {
    const submitResult = await fal.queue.submit(model.falEndpoint, { input });
    requestId = submitResult.request_id;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Music submission failed: ${msg.slice(0, 200)}`);
  }

  const POLL_INTERVAL = 3000;
  const MAX_POLLS = 120;

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));

    let status: { status: string };
    try {
      status = await fal.queue.status(model.falEndpoint, { requestId, logs: true });
    } catch {
      continue;
    }

    if (status.status === "COMPLETED") {
      const result = await fal.queue.result(model.falEndpoint, { requestId });
      const data = result.data as Record<string, unknown>;

      const audioUrl =
        (data.audio as { url?: string })?.url ??
        (data.audio_url as string) ??
        ((data.audio_file as { url?: string })?.url) ??
        "";

      if (!audioUrl) throw new Error("No audio URL in response");
      return { url: audioUrl };
    } else if (status.status === "FAILED") {
      throw new Error("Music generation failed on fal.ai");
    }
  }

  throw new Error("Music generation timed out");
}
