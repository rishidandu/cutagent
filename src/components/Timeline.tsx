"use client";

import { MODEL_CATALOG, type Scene } from "@/types";

interface Props {
  scenes: Scene[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export default function Timeline({ scenes, selectedIndex, onSelect }: Props) {
  const totalDuration = scenes.reduce((s, sc) => s + ((sc.trimEnd ?? sc.duration) - (sc.trimStart ?? 0)), 0);
  const totalCost = scenes.reduce((s, sc) => {
    const model = MODEL_CATALOG.find((m) => m.id === sc.modelId);
    return s + (model?.costPerSec ?? 0) * sc.duration;
  }, 0);

  return (
    <div className="bg-zinc-900/80 backdrop-blur border-t border-zinc-800 px-4 py-3">
      <div className="flex items-center gap-3 mb-2">
        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Timeline</h3>
        <span className="text-[10px] text-zinc-600">{totalDuration}s · ~${totalCost.toFixed(2)}</span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {scenes.map((scene, i) => {
          const model = MODEL_CATALOG.find((m) => m.id === scene.modelId);
          return (
            <button
              key={scene.id}
              onClick={() => onSelect(i)}
              className={`flex-shrink-0 rounded-lg px-3 py-2 text-left transition border ${
                selectedIndex === i
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-zinc-800 bg-zinc-800/30 hover:border-zinc-700"
              }`}
              style={{ minWidth: `${Math.max(scene.duration * 18, 70)}px` }}
            >
              <div className="text-[10px] font-medium text-zinc-300">Scene {i + 1}</div>
              <div className="text-[9px] text-zinc-500">{model?.name ?? "?"} · {scene.duration}s</div>
              <div className={`mt-1 h-1 w-full rounded-full ${
                scene.status === "completed" ? "bg-emerald-500" :
                scene.status === "generating" ? "bg-blue-500 animate-pulse" :
                scene.status === "queued" ? "bg-amber-500 animate-pulse" :
                scene.status === "failed" ? "bg-red-500" :
                "bg-zinc-700"
              }`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
