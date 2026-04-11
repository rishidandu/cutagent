"use client";

import { useState } from "react";
import { TEMPLATE_CATALOG, type Template } from "@/lib/templates";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (template: Template, productName: string) => void;
}

export default function TemplateGallery({ open, onClose, onSelect }: Props) {
  const [selected, setSelected] = useState<Template | null>(null);
  const [productName, setProductName] = useState("");

  if (!open) return null;

  const handleApply = () => {
    if (selected) {
      onSelect(selected, productName);
      setSelected(null);
      setProductName("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-zinc-100">Templates</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Pick a template, enter your product name, get a ready-to-generate storyboard
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4 overflow-y-auto flex-1 pr-1">
          {TEMPLATE_CATALOG.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              className={`text-left rounded-xl border p-4 transition ${
                selected?.id === t.id
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold bg-zinc-700 text-zinc-300 rounded px-1.5 py-0.5">
                  {t.icon}
                </span>
                <span className="text-sm font-semibold text-zinc-100">{t.name}</span>
                <span className="text-[10px] text-zinc-600 ml-auto">{t.aspectRatio}</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">{t.description}</p>
              <div className="flex gap-1 mt-2">
                {t.scenes.map((s, i) => (
                  <span
                    key={`scene-${t.id}-${i}`}
                    className="text-[9px] text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5"
                  >
                    {s.modelName.split(" ")[0]}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        {/* Selected Template Detail */}
        {selected && (
          <div className="rounded-xl border border-zinc-700 bg-zinc-800/30 p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-zinc-300">{selected.name}</span>
              <span className="text-[10px] text-zinc-500">{selected.scenes.length} scenes</span>
            </div>

            {/* Scene breakdown */}
            <div className="space-y-1.5 mb-3">
              {selected.scenes.map((s, i) => (
                <div key={`detail-${selected.id}-${i}`} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-500 w-5">S{i + 1}</span>
                  <span className="text-[10px] text-blue-400 w-20">{s.modelName}</span>
                  <span className="text-[10px] text-zinc-500 w-6">{s.duration}s</span>
                  <span className="text-[10px] text-zinc-600 truncate flex-1">
                    {s.promptTemplate.slice(0, 80)}...
                  </span>
                </div>
              ))}
            </div>

            {/* Product name input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApply()}
                placeholder="Your product name (e.g. 'AirPods Max')"
                className="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
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
            onClick={handleApply}
            disabled={!selected}
            className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 px-5 py-2 text-xs font-semibold transition"
          >
            Apply Template
          </button>
        </div>
      </div>
    </div>
  );
}
