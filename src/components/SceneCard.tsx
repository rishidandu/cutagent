"use client";

import { MODEL_CATALOG, type Scene } from "@/types";

interface Props {
  scene: Scene;
  onUpdate: (scene: Scene) => void;
  onGenerate: () => void;
  onRemove: () => void;
}

export default function SceneCard({ scene, onUpdate, onGenerate, onRemove }: Props) {
  const model = MODEL_CATALOG.find((m) => m.id === scene.modelId) ?? MODEL_CATALOG[0];
  const durations = model.supportedDurations;
  const estCost = (model.costPerSec * scene.duration).toFixed(2);
  const isActive = scene.status === "generating" || scene.status === "queued";

  return (
    <div className={`rounded-xl border p-4 space-y-3 transition ${
      scene.status === "completed" ? "bg-emerald-950/20 border-emerald-800/40" :
      scene.status === "failed" ? "bg-red-950/20 border-red-800/40" :
      isActive ? "bg-blue-950/20 border-blue-800/40" :
      "bg-zinc-900 border-zinc-800"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-400">Scene {scene.index + 1}</span>
        <div className="flex items-center gap-2">
          {scene.status !== "idle" && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              scene.status === "completed" ? "bg-emerald-900/60 text-emerald-300" :
              scene.status === "generating" ? "bg-blue-900/60 text-blue-300 animate-pulse" :
              scene.status === "queued" ? "bg-amber-900/60 text-amber-300" :
              scene.status === "failed" ? "bg-red-900/60 text-red-300" : ""
            }`}>
              {scene.status === "generating" ? `Generating${scene.progress > 0 ? ` ${scene.progress}%` : "..."}` : scene.status}
            </span>
          )}
          <button onClick={onRemove} className="text-zinc-600 hover:text-red-400 text-xs">✕</button>
        </div>
      </div>

      {/* Style Harness indicator */}
      {scene.referenceImageUrl && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-violet-950/30 border border-violet-800/30">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
          <span className="text-[10px] text-violet-300">Style linked from previous scene</span>
          <button
            onClick={() => onUpdate({ ...scene, referenceImageUrl: undefined })}
            className="ml-auto text-[10px] text-violet-500 hover:text-violet-300"
          >
            Unlink
          </button>
        </div>
      )}

      {/* Model selector */}
      <select
        value={scene.modelId}
        onChange={(e) => {
          const newModel = MODEL_CATALOG.find((m) => m.id === e.target.value);
          const newDuration = newModel?.supportedDurations[0] ?? scene.duration;
          onUpdate({ ...scene, modelId: e.target.value, duration: newDuration });
        }}
        className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
      >
        {MODEL_CATALOG.map((m) => (
          <option key={m.id} value={m.id}>{m.name} — {m.bestFor}</option>
        ))}
      </select>

      {/* Prompt */}
      <textarea
        placeholder="Describe this scene..."
        value={scene.prompt}
        onChange={(e) => onUpdate({ ...scene, prompt: e.target.value })}
        rows={3}
        className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 resize-none"
      />

      {/* Duration + cost */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {durations.map((d) => (
            <button
              key={d}
              onClick={() => onUpdate({ ...scene, duration: d })}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                scene.duration === d
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {d}s
            </button>
          ))}
        </div>
        <span className="text-[10px] text-zinc-500 ml-auto">~${estCost}</span>
      </div>

      {/* Error */}
      {scene.error && (
        <p className="text-[11px] text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
          {scene.error}
        </p>
      )}

      {/* Video preview */}
      {scene.videoUrl && (
        <video src={scene.videoUrl} controls className="w-full rounded-lg" />
      )}

      {/* Progress bar */}
      {isActive && (
        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all duration-500 animate-pulse" style={{ width: `${Math.max(scene.progress, 15)}%` }} />
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={onGenerate}
        disabled={isActive || !scene.prompt.trim()}
        className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 px-3 py-2.5 text-xs font-semibold transition"
      >
        {isActive ? "Generating..." : scene.status === "completed" ? "Regenerate" : "Generate"}
      </button>
    </div>
  );
}
