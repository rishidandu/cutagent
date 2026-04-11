import type { Scene, StyleContext, ReferenceImage } from "@/types";
import { extractBestFrame, extractLastFrame } from "@/lib/frame-extractor";

/**
 * After a scene completes, update the StyleContext:
 * - Extract best frame and/or last frame
 * - Add to reference bank (replacing stale last-frame entries)
 */
export async function onSceneCompleted(
  completedScene: Scene,
  currentStyle: StyleContext,
): Promise<StyleContext> {
  if (!completedScene.videoUrl) return currentStyle;

  const updatedRefs = [...currentStyle.references];

  // Remove stale last-frame references (keep only the most recent)
  const withoutOldLastFrame = updatedRefs.filter(
    (r) => r.type !== "last-frame",
  );

  if (currentStyle.autoChainLastFrame) {
    try {
      const lastFrameUrl = await extractLastFrame(completedScene.videoUrl);
      withoutOldLastFrame.push({
        id: `last-frame-${completedScene.id}`,
        url: lastFrameUrl,
        type: "last-frame",
        label: `Last frame from Scene ${completedScene.index + 1}`,
        sourceSceneId: completedScene.id,
      });
    } catch {
      // Frame extraction failed, continue without last-frame
    }
  }

  return {
    ...currentStyle,
    references: withoutOldLastFrame,
  };
}

/**
 * Extract the best frame from a completed scene and add it as a
 * character/style reference in the reference bank.
 *
 * Called explicitly by the user via "Extract as reference" button.
 */
export async function extractSceneAsReference(
  scene: Scene,
  type: ReferenceImage["type"],
  label: string,
): Promise<ReferenceImage | null> {
  if (!scene.videoUrl) return null;

  try {
    const frameUrl = await extractBestFrame(scene.videoUrl);
    return {
      id: `ref-${scene.id}-${type}`,
      url: frameUrl,
      type,
      label,
      sourceSceneId: scene.id,
    };
  } catch {
    return null;
  }
}

/**
 * Plan the generation order for scenes based on style context.
 *
 * Returns an array of batches — scenes within a batch can run in parallel,
 * batches are sequential.
 *
 * - If autoChainLastFrame is on AND scenes use last-frame references:
 *   each scene is its own batch (fully sequential)
 * - If scenes only use uploaded refs (character/style/product):
 *   all scenes in one batch (fully parallel)
 * - Hybrid: scenes before first completed scene are sequential,
 *   scenes after can be parallel if they don't need last-frame
 */
export function planGenerationOrder(
  scenes: Scene[],
  style: StyleContext,
): Scene[][] {
  if (!style.autoChainLastFrame) {
    // No chaining → all parallel
    return [scenes];
  }

  // Check if any scene uses last-frame references
  const usesLastFrame = scenes.some((s) => {
    const types = s.activeReferenceTypes ?? style.defaultReferenceTypes;
    return types.includes("last-frame");
  });

  if (!usesLastFrame) {
    // No last-frame dependency → all parallel
    return [scenes];
  }

  // Last-frame chaining → fully sequential
  return scenes.map((s) => [s]);
}
