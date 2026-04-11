"use client";

import { useState } from "react";
import { parseScript } from "@/lib/script-to-storyboard";
import { MODEL_CATALOG } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (script: string, aspectRatio: string) => void;
}

export default function ScriptImport({ open, onClose, onApply }: Props) {
  const [script, setScript] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");

  if (!open) return null;

  const preview = script.trim() ? parseScript(script) : [];

  const handleApply = () => {
    if (!script.trim()) return;
    onApply(script, aspectRatio);
    setScript("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-zinc-100">Script to Storyboard</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Paste a script or description. CutAgent splits it into scenes and picks the best model for each.
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-lg leading-none">&times;</button>
        </div>

        {/* Script input */}
        <textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder={`Example:\n\nOpen on a person scrolling their phone, they stop and look excited.\n\nCut to a close-up hero shot of the product rotating on a white surface.\n\nA happy customer using the product in their kitchen, smiling.\n\nEnd with the product centered, space for a "Shop Now" text overlay.`}
          rows={8}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-3 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 resize-none mb-3"
        />

        {/* Aspect ratio */}
        <div className="flex gap-2 mb-4">
          <span className="text-[10px] text-zinc-500 self-center">Format:</span>
          {["9:16", "16:9", "1:1"].map((ar) => (
            <button
              key={ar}
              onClick={() => setAspectRatio(ar)}
              className={`rounded-lg px-3 py-1 text-[11px] font-medium transition border ${
                aspectRatio === ar ? "border-blue-500 bg-blue-500/10 text-blue-300" : "border-zinc-700 bg-zinc-800 text-zinc-400"
              }`}
            >
              {ar}
            </button>
          ))}
        </div>

        {/* Scene preview */}
        {preview.length > 0 && (
          <div className="flex-1 overflow-y-auto mb-4 space-y-1.5 pr-1">
            <span className="text-[10px] text-zinc-500 block mb-1">{preview.length} scenes detected:</span>
            {preview.map((p, i) => {
              const model = MODEL_CATALOG.find((m) => m.name === p.suggestedModel);
              return (
                <div key={`preview-${i}`} className="flex gap-2 items-start rounded-lg bg-zinc-800/50 border border-zinc-700 px-3 py-2">
                  <span className="text-[10px] font-bold text-zinc-500 w-5 pt-0.5">S{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-blue-400">{p.suggestedModel}</span>
                      <span className="text-[10px] text-zinc-600">{p.duration}s</span>
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">{p.description.slice(0, 120)}{p.description.length > 120 ? "..." : ""}</p>
                    {p.voiceoverText && (
                      <p className="text-[10px] text-pink-400/60 mt-1 italic">{p.voiceoverText.slice(0, 80)}{p.voiceoverText.length > 80 ? "..." : ""}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-4 py-2 text-xs font-medium transition">Cancel</button>
          <button
            onClick={handleApply}
            disabled={preview.length === 0}
            className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 px-5 py-2 text-xs font-semibold transition"
          >
            Create {preview.length} Scene{preview.length !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
