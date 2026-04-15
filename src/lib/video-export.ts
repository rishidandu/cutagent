import type { Scene } from "@/types";
import type { AudioTrack } from "@/lib/audio";

/**
 * Export completed scenes as a single MP4 with audio.
 *
 * Strategy:
 * 1. If only one scene + no audio → direct download
 * 2. If multiple scenes OR has audio → use FFmpeg.wasm to stitch + mix
 * 3. Fallback: download individual scenes if FFmpeg fails
 *
 * Audio sources (mixed together):
 * - Per-scene voiceovers (scene.audioUrl) — concatenated in scene order
 * - Background music (audioTracks with type "music")
 * - Native video audio (kept if no voiceover exists for that scene)
 */
export async function exportProject(
  scenes: Scene[],
  audioTracks?: AudioTrack[],
  onProgress?: (msg: string) => void,
): Promise<void> {
  const completed = scenes.filter((s) => s.videoUrl);
  if (completed.length === 0) {
    throw new Error("No completed scenes to export");
  }

  const hasVoiceovers = completed.some((s) => s.audioUrl);
  const hasMusic = audioTracks?.some((t) => t.type === "music" && t.url);
  const hasAudio = hasVoiceovers || hasMusic;
  const multipleScenes = completed.length > 1;

  // Simple case: single scene, no extra audio → direct download
  if (!multipleScenes && !hasAudio) {
    onProgress?.("Downloading...");
    await downloadVideo(completed[0].videoUrl!, "cutagent-export.mp4");
    onProgress?.("Export complete!");
    return;
  }

  // Use FFmpeg for stitching + audio mixing
  try {
    await stitchWithFFmpeg(completed, audioTracks ?? [], onProgress);
    return;
  } catch (err) {
    console.warn("FFmpeg export failed:", err);
    onProgress?.("FFmpeg failed — downloading individual scenes...");
  }

  // Fallback: download each scene individually
  for (const scene of completed) {
    await downloadVideo(scene.videoUrl!, `cutagent-scene-${scene.index + 1}.mp4`);
  }
  onProgress?.("Scenes downloaded individually (FFmpeg unavailable).");
}

/**
 * Stitch scenes + mix voiceovers and music into one MP4.
 */
