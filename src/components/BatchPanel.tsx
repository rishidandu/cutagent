"use client";

import { useState } from "react";
import type { Scene } from "@/types";
import { HOOK_STYLES } from "@/lib/hook-lab";

interface Props {
  open: boolean;
  onClose: () => void;
  scenes: Scene[];
  onGenerate: (variations: Omit<Scene, "id">[][]) => void;
}

export default function BatchPanel({ open, onClose, scenes, onGenerate }: Props) {
  const [count, setCount] = useState(3);
  const [productName, setProductName] = useState("");
  const [selectedHooks, setSelectedHooks] = useState<Set<string>>(
    new Set(["surprise", "problem", "pov"]),
  );

  if (!open) return null;

  const hasScenes = scenes.length > 0 && scenes.some((s) => s.prompt.trim());

  const toggleHook = (id: string) => {
    setSelectedHooks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGenerate = () => {
    if (!hasScenes) return;

    const product = productName.trim() || extractProductName(scenes[0]?.prompt ?? "");
    const hooks = HOOK_STYLES.filter((h) => selectedHooks.has(h.id));
    const variationCount = Math.min(count, hooks.length);
    const variations: Omit<Scene, "id">[][] = [];

    for (let i = 0; i < variationCount; i++) {
      const hook = hooks[i % hooks.length];
      const variant = scenes.map((s, idx) => {
        const base: Omit<Scene, "id"> = {
          index: idx,
          role: s.role ?? "custom",
          modelId: s.modelId,
          prompt: s.prompt,
          duration: s.duration,
          aspectRatio: s.aspectRatio,
          trimStart: 0,
          trimEnd: s.duration,
          voiceoverText: s.voiceoverText ?? "",
          status: "idle" as const,
          progress: 0,
        };
        // Replace Scene 1 hook with the variation
        if (idx === 0) {
          base.prompt = hook.template.replace(/\{product\}/g, product);
        }
        return base;
      });
      variations.push(variant);
    }

    onGenerate(variations);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-zinc-100">Batch Variations</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Generate multiple versions with different hooks. Same scenes 2-4, varied openers.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {!hasScenes ? (
          <p className="text-xs text-zinc-500 py-6 text-center">
            Add scenes with prompts first, then come back to generate variations.
          </p>
        ) : (
          <>
            {/* Product name */}
            <div className="mb-4">
              <label className="text-[11px] text-zinc-500 block mb-1.5" htmlFor="batch-product">
                Product name
              </label>
              <input
                id="batch-product"
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder={extractProductName(scenes[0]?.prompt ?? "") || "e.g. Stanley Tumbler"}
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Count selector */}
            <div className="mb-4">
              <label className="text-[11px] text-zinc-500 block mb-1.5" htmlFor="variation-count">
                Number of variations
              </label>
              <div className="flex gap-2">
                {[2, 3, 5, 8].map((n) => (
                  <button
                    key={n}
                    onClick={() => setCount(n)}
                    className={`rounded-lg px-4 py-2 text-xs font-medium transition ${
                      count === n
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700"
                    }`}
                  >
                    {n}x
                  </button>
                ))}
              </div>
            </div>

            {/* Hook style selector */}
            <div className="mb-4">
              <label className="text-[11px] text-zinc-500 block mb-1.5" htmlFor="hook-styles">
                Hook styles to use
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {HOOK_STYLES.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => toggleHook(h.id)}
                    className={`text-left rounded-lg px-3 py-2 text-xs transition border ${
                      selectedHooks.has(h.id)
                        ? "border-blue-600 bg-blue-500/10 text-blue-300"
                        : "border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/30 p-3 mb-4">
              <span className="text-[10px] text-zinc-500 block mb-2">
                Will generate {Math.min(count, selectedHooks.size)} storyboards ({scenes.length} scenes each)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {HOOK_STYLES.filter((h) => selectedHooks.has(h.id))
                  .slice(0, count)
                  .map((h, i) => (
                    <span
                      key={h.id}
                      className="text-[10px] bg-zinc-800 text-zinc-300 rounded px-2 py-1 border border-zinc-700"
                    >
                      V{i + 1}: {h.label}
                    </span>
                  ))}
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-4 py-2 text-xs font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!hasScenes || selectedHooks.size === 0}
            className="rounded-lg bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-800 disabled:text-zinc-600 px-5 py-2 text-xs font-semibold transition"
          >
            Create {Math.min(count, selectedHooks.size)} Variations
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Try to extract a product name from a scene prompt.
 * Looks for common patterns from our template system.
 */
function extractProductName(prompt: string): string {
  // Common patterns: "holding up X.", "of X being", "of X details", "discover X.", "reveals X"
  const patterns = [
    /holding up (.+?)[.,!]/i,
    /demonstration of (.+?) being/i,
    /discover(?:s|ing)? (.+?)[.,!]/i,
    /reveal(?:s|ing)? (.+?)[.,!]/i,
    /unboxing (.+?)[.,!]/i,
    /showcasing (.+?)[.,!]/i,
    /reviewing (.+?)[.,!]/i,
    /shot of (.+?) (?:details|textures|on|in|displayed)/i,
    /(.+?) displayed beautifully/i,
    /(.+?) centered/i,
  ];

  for (const re of patterns) {
    const m = prompt.match(re);
    if (m?.[1] && m[1].length < 60) return m[1].trim();
  }

  // Fallback: if prompt is short, use as-is
  if (prompt.length < 40) return prompt;
  return "your product";
}
