/**
 * Frame extraction utilities for the Style Engine.
 *
 * Extracts frames from video URLs as base64 PNG data URLs.
 * Used for reference image extraction (best frame) and
 * scene chaining (last frame for temporal continuity).
 */

// ── Core extraction ──

/**
 * Extract a frame at a specific timestamp (seconds).
 */
export function extractFrameAt(videoUrl: string, timeSeconds: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "auto";
    video.muted = true;

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(Math.max(0, timeSeconds), video.duration);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("No canvas context")); return; }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      } catch (err) {
        reject(new Error(`Frame extraction failed: ${err}`));
      } finally {
        // Cleanup
        video.src = "";
        video.load();
      }
    };

    video.onerror = () => {
      reject(new Error("Failed to load video for frame extraction"));
    };

    video.src = videoUrl;
    video.load();
  });
}

/**
 * Extract the last frame from a video URL as a data URL (base64 PNG).
 * Used for temporal continuity chaining (scene N → scene N+1).
 */
export async function extractLastFrame(videoUrl: string): Promise<string> {
  const duration = await getVideoDuration(videoUrl);
  return extractFrameAt(videoUrl, Math.max(0, duration - 0.1));
}

// ── Smart frame selection ──

/**
 * Extract the "best" frame from a video — the sharpest, most visually detailed frame.
 *
 * Samples 5 candidate frames at 10%, 25%, 50%, 75%, 90% through the video.
 * Scores each by luminance variance (higher = more visual detail, less blur/blank).
 * Returns the highest-scoring frame.
 *
 * Used for reference image extraction (character ref, style ref).
 */
export async function extractBestFrame(videoUrl: string): Promise<string> {
  const duration = await getVideoDuration(videoUrl);
  const positions = [0.10, 0.25, 0.50, 0.75, 0.90];

  // Extract all candidate frames
  const candidates: { dataUrl: string; score: number }[] = [];

  for (const pos of positions) {
    try {
      const time = duration * pos;
      const dataUrl = await extractFrameAt(videoUrl, time);
      const score = await scoreFrame(dataUrl);
      candidates.push({ dataUrl, score });
    } catch {
      // Skip failed extractions
    }
  }

  if (candidates.length === 0) {
    // Fallback to last frame
    return extractLastFrame(videoUrl);
  }

  // Return the frame with highest visual detail score
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].dataUrl;
}

/**
 * Extract multiple evenly-spaced frames from a video.
 * Useful for models that accept multiple reference images.
 */
export async function extractMultipleFrames(videoUrl: string, count: number): Promise<string[]> {
  const duration = await getVideoDuration(videoUrl);
  const frames: string[] = [];

  for (let i = 0; i < count; i++) {
    const pos = (i + 1) / (count + 1); // Evenly spaced, avoiding 0% and 100%
    try {
      const frame = await extractFrameAt(videoUrl, duration * pos);
      frames.push(frame);
    } catch {
      // Skip failed extractions
    }
  }

  return frames;
}

// ── Helpers ──

/**
 * Get the duration of a video in seconds.
 */
function getVideoDuration(videoUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.muted = true;

    video.onloadedmetadata = () => {
      const dur = video.duration;
      video.src = "";
      video.load();
      resolve(dur);
    };

    video.onerror = () => reject(new Error("Failed to load video metadata"));
    video.src = videoUrl;
    video.load();
  });
}

/**
 * Score a frame by luminance variance — higher variance = more visual detail.
 * A uniform/blank/blurry frame has low variance. A sharp, detailed frame has high variance.
 */
async function scoreFrame(dataUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      // Downsample to 64x64 for fast scoring
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(0); return; }

      ctx.drawImage(img, 0, 0, 64, 64);
      const imageData = ctx.getImageData(0, 0, 64, 64);
      const pixels = imageData.data;

      // Compute luminance values
      const luminances: number[] = [];
      for (let i = 0; i < pixels.length; i += 4) {
        // Standard luminance formula
        const lum = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
        luminances.push(lum);
      }

      // Compute variance
      const mean = luminances.reduce((s, v) => s + v, 0) / luminances.length;
      const variance = luminances.reduce((s, v) => s + (v - mean) ** 2, 0) / luminances.length;

      resolve(variance);
    };
    img.onerror = () => resolve(0);
    img.src = dataUrl;
  });
}