async function stitchWithFFmpeg(
  scenes: Scene[],
  audioTracks: AudioTrack[],
  onProgress?: (msg: string) => void,
): Promise<void> {
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { fetchFile } = await import("@ffmpeg/util");

  const ffmpeg = new FFmpeg();

  onProgress?.("Loading FFmpeg (first time may take a moment)...");
  await ffmpeg.load({
    coreURL: "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.js",
    wasmURL: "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.wasm",
  });

  // ── Step 1: Download all scene videos ──
  const videoFiles: string[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    if (!scene.videoUrl) continue;

    onProgress?.(`Downloading scene ${i + 1}/${scenes.length}...`);
    const filename = `scene${i}.mp4`;
    try {
      const data = await fetchFile(scene.videoUrl);
      await ffmpeg.writeFile(filename, data);
      videoFiles.push(filename);
    } catch (err) {
      console.warn(`Failed to download scene ${i + 1}:`, err);
      // Skip this scene in the stitch
    }
  }

  if (videoFiles.length === 0) throw new Error("No video files downloaded");

  // ── Step 2: Download per-scene voiceovers ──
  const voiceoverFiles: string[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    if (scene.audioUrl) {
      try {
        const filename = `vo${i}.mp3`;
        const data = await fetchFile(scene.audioUrl);
        await ffmpeg.writeFile(filename, data);
        voiceoverFiles.push(filename);
      } catch {
        // Skip this voiceover
      }
    }
  }

  // ── Step 3: Download background music ──
  const musicTrack = audioTracks.find((t) => t.type === "music" && t.url);
  let hasMusicFile = false;
  if (musicTrack?.url) {
    try {
      onProgress?.("Downloading music...");
      const data = await fetchFile(musicTrack.url);
      await ffmpeg.writeFile("music.mp3", data);
      hasMusicFile = true;
    } catch {
      // Continue without music
    }
  }

  // ── Step 4: Concat videos ──
  onProgress?.("Stitching scenes...");
  const concatList = videoFiles.map((f) => `file '${f}'`).join("\n");
  await ffmpeg.writeFile("concat.txt", new TextEncoder().encode(concatList));

  // Use stream copy first (fast), re-encode only if it fails
  try {
    await ffmpeg.exec([
      "-f", "concat", "-safe", "0", "-i", "concat.txt",
      "-c", "copy", "-an",
      "video_only.mp4",
    ]);
  } catch {
    // Stream copy failed (different codecs) — re-encode
    onProgress?.("Re-encoding scenes (different codecs detected)...");
    await ffmpeg.exec([
      "-f", "concat", "-safe", "0", "-i", "concat.txt",
      "-vf", "scale=720:-2",
      "-pix_fmt", "yuv420p",
      "-an",
      "video_only.mp4",
    ]);
  }

  // ── Step 5: Concat voiceovers into one track ──
  let hasVoiceoverTrack = false;
  if (voiceoverFiles.length > 0) {
    onProgress?.("Combining voiceovers...");
    if (voiceoverFiles.length === 1) {
      // Single voiceover — just rename
      await ffmpeg.exec(["-i", voiceoverFiles[0], "-c", "copy", "all_vo.mp3"]);
      hasVoiceoverTrack = true;
    } else {
      // Multiple voiceovers — concat
      const voConcatList = voiceoverFiles.map((f) => `file '${f}'`).join("\n");
      await ffmpeg.writeFile("vo_concat.txt", new TextEncoder().encode(voConcatList));
      try {
        await ffmpeg.exec([
          "-f", "concat", "-safe", "0", "-i", "vo_concat.txt",
          "-c", "copy",
          "all_vo.mp3",
        ]);
        hasVoiceoverTrack = true;
      } catch {
        // Concat failed — use first voiceover only
        await ffmpeg.exec(["-i", voiceoverFiles[0], "-c", "copy", "all_vo.mp3"]);
        hasVoiceoverTrack = true;
      }
    }
  }

  // ── Step 6: Mix audio + video into final output ──
  onProgress?.("Mixing final video...");

  if (hasVoiceoverTrack && hasMusicFile) {
    // Both voiceover and music — mix them, add to video
    await ffmpeg.exec([
      "-i", "video_only.mp4",
      "-i", "all_vo.mp3",
      "-i", "music.mp3",
      "-filter_complex",
      "[1:a]apad[vo];[2:a]volume=0.25,apad[bg];[vo][bg]amix=inputs=2:duration=first[aout]",
      "-map", "0:v",
      "-map", "[aout]",
      "-c:v", "copy",
      "-c:a", "aac",
      "-shortest",
      "output.mp4",
    ]);
  } else if (hasVoiceoverTrack) {
    // Voiceover only
    await ffmpeg.exec([
      "-i", "video_only.mp4",
      "-i", "all_vo.mp3",
      "-map", "0:v",
      "-map", "1:a",
      "-c:v", "copy",
      "-c:a", "aac",
      "-shortest",
      "output.mp4",
    ]);
  } else if (hasMusicFile) {
    // Music only
    await ffmpeg.exec([
      "-i", "video_only.mp4",
      "-i", "music.mp3",
      "-filter_complex", "[1:a]volume=0.5[bg]",
      "-map", "0:v",
      "-map", "[bg]",
      "-c:v", "copy",
      "-c:a", "aac",
      "-shortest",
      "output.mp4",
    ]);
  } else {
    // No extra audio — keep original video audio if any
    await ffmpeg.exec(["-i", "video_only.mp4", "-c", "copy", "output.mp4"]);
  }

  // ── Step 7: Download ──
  onProgress?.("Preparing download...");
  const outputData = await ffmpeg.readFile("output.mp4");
  const uint8 = outputData as Uint8Array;
  const blob = new Blob([new Uint8Array(uint8)], { type: "video/mp4" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "cutagent-export.mp4";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  onProgress?.("Export complete!");
}

async function downloadVideo(url: string, filename: string): Promise<void> {
  const resp = await fetch(url);
  const blob = await resp.blob();
  const blobUrl = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}
