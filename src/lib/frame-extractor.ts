/**
 * Extract the last frame from a video URL as a data URL (base64 PNG).
 * Used by the Style Harness to chain scene consistency via img2vid.
 */
export async function extractLastFrame(videoUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "auto";
    video.muted = true;

    video.onloadedmetadata = () => {
      // Seek to the last frame (0.1s before end to avoid edge issues)
      video.currentTime = Math.max(0, video.duration - 0.1);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/png");
        resolve(dataUrl);
      } catch (err) {
        reject(new Error(`Frame extraction failed: ${err}`));
      }
    };

    video.onerror = () => reject(new Error("Failed to load video for frame extraction"));

    video.src = videoUrl;
    video.load();
  });
}

/**
 * Extract a frame at a specific timestamp (seconds).
 */
export async function extractFrameAt(videoUrl: string, timeSeconds: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "auto";
    video.muted = true;

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(timeSeconds, video.duration);
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
      }
    };

    video.onerror = () => reject(new Error("Failed to load video"));
    video.src = videoUrl;
    video.load();
  });
}
