"use client";

import { useState } from "react";
import { MODEL_CATALOG, type StyleContext, type Scene } from "@/types";
import { generateScene } from "@/lib/fal";
import {
  HOOK_STYLES,
  BUDGET_MODELS,
  planHookVariations,
  expandHookToStoryboard,
  estimateHookLabCost,
  type HookVariation,
} from "@/lib/hook-lab";
import type { ProductData } from "@/lib/storyboard-generator";

interface Props {
  open: boolean;
  onClose: () => void;
  product: ProductData;
  styleContext: StyleContext;
  onExpandToStoryboard: (storyboards: Omit<Scene, "id">[][]) => void;
}

type Phase = "configure" | "generating" | "select";

export default function HookLab({ open, onClose, product, styleContext, onExpandToStoryboard }: Props) {
  const [phase, setPhase] = useState<Phase>("configure");
  const [selectedStyles, setSelectedStyles] = useState<Set<string>>(
    new Set(HOOK_STYLES.map((s) => s.id)),
  );
  const [selectedModels, setSelectedModels] = useState<Set<string>>(
    new Set(BUDGET_MODELS.slice(0, 2).map((m) => m.id)),
  );
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [variations, setVariations] = useState<HookVariation[]>([]);
  const [winners, setWinners] = useState<Set<string>>(new Set());

  if (!open) return null;

  const plan = planHookVariations(product, {
    selectedStyles: Array.from(selectedStyles),
    selectedModels: Array.from(selectedModels),
    aspectRatio,
  });
  const totalCost = estimateHookLabCost(plan);
  const completedCount = variations.filter((v) => v.status === "completed").length;
  const failedCount = variations.filter((v) => v.status === "failed").length;

  const toggleStyle = (id: string) => {
    setSelectedStyles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleModel = (id: string) => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleWinner = (id: string) => {
    setWinners((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  };

  // ── Generate all hooks (chunked in batches of 5) ──
  const handleGenerate = async () => {
    const planned = planHookVariations(product, {
      selectedStyles: Array.from(selectedStyles),
      selectedModels: Array.from(selectedModels),
      aspectRatio,
    });
    setVariations(planned.map((v) => ({ ...v, status: "generating" as const })));
    setPhase("generating");

    // Generate ONE AT A TIME to avoid fal.ai rate limits / account locks
    for (let i = 0; i < planned.length; i++) {
      const v = planned[i];
      await (async () => {
          const globalIdx = i;
          const hookScene: Partial<Scene> & { id: string; modelId: string; prompt: string; duration: number; aspectRatio: string } = {
            id: v.id,
            index: 0,
            role: "hook",
            modelId: v.modelId,
            prompt: v.prompt,
            duration: v.duration,
            aspectRatio: v.aspectRatio,
            trimStart: 0,
            trimEnd: v.duration,
            voiceoverText: "",
            status: "generating",
            progress: 0,
          };
          try {
            // Use text-to-video (no image refs) for cheap hook testing
            const hookStyleContext = {
              ...styleContext,
              references: [],
              autoChainLastFrame: false,
            };
            console.log(`[HookLab] Generating hook ${globalIdx + 1}/${planned.length}: ${v.hookStyleLabel} / ${v.modelName}`);
            console.log(`[HookLab] Prompt (first 100): ${v.prompt.slice(0, 100)}`);
            const result = await generateScene({
              scene: hookScene as Scene,
              styleContext: hookStyleContext,
            });
            console.log(`[HookLab] Hook ${globalIdx + 1} completed: ${result.videoUrl?.slice(0, 60)}`);
            setVariations((prev) =>
              prev.map((item, j) =>
                j === globalIdx ? { ...item, status: "completed" as const, videoUrl: result.videoUrl } : item,
              ),
            );
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            console.error(`[HookLab] Hook ${globalIdx + 1} FAILED: ${errMsg}`);
            setVariations((prev) =>
              prev.map((item, j) =>
                j === globalIdx
                  ? { ...item, status: "failed" as const, error: errMsg }
                  : item,
              ),
            );
          }
      })();
    }

    setPhase("select");
  };

  // ── Expand winners into storyboards ──
  const handleExpand = () => {
    const winnerVariations = variations.filter((v) => winners.has(v.id) && v.videoUrl);
    const storyboards = winnerVariations.map((w) => expandHookToStoryboard(w, product));
    onExpandToStoryboard(storyboards);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm py-8">
      <div className="w-full max-w-6xl rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Hook Lab</h2>
              <span className="rounded-full bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 text-[10px] font-medium text-orange-300">
                Test 20+ hooks fast
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {product.title?.slice(0, 50)}{(product.title?.length ?? 0) > 50 ? "..." : ""}
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-lg">&times;</button>
        </div>

        <div className="p-6">
          {/* ── Phase 1: Configure ── */}
          {phase === "configure" && (
            <div className="space-y-6">
              {/* Hook styles */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-2">
                  Hook styles ({selectedStyles.size} selected)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {HOOK_STYLES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => toggleStyle(s.id)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs transition border ${
                        selectedStyles.has(s.id)
                          ? "border-orange-500/30 bg-orange-500/10 text-orange-200"
                          : "border-zinc-700 bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      <span>{s.emoji}</span>
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Models */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-2">
                  Models ({selectedModels.size} selected)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {BUDGET_MODELS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => toggleModel(m.id)}
                      className={`rounded-lg px-3 py-2 text-xs transition border ${
                        selectedModels.has(m.id)
                          ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
                          : "border-zinc-700 bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {m.name} <span className="text-zinc-500">${m.costPerSec}/s</span>
                    </button>
                  ))}
                  {/* Option to add more expensive models */}
                  {MODEL_CATALOG.filter((m) => !BUDGET_MODELS.find((b) => b.id === m.id)).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => toggleModel(m.id)}
                      className={`rounded-lg px-3 py-2 text-xs transition border ${
                        selectedModels.has(m.id)
                          ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
                          : "border-zinc-700/50 bg-zinc-800/50 text-zinc-600"
                      }`}
                    >
                      {m.name} <span className="text-zinc-600">${m.costPerSec}/s</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect ratio */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-2">Format</label>
                <div className="flex gap-1.5">
                  {["9:16", "16:9", "1:1"].map((ar) => (
                    <button
                      key={ar}
                      onClick={() => setAspectRatio(ar)}
                      className={`rounded-lg px-3 py-1.5 text-xs transition border ${
                        aspectRatio === ar
                          ? "border-blue-500/30 bg-blue-500/10 text-blue-200"
                          : "border-zinc-700 bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {ar}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary + CTA */}
              <div className="flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-800/50 px-5 py-4">
                <div>
                  <span className="text-lg font-bold text-white">{plan.length}</span>
                  <span className="text-sm text-zinc-400 ml-1.5">hooks to generate</span>
                  <span className="text-sm text-amber-300 ml-3">~${totalCost.toFixed(2)}</span>
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={plan.length === 0 || selectedStyles.size === 0 || selectedModels.size === 0}
                  className="rounded-xl bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-700 disabled:text-zinc-500 px-6 py-2.5 text-sm font-semibold text-white transition shadow-[0_8px_24px_rgba(249,115,22,0.25)]"
                >
                  Generate {plan.length} Hooks
                </button>
              </div>
            </div>
          )}

          {/* ── Phase 2 & 3: Generation Grid + Selection ── */}
          {(phase === "generating" || phase === "select") && (
            <div className="space-y-4">
              {/* Progress bar */}
              <div className="flex items-center justify-between">
                <div className="text-xs text-zinc-400">
                  <span className="text-emerald-400 font-semibold">{completedCount}</span>
                  {failedCount > 0 && <span className="text-red-400 ml-1">({failedCount} failed)</span>}
                  <span className="ml-1">of {variations.length} generated</span>
                </div>
                {winners.size > 0 && (
                  <span className="text-xs text-orange-300">{winners.size} winner{winners.size !== 1 ? "s" : ""} selected</span>
                )}
              </div>
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${variations.length > 0 ? (completedCount / variations.length) * 100 : 0}%` }}
                />
              </div>

              {/* Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto pr-1">
                {variations.map((v) => (
                  <div
                    key={v.id}
                    className={`rounded-xl border p-2.5 transition cursor-pointer ${
                      winners.has(v.id)
                        ? "border-orange-500 bg-orange-500/10"
                        : v.status === "completed"
                        ? "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                        : v.status === "failed"
                        ? "border-red-800/40 bg-red-950/20"
                        : "border-zinc-800 bg-zinc-900"
                    }`}
                    onClick={() => v.status === "completed" && toggleWinner(v.id)}
                  >
                    {/* Video or placeholder */}
                    <div className="aspect-[9/16] rounded-lg overflow-hidden bg-zinc-900 mb-2">
                      {v.videoUrl ? (
                        <video
                          src={v.videoUrl}
                          className="w-full h-full object-cover"
                          controls
                          preload="metadata"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : v.status === "generating" ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="h-3 w-3 rounded-full bg-blue-400 animate-pulse" />
                        </div>
                      ) : v.status === "failed" ? (
                        <div className="w-full h-full flex items-center justify-center px-2">
                          <p className="text-[9px] text-red-400 text-center">{v.error?.slice(0, 60)}</p>
                        </div>
                      ) : (
                        <div className="w-full h-full bg-zinc-800" />
                      )}
                    </div>

                    {/* Labels */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px]">{v.hookStyleEmoji}</span>
                        <span className="text-[10px] font-medium text-zinc-300">{v.hookStyleLabel}</span>
                      </div>
                      <span className="text-[9px] text-zinc-500">{v.modelName}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[9px] text-zinc-600">${v.estimatedCost.toFixed(2)}</span>
                      {winners.has(v.id) && (
                        <span className="text-[9px] font-semibold text-orange-300">WINNER</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Expand CTA */}
              {phase === "select" && (
                <div className="flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-800/50 px-5 py-4">
                  <p className="text-xs text-zinc-400">
                    {winners.size === 0
                      ? "Click hooks to select winners (up to 3)"
                      : `${winners.size} winner${winners.size !== 1 ? "s" : ""} selected — ready to expand`}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setPhase("configure"); setVariations([]); setWinners(new Set()); }}
                      className="rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-700 transition"
                    >
                      Start over
                    </button>
                    <button
                      onClick={handleExpand}
                      disabled={winners.size === 0}
                      className="rounded-xl bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-700 disabled:text-zinc-500 px-6 py-2 text-xs font-semibold text-white transition shadow-[0_8px_24px_rgba(249,115,22,0.25)]"
                    >
                      Expand {winners.size} to Storyboard{winners.size !== 1 ? "s" : ""}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
