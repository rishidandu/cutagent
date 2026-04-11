"use client";

import { useState, useRef } from "react";
import type { StyleContext, ReferenceImage, ReferenceType } from "@/types";

interface Props {
  styleContext: StyleContext;
  onChange: (ctx: StyleContext) => void;
}

const REF_TYPE_LABELS: Record<ReferenceType, string> = {
  character: "Character",
  style: "Style",
  product: "Product",
  "last-frame": "Last Frame",
};

const REF_TYPE_COLORS: Record<ReferenceType, string> = {
  character: "bg-blue-500/20 text-blue-300 border-blue-700",
  style: "bg-violet-500/20 text-violet-300 border-violet-700",
  product: "bg-emerald-500/20 text-emerald-300 border-emerald-700",
  "last-frame": "bg-amber-500/20 text-amber-300 border-amber-700",
};

export default function StylePanel({ styleContext: ctx, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<ReferenceType>("character");

  const updateBrief = (field: string, value: string) => {
    onChange({ ...ctx, brief: { ...ctx.brief, [field]: value } });
  };

  const removeRef = (id: string) => {
    onChange({ ...ctx, references: ctx.references.filter((r) => r.id !== id) });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const newRef: ReferenceImage = {
        id: `upload-${Date.now()}`,
        url: dataUrl,
        type: uploadType,
        label: `${REF_TYPE_LABELS[uploadType]} ref`,
      };
      onChange({ ...ctx, references: [...ctx.references, newRef] });
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const hasBrief = ctx.brief.description.trim() || ctx.brief.characterDescription.trim();
  const hasRefs = ctx.references.length > 0;
  const refsByType = ctx.references.reduce<Record<string, ReferenceImage[]>>((acc, r) => {
    (acc[r.type] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/30 transition"
      >
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${hasBrief || hasRefs ? "bg-violet-400" : "bg-zinc-600"}`} />
          <span className="text-xs font-semibold text-zinc-300">Style Engine</span>
          {hasBrief && (
            <span className="text-[10px] text-violet-400 bg-violet-500/10 rounded px-1.5 py-0.5 border border-violet-800">
              Brief active
            </span>
          )}
          {hasRefs && (
            <span className="text-[10px] text-amber-400 bg-amber-500/10 rounded px-1.5 py-0.5 border border-amber-800">
              {ctx.references.length} ref{ctx.references.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <span className="text-zinc-600 text-xs">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-zinc-800">
          {/* Style Brief — always visible when expanded */}
          <div className="pt-3">
            <label className="text-[11px] text-zinc-500 block mb-1.5" htmlFor="style-brief">
              Style Brief — prepended to every scene prompt
            </label>
            <textarea
              id="style-brief"
              value={ctx.brief.description}
              onChange={(e) => updateBrief("description", e.target.value)}
              placeholder="e.g. Cinematic, warm golden-hour lighting, shallow depth of field. Premium commercial aesthetic. Consistent color grade throughout."
              rows={3}
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-4">
            {/* Strength slider */}
            <div className="flex-1">
              <label className="text-[10px] text-zinc-500 block mb-1" htmlFor="style-strength">
                Strength: {Math.round(ctx.strength * 100)}%
              </label>
              <input
                id="style-strength"
                type="range"
                min={0}
                max={100}
                value={Math.round(ctx.strength * 100)}
                onChange={(e) => onChange({ ...ctx, strength: Number(e.target.value) / 100 })}
                className="w-full h-1.5 rounded-full appearance-none bg-zinc-700 accent-violet-500"
              />
            </div>

            {/* Auto-chain toggle */}
            <button
              onClick={() => onChange({ ...ctx, autoChainLastFrame: !ctx.autoChainLastFrame })}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[10px] font-medium transition ${
                ctx.autoChainLastFrame
                  ? "border-amber-700 bg-amber-950/40 text-amber-300"
                  : "border-zinc-700 bg-zinc-800 text-zinc-500"
              }`}
              title="Auto-extract last frame from each completed scene and chain to the next"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${ctx.autoChainLastFrame ? "bg-amber-400" : "bg-zinc-600"}`} />
              Auto-chain
            </button>
          </div>

          {/* Product / reference image strip — always visible so user sees extracted assets */}
          {ctx.references.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-semibold text-zinc-400">
                  Product references ({ctx.references.length})
                </span>
                <span className="text-[10px] text-emerald-400/70">
                  Passed to models as visual context
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {ctx.references.map((ref, idx) => (
                  <div key={`ref-strip-${idx}`} className="relative flex-shrink-0 group">
                    <img
                      src={ref.url}
                      alt={ref.label}
                      className="w-16 h-16 rounded-lg object-cover border border-zinc-700"
                    />
                    <span className={`absolute bottom-0.5 left-0.5 text-[7px] rounded px-1 py-0.5 border ${REF_TYPE_COLORS[ref.type]}`}>
                      {REF_TYPE_LABELS[ref.type]}
                    </span>
                    <button
                      onClick={() => removeRef(ref.id)}
                      className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-black/60 text-zinc-400 hover:text-red-400 text-[8px] leading-none opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 transition"
          >
            {showAdvanced ? "▲ Hide advanced" : "▼ Show advanced — character, lighting, references"}
          </button>

          {showAdvanced && (
            <>
              {/* Character + lighting + palette fields */}
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1" htmlFor="style-character">
                    Character description
                  </label>
                  <input
                    id="style-character"
                    type="text"
                    value={ctx.brief.characterDescription}
                    onChange={(e) => updateBrief("characterDescription", e.target.value)}
                    placeholder="e.g. Young woman, dark curly hair, green eyes, blue denim jacket"
                    className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-xs placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1" htmlFor="style-lighting">
                      Lighting
                    </label>
                    <input
                      id="style-lighting"
                      type="text"
                      value={ctx.brief.lighting}
                      onChange={(e) => updateBrief("lighting", e.target.value)}
                      placeholder="e.g. Golden hour, warm"
                      className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-1" htmlFor="style-palette">
                      Color palette
                    </label>
                    <input
                      id="style-palette"
                      type="text"
                      value={ctx.brief.colorPalette}
                      onChange={(e) => updateBrief("colorPalette", e.target.value)}
                      placeholder="e.g. Warm tones, muted"
                      className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
              </div>

              {/* Reference Image Bank */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-zinc-500">Reference images</span>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={uploadType}
                      onChange={(e) => setUploadType(e.target.value as ReferenceType)}
                      className="rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400"
                    >
                      <option value="character">Character</option>
                      <option value="style">Style</option>
                      <option value="product">Product</option>
                    </select>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-2.5 py-1 text-[10px] font-medium text-zinc-400 transition"
                    >
                      + Upload
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {ctx.references.length === 0 ? (
                  <p className="text-[10px] text-zinc-600 py-2 text-center border border-dashed border-zinc-800 rounded-lg">
                    No references yet. Upload an image or extract from a completed scene.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {ctx.references.map((ref, idx) => (
                      <div key={`${ref.id}-${idx}`} className="relative group">
                        <img
                          src={ref.url}
                          alt={ref.label}
                          className="w-full aspect-square rounded-lg object-cover border border-zinc-700"
                        />
                        <span className={`absolute bottom-1 left-1 text-[8px] rounded px-1 py-0.5 border ${REF_TYPE_COLORS[ref.type]}`}>
                          {REF_TYPE_LABELS[ref.type]}
                        </span>
                        <button
                          onClick={() => removeRef(ref.id)}
                          className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/60 text-zinc-400 hover:text-red-400 text-[10px] leading-none opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
