/**
 * Download all completed scene videos and stitch them into a single file.
 * For now: downloads as individual clips with a manifest.
 * FFmpeg.wasm integration for true stitching is a future upgrade.
 */
export async function exportProject(scenes: { videoUrl?: string; index: number }[]): Promise<void> {
  const completed = scenes.filter((s) => s.videoUrl);
  if (completed.length === 0) {
    throw new Error("No completed scenes to export");
  }

  // If only one scene, download directly
  if (completed.length === 1) {
    await downloadVideo(completed[0].videoUrl!, `cutagent-scene-1.mp4`);
    return;
  }

  // Multiple scenes — download each
  for (const scene of completed) {
    await downloadVideo(scene.videoUrl!, `cutagent-scene-${scene.index + 1}.mp4`);
  }
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
