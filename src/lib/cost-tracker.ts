import { MODEL_CATALOG, type Scene } from "@/types";

export interface CostEntry {
  sceneId: string;
  sceneIndex: number;
  modelName: string;
  duration: number;
  cost: number;
  timestamp: number;
}

export interface CostSummary {
  totalSpent: number;
  estimateRemaining: number;
  entries: CostEntry[];
}

const COST_KEY = "cutagent-costs";

/**
 * Record a completed generation's cost.
 */
export function recordCost(scene: Scene): void {
  const model = MODEL_CATALOG.find((m) => m.id === scene.modelId);
  if (!model) return;

  const entry: CostEntry = {
    sceneId: scene.id,
    sceneIndex: scene.index,
    modelName: model.name,
    duration: scene.duration,
    cost: model.costPerSec * scene.duration,
    timestamp: Date.now(),
  };

  try {
    const raw = localStorage.getItem(COST_KEY);
    const entries: CostEntry[] = raw ? JSON.parse(raw) : [];
    entries.push(entry);
    // Keep last 200 entries
    localStorage.setItem(COST_KEY, JSON.stringify(entries.slice(-200)));
  } catch { /* quota exceeded */ }
}

/**
 * Get cost summary — total spent + estimate for pending scenes.
 */
export function getCostSummary(scenes: Scene[]): CostSummary {
  let entries: CostEntry[] = [];
  try {
    const raw = localStorage.getItem(COST_KEY);
    entries = raw ? JSON.parse(raw) : [];
  } catch { /* ignore */ }

  const totalSpent = entries.reduce((s, e) => s + e.cost, 0);

  const estimateRemaining = scenes
    .filter((s) => s.status === "idle" || s.status === "queued")
    .reduce((s, sc) => {
      const model = MODEL_CATALOG.find((m) => m.id === sc.modelId);
      return s + (model?.costPerSec ?? 0) * sc.duration;
    }, 0);

  return { totalSpent, estimateRemaining, entries };
}

/**
 * Clear cost history.
 */
export function clearCostHistory(): void {
  localStorage.removeItem(COST_KEY);
}
