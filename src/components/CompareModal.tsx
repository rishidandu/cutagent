"use client";

import { useState } from "react";
import { MODEL_CATALOG, type Scene, type StyleContext } from "@/types";
import { generateScene } from "@/lib/fal";

interface Props {
  open: boolean;
  onClose: () => void;
  scene: Scene | null;
  styleContext: StyleContext;
  onPickWinner: (modelId: string, videoUrl: string) => void;
}

interface CompareResult {
  modelId: string;
  modelName: string;
  status: "idle" | "generating" | "completed" | "failed";
  videoUrl?: string;
  error?: string;
}

export default function CompareModal({ open, onClose, scene, styleContext, onPickWinner }: Props) {
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [results, setResults] = useState<CompareResult[]>([]);
  const [running, setRunning] = useState(false);

  if (!open || !scene) return null;

  const toggleModel = (id: string) => {
    setSelectedModels((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : prev.length < 4 ? [...prev, id] : prev,
    );
  };

  const handleCompare = async () => {
    if (selectedModels.length < 2) return;
    setRunning(true);

    const initial: CompareResult[] = selectedModels.map((id) => ({
      modelId: id,
      modelName: MODEL_CATALOG.find((m) => m.id === id)?.name ?? id,
      status: "generating",
    }));
    setResults(initial);

    // Generate all in parallel
    await Promise.all(
      selectedModels.map(async (modelId, i) => {
        try {
          const compareScene = { ...scene, modelId };
          const result = await generateScene({
            scene: compareScene,
            styleContext,
          });
          setResults((prev) =>
            prev.map((r, j) => j === i ? { ...r, status: "completed", videoUrl: result.videoUrl } : r),
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setResults((prev) =>
            prev.map((r, j) => j === i ? { ...r, status: "failed", error: msg } : r),
          );
        }
      }),
    );

    setRunning(false);
  };

  const handlePick = (r: CompareResult) => {
    if (r.videoUrl) {
      onPickWinner(r.modelId, r.videoUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-zinc-100">Compare Models</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Generate the same scene with different models, then pick the best result.
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-lg leading-none">&times;</button>
        </div>

        {/* Scene preview */}
        <div className="rounded-lg bg-zinc-800/50 border border-zinc-700 px-3 py-2 mb-4">
          <span className="text-[10px] text-zinc-500">Scene {scene.index + 1}:</span>
          <p className="text-xs text-zinc-300 mt-0.5">{scene.prompt.slice(0, 150)}{scene.prompt.length > 150 ? "..." : ""}</p>
        </div>

        {results.length === 0 ? (
          <>
            {/* Model selector */}
            <div className="mb-4">
              <label className="text-[10px] text-zinc-500 block mb-2" htmlFor="compare-models">
                Pick 2-4 models to compare ({selectedModels.length} selected)
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {MODEL_CATALOG.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => toggleModel(m.id)}
                    className={`rounded-lg px-3 py-2 text-xs text-left transition border ${
                      selectedModels.includes(m.id)
                        ? "border-blue-500 bg-blue-500/10 text-blue-300"
                        : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    <div className="font-medium">{m.name}</div>
                    <div className="text-[9px] text-zinc-500">${m.costPerSec}/s</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-4 py-2 text-xs font-medium transition">Cancel</button>
              <button
                onClick={handleCompare}
                disabled={selectedModels.length < 2}
                className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 px-5 py-2 text-xs font-semibold transition"
              >
                Generate {selectedModels.length} Versions
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Results grid */}
            <div className={`grid gap-3 flex-1 overflow-y-auto mb-4 ${results.length <= 2 ? "grid-cols-2" : results.length === 3 ? "grid-cols-3" : "grid-cols-2 lg:grid-cols-4"}`}>
              {results.map((r, i) => (
                <div key={`result-${i}`} className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-3 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-zinc-300">{r.modelName}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      r.status === "completed" ? "bg-emerald-900/60 text-emerald-300" :
                      r.status === "generating" ? "bg-blue-900/60 text-blue-300 animate-pulse" :
                      r.status === "failed" ? "bg-red-900/60 text-red-300" :
                      "bg-zinc-800 text-zinc-500"
                    }`}>
                      {r.status}
                    </span>
                  </div>

                  {r.videoUrl && (
                    <video src={r.videoUrl} controls className="w-full rounded-lg flex-1 mb-2" />
                  )}
                  {r.status === "generating" && (
                    <div className="flex-1 flex items-center justify-center py-8">
                      <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                    </div>
                  )}
                  {r.error && (
                    <p className="text-[10px] text-red-400 mb-2">{r.error.slice(0, 100)}</p>
                  )}

                  {r.videoUrl && (
                    <button
                      onClick={() => handlePick(r)}
                      className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold transition"
                    >
                      Use this one
                    </button>
                  )}
                </div>
              ))}
            </div>

            {!running && (
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setResults([]); setSelectedModels([]); }}
                  className="rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-4 py-2 text-xs font-medium transition"
                >
                  Try again
                </button>
                <button onClick={onClose} className="rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-4 py-2 text-xs font-medium transition">Close</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
