import type { Scene, CaptionSegment } from "@/types";
import type { AudioTrack } from "@/lib/audio";

/**
 * Build caption timing segments from scene data.
 * Each scene's voiceoverText becomes a caption at the correct time offset.
 */
export function buildCaptionSegments(scenes: Scene[]): CaptionSegment[] {
  const completed = scenes.filter((s) => s.videoUrl);
  const segments: CaptionSegment[] = [];
  let offset = 0;

  for (const scene of completed) {
    const trimmedDuration = (scene.trimEnd ?? scene.duration) - (scene.trimStart ?? 0);
    const text = scene.voiceoverText?.trim();

    if (text) {
      segments.push({
        text,
        startTime: Math.round(offset * 100) / 100,
        endTime: Math.round((offset + trimmedDuration) * 100) / 100,
      });
    }

    offset += trimmedDuration;
  }

  return segments;
}

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
  options?: { captions?: boolean; aspectRatio?: string },
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
    const blob = await stitchWithFFmpeg(completed, audioTracks ?? [], onProgress, options?.aspectRatio);

    // If captions requested, do a second pass server-side
    const wantCaptions = options?.captions && completed.some((s) => s.voiceoverText?.trim());
    if (wantCaptions) {
      onProgress?.("Adding captions...");
      const segments = buildCaptionSegments(completed);
      if (segments.length > 0) {
        try {
          const captionedBlob = await addCaptionsServerSide(blob, segments);
          triggerDownload(captionedBlob, "cutagent-export.mp4");
          onProgress?.("Export complete (with captions)!");
          return;
        } catch (captionErr) {
          console.warn("Caption rendering failed, downloading without captions:", captionErr);
          onProgress?.("Captions failed — downloading without...");
        }
      }
    }

    // Download without captions (or if captions failed)
    triggerDownload(blob, "cutagent-export.mp4");
    onProgress?.("Export complete!");
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
 * Send stitched video + caption data to server for drawtext rendering.
 */
async function addCaptionsServerSide(videoBlob: Blob, segments: CaptionSegment[]): Promise<Blob> {
  const formData = new FormData();
  formData.append("video", videoBlob, "input.mp4");
  formData.append("captions", JSON.stringify(segments));

  const resp = await fetch("/api/add-captions", {
    method: "POST",
    body: formData,
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || "Caption server error");
  }

  return resp.blob();
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Stitch scenes + mix voiceovers and music into one MP4.
 */
async function stitchWithFFmpeg(
  scenes: Scene[],
  audioTracks: AudioTrack[],
  onProgress?: (msg: string) => void,
  projectAspectRatio?: string,
): Promise<Blob> {
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { fetchFile, toBlobURL } = await import("@ffmpeg/util");

  const ffmpeg = new FFmpeg();

  onProgress?.("Loading FFmpeg (first time may take a moment)...");

  // @ffmpeg/ffmpeg@0.12.x spins up a classic Web Worker that loads core via
  // importScripts(), which only accepts classic scripts — not ES modules.
  // We must point at /dist/umd, not /dist/esm. Additionally, `toBlobURL`
  // rewrites the URLs as same-origin blob: URLs so the cross-origin wasm
  // reference inside the core script resolves.
  // Fall back to jsdelivr if unpkg is blocked/unreachable.
  const cdns = [
    "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd",
    "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd",
  ];
  let loaded = false;
  let lastErr: unknown;
  for (const base of cdns) {
    try {
      const [coreURL, wasmURL] = await Promise.all([
        toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
        toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
      ]);
      await ffmpeg.load({ coreURL, wasmURL });
      loaded = true;
      break;
    } catch (e) {
      lastErr = e;
      console.warn(`[ffmpeg-load] failed from ${base}:`, e);
    }
  }
  if (!loaded) {
    throw new Error(
      `Could not load FFmpeg.wasm from any CDN — ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
    );
  }

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
  // The concat demuxer with -c copy silently truncates to the first input's
  // duration when codec params don't match (different fal.ai models produce
  // different streams). We always re-encode to avoid the silent-corruption bug.
  onProgress?.("Stitching scenes...");

  // Prefer the project-wide canvas ratio (single source of truth). Falls back
  // to the first scene's AR for older projects that predate project-level AR.
  const firstScene = scenes.find((s) => s.videoUrl);
  const ar = projectAspectRatio ?? firstScene?.aspectRatio ?? "9:16";
  const [tw, th] = ar === "16:9" ? [1280, 720]
    : ar === "1:1" ? [1080, 1080]
    : ar === "4:3" ? [960, 720]
    : ar === "3:4" ? [720, 960]
    : [720, 1280];
  const normFilter =
    `scale=${tw}:${th}:force_original_aspect_ratio=decrease,` +
    `pad=${tw}:${th}:(ow-iw)/2:(oh-ih)/2,setsar=1`;

  if (videoFiles.length === 1) {
    await ffmpeg.exec([
      "-i", videoFiles[0],
      "-vf", normFilter,
      "-r", "24",
      "-pix_fmt", "yuv420p",
      "-an",
      "video_only.mp4",
    ]);
  } else {
    // Try 1: concat demuxer with re-encode — memory-efficient, processes one
    // input at a time. Works when all inputs share a pixel format.
    const concatList = videoFiles.map((f) => `file '${f}'`).join("\n");
    await ffmpeg.writeFile("concat.txt", new TextEncoder().encode(concatList));

    try {
      await ffmpeg.exec([
        "-f", "concat", "-safe", "0", "-i", "concat.txt",
        "-vf", normFilter,
        "-r", "24",
        "-pix_fmt", "yuv420p",
        "-an",
        "video_only.mp4",
      ]);
    } catch (concatErr) {
      // Try 2: filter-complex concat — more robust for heterogenous sources,
      // but loads every input simultaneously (higher memory use).
      console.warn("concat demuxer failed, trying filter-complex:", concatErr);
      onProgress?.("Retrying with full re-encode...");

      const inputArgs = videoFiles.flatMap((f) => ["-i", f]);
      const normChains = videoFiles.map((_, i) =>
        `[${i}:v]${normFilter},fps=24[v${i}]`
      );
      const concatInputs = videoFiles.map((_, i) => `[v${i}]`).join("");
      const filterComplex = [
        ...normChains,
        `${concatInputs}concat=n=${videoFiles.length}:v=1:a=0[outv]`,
      ].join(";");

      await ffmpeg.exec([
        ...inputArgs,
        "-filter_complex", filterComplex,
        "-map", "[outv]",
        "-pix_fmt", "yuv420p",
        "video_only.mp4",
      ]);
    }
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

  // ── Step 7: Return Blob ──
  onProgress?.("Preparing file...");
  const outputData = await ffmpeg.readFile("output.mp4");
  const uint8 = outputData as Uint8Array;
  return new Blob([new Uint8Array(uint8)], { type: "video/mp4" });
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
