import type { Scene } from "@/types";
import type { AudioTrack } from "@/lib/audio";

/**
 * Export completed scenes as video files.
 *
 * If FFmpeg.wasm is available and multiple scenes exist, attempts to stitch
 * them into a single MP4. Falls back to individual downloads.
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

  // Single scene — just download
  if (completed.length === 1 && (!audioTracks || audioTracks.length === 0)) {
    await downloadVideo(completed[0].videoUrl!, "cutagent-export.mp4");
    return;
  }

  // Try FFmpeg stitching
  try {
    onProgress?.("Loading FFmpeg...");
    await stitchWithFFmpeg(completed, audioTracks ?? [], onProgress);
    return;
  } catch (err) {
    console.warn("FFmpeg stitching failed, falling back to individual downloads:", err);
  }

  // Fallback: download each scene individually
  for (const scene of completed) {
    await downloadVideo(scene.videoUrl!, `cutagent-scene-${scene.index + 1}.mp4`);
  }
}

/**
 * Stitch scenes (and optionally audio) into one MP4 using FFmpeg.wasm.
 */
async function stitchWithFFmpeg(
  scenes: Scene[],
  audioTracks: AudioTrack[],
  onProgress?: (msg: string) => void,
): Promise<void> {
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { fetchFile } = await import("@ffmpeg/util");

  const ffmpeg = new FFmpeg();

  onProgress?.("Initializing FFmpeg...");
  await ffmpeg.load({
    coreURL: "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.js",
    wasmURL: "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.wasm",
  });

  // Write each scene video to FFmpeg's filesystem
  const videoFiles: string[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    if (!scene.videoUrl) continue;

    onProgress?.(`Downloading scene ${i + 1}/${scenes.length}...`);
    const filename = `scene${i}.mp4`;
    const data = await fetchFile(scene.videoUrl);
    await ffmpeg.writeFile(filename, data);
    videoFiles.push(filename);
  }

  if (videoFiles.length === 0) throw new Error("No video files to stitch");

  // Create concat file
  const concatList = videoFiles.map((f) => `file '${f}'`).join("\n");
  await ffmpeg.writeFile("concat.txt", new TextEncoder().encode(concatList));

  // Write audio if present
  const voiceoverFile = scenes.find((s) => s.audioUrl)?.audioUrl;
  const musicFile = audioTracks.find((t) => t.type === "music")?.url;

  let hasAudio = false;
  if (voiceoverFile) {
    onProgress?.("Adding voiceover...");
    const voData = await fetchFile(voiceoverFile);
    await ffmpeg.writeFile("voiceover.mp3", voData);
    hasAudio = true;
  }
  if (musicFile) {
    onProgress?.("Adding music...");
    const musicData = await fetchFile(musicFile);
    await ffmpeg.writeFile("music.mp3", musicData);
    hasAudio = true;
  }

  // Stitch videos — re-encode to normalize codecs/resolutions from different models
  onProgress?.("Stitching scenes (this may take a moment)...");
  await ffmpeg.exec([
    "-f", "concat", "-safe", "0", "-i", "concat.txt",
    "-c:v", "libx264", "-preset", "fast", "-crf", "23",
    "-pix_fmt", "yuv420p",
    "-an", // strip original audio; we'll add our own
    "video_only.mp4",
  ]);

  if (hasAudio) {
    // Mix audio tracks if present
    const audioInputs: string[] = ["-i", "video_only.mp4"];
    const filterParts: string[] = [];
    let audioIdx = 1;

    if (voiceoverFile) {
      audioInputs.push("-i", "voiceover.mp3");
      filterParts.push(`[${audioIdx}:a]apad[vo]`);
      audioIdx++;
    }
    if (musicFile) {
      audioInputs.push("-i", "music.mp3");
      filterParts.push(`[${audioIdx}:a]volume=0.3,apad[bg]`);
      audioIdx++;
    }

    // Build filter for mixing
    if (voiceoverFile && musicFile) {
      onProgress?.("Mixing audio...");
      await ffmpeg.exec([
        ...audioInputs,
        "-filter_complex", `[1:a]apad[vo];[2:a]volume=0.3,apad[bg];[vo][bg]amix=inputs=2:duration=shortest[aout]`,
        "-map", "0:v", "-map", "[aout]",
        "-c:v", "copy", "-c:a", "aac", "-shortest",
        "output.mp4",
      ]);
    } else if (voiceoverFile) {
      await ffmpeg.exec([
        ...audioInputs,
        "-map", "0:v", "-map", "1:a",
        "-c:v", "copy", "-c:a", "aac", "-shortest",
        "output.mp4",
      ]);
    } else if (musicFile) {
      await ffmpeg.exec([
        ...audioInputs,
        "-map", "0:v", "-map", "1:a",
        "-c:v", "copy", "-c:a", "aac", "-shortest",
        "output.mp4",
      ]);
    }
  } else {
    // No audio — just rename
    await ffmpeg.exec(["-i", "video_only.mp4", "-c", "copy", "output.mp4"]);
  }

  // Read and download
  onProgress?.("Preparing download...");
  const outputData = await ffmpeg.readFile("output.mp4");
  // FFmpeg.wasm returns FileData (Uint8Array | string). Use slice() to get a clean ArrayBuffer.
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
