import type { Scene, StyleContext } from "@/types";
import type { AudioTrack } from "@/lib/audio";

/**
 * Full project state for save/load.
 */
export interface ProjectFile {
  version: 1;
  name: string;
  scenes: Scene[];
  styleContext: StyleContext;
  audioTracks: AudioTrack[];
  exportedAt: string;
}

/**
 * Export the current project as a JSON file download.
 */
export function exportProjectFile(
  name: string,
  scenes: Scene[],
  styleContext: StyleContext,
  audioTracks: AudioTrack[],
): void {
  // Strip base64 data URLs from references to keep file size reasonable
  const cleanStyle: StyleContext = {
    ...styleContext,
    references: styleContext.references
      .filter((r) => !r.url.startsWith("data:"))
      .map((r) => ({ ...r })),
  };

  // Strip video blob URLs (not portable)
  const cleanScenes = scenes.map((s) => ({
    ...s,
    videoUrl: s.videoUrl?.startsWith("blob:") ? undefined : s.videoUrl,
  }));

  const project: ProjectFile = {
    version: 1,
    name,
    scenes: cleanScenes,
    styleContext: cleanStyle,
    audioTracks: audioTracks.filter((t) => !t.url.startsWith("blob:")),
    exportedAt: new Date().toISOString(),
  };

  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/\s+/g, "-").toLowerCase()}.cutagent.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import a project from a JSON file.
 */
export function importProjectFile(file: File): Promise<ProjectFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!data.version || !data.scenes?.length) {
          reject(new Error("Invalid project file"));
          return;
        }
        // Migrate scenes from older versions that may lack new fields
        data.scenes = data.scenes.map((s: Partial<Scene>) => ({
          ...s,
          role: s.role ?? "custom",
          trimStart: s.trimStart ?? 0,
          trimEnd: s.trimEnd ?? s.duration,
          voiceoverText: s.voiceoverText ?? "",
          audioUrl: s.audioUrl ?? undefined,
          audioStatus: s.audioStatus ?? undefined,
        }));
        resolve(data as ProjectFile);
      } catch {
        reject(new Error("Failed to parse project file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}
