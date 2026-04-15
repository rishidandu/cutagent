"use client";

import { useRef } from "react";
import { MODEL_CATALOG, AVATAR_MODEL_CATALOG, type Scene, type SceneRole, type StyleContext } from "@/types";
import { estimateSpeechDuration } from "@/lib/audio";

const ROLE_COLORS: Record<SceneRole, string> = {
  hook: "bg-orange-500/20 text-orange-300 border-orange-700/40",
  problem: "bg-red-500/20 text-red-300 border-red-700/40",
  solution: "bg-blue-500/20 text-blue-300 border-blue-700/40",
  proof: "bg-emerald-500/20 text-emerald-300 border-emerald-700/40",
  cta: "bg-amber-500/20 text-amber-300 border-amber-700/40",
  custom: "bg-zinc-500/20 text-zinc-400 border-zinc-700/40",
};

const ROLE_OPTIONS: SceneRole[] = ["hook", "problem", "solution", "proof", "cta", "custom"];

interface Props {
  scene: Scene;
  isFirst: boolean;
  isLast: boolean;
  keyConnected: boolean;
  styleContext: StyleContext;
  onUpdate: (scene: Scene) => void;
  onGenerate: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onCompare: () => void;
  onGenerateAll: () => void;
}

const REF_BADGE_COLORS: Record<string, string> = {
  character: "bg-blue-500/20 text-blue-300",
  style: "bg-violet-500/20 text-violet-300",
  product: "bg-emerald-500/20 text-emerald-300",
  "last-frame": "bg-amber-500/20 text-amber-300",
};

export default function SceneCard({
  scene, isFirst, isLast, keyConnected, styleContext,
  onUpdate, onGenerate, onRemove, onMoveUp, onMoveDown, onCompare, onGenerateAll,
}: Props) {
  const model = MODEL_CATALOG.find((m) => m.id === scene.modelId) ?? MODEL_CATALOG[0];
  const durations = model.supportedDurations;
  const estCost = (model.costPerSec * scene.duration).toFixed(2);
  const isActive = scene.status === "generating" || scene.status === "queued";

  // Determine which references will be used for this scene
  const activeTypes = scene.activeReferenceTypes ?? styleContext.defaultReferenceTypes;
  const activeRefs = styleContext.references.filter((r) => activeTypes.includes(r.type));
  const hasStyleBrief = styleContext.brief.description.trim().length > 0;

  return (
    <div className={`rounded-xl border p-4 space-y-3 transition ${
      scene.status === "completed" ? "bg-emerald-950/20 border-emerald-800/40" :
      scene.status === "failed" ? "bg-red-950/20 border-red-800/40" :
      isActive ? "bg-blue-950/20 border-blue-800/40" :
      "bg-zinc-900 border-zinc-800"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {/* Reorder buttons */}
          <div className="flex flex-col -space-y-0.5 mr-1">
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              className="text-zinc-600 hover:text-zinc-300 disabled:text-zinc-800 disabled:cursor-not-allowed text-[10px] leading-none p-0.5 transition"
              title="Move up"
            >
              ▲
            </button>
            <button
              onClick={onMoveDown}
              disabled={isLast}
              className="text-zinc-600 hover:text-zinc-300 disabled:text-zinc-800 disabled:cursor-not-allowed text-[10px] leading-none p-0.5 transition"
              title="Move down"
            >
              ▼
            </button>
          </div>
          <span className="text-xs font-bold text-zinc-400">Scene {scene.index + 1}</span>
          <select
            value={scene.role ?? "custom"}
            onChange={(e) => onUpdate({ ...scene, role: e.target.value as SceneRole })}
            className={`text-[9px] font-semibold uppercase tracking-wider rounded-full border px-2 py-0.5 cursor-pointer focus:outline-none ${ROLE_COLORS[scene.role ?? "custom"]}`}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
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
          <button onClick={onRemove} className="text-zinc-600 hover:text-red-400 text-xs transition">✕</button>
        </div>
      </div>

      {/* Style context badges */}
      {(hasStyleBrief || activeRefs.length > 0) && (
        <div className="flex flex-wrap gap-1">
          {hasStyleBrief && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 border border-violet-800/30">
              Brief
            </span>
          )}
          {activeRefs.map((ref, idx) => (
            <span
              key={`${ref.id}-${idx}`}
              className={`text-[9px] px-1.5 py-0.5 rounded ${REF_BADGE_COLORS[ref.type] ?? "bg-zinc-700 text-zinc-400"}`}
            >
              {ref.type === "last-frame" ? "Chain" : ref.type}
            </span>
          ))}
          {model.consistency && activeRefs.length > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
              {model.consistency.mechanism.replace(/-/g, " ")}
            </span>
          )}
        </div>
      )}

      {/* Scene type toggle: Video / Avatar */}
      <div className="flex gap-1">
        <button
          onClick={() => onUpdate({ ...scene, sceneType: "video" })}
          className={`px-3 py-1 rounded-md text-[10px] font-medium transition ${
            (scene.sceneType ?? "video") === "video"
              ? "bg-blue-600 text-white"
              : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Video
        </button>
        <button
          onClick={() => onUpdate({ ...scene, sceneType: "avatar", modelId: AVATAR_MODEL_CATALOG[0]?.id ?? scene.modelId })}
          className={`px-3 py-1 rounded-md text-[10px] font-medium transition ${
            scene.sceneType === "avatar"
              ? "bg-purple-600 text-white"
              : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Avatar
        </button>
      </div>

      {scene.sceneType === "avatar" ? (
        <AvatarUI scene={scene} onUpdate={onUpdate} />
      ) : (
        <>
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
              <option key={m.id} value={m.id}>
                {m.name} — {m.bestFor} {m.consistency ? "" : "(no refs)"}
              </option>
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
        </>
      )}

      {/* Voiceover script */}
      <div className="relative">
        <textarea
          placeholder="Voiceover line for this scene..."
          value={scene.voiceoverText ?? ""}
          onChange={(e) => onUpdate({ ...scene, voiceoverText: e.target.value })}
          rows={2}
          className="w-full rounded-lg bg-zinc-800/60 border border-pink-900/30 px-3 py-2 text-xs placeholder:text-zinc-600 focus:outline-none focus:border-pink-500 resize-none"
        />
        {/* Duration estimate + VO label */}
        {(() => {
          const vo = scene.voiceoverText?.trim() ?? "";
          const sceneDur = (scene.trimEnd ?? scene.duration) - (scene.trimStart ?? 0);
          const estDur = vo ? estimateSpeechDuration(vo) : 0;
          const tooLong = estDur > sceneDur + 0.5;
          const fits = estDur > 0 && !tooLong;
          return (
            <div className="absolute top-1.5 right-2 flex items-center gap-1.5">
              {vo && (
                <span className={`text-[8px] font-mono ${tooLong ? "text-red-400" : fits ? "text-emerald-400/60" : "text-zinc-500"}`}>
                  ~{estDur.toFixed(1)}s/{sceneDur}s
                </span>
              )}
              <span className="text-[8px] text-pink-500/50 uppercase tracking-wider">VO</span>
            </div>
          );
        })()}
        {scene.audioUrl && (
          <audio src={scene.audioUrl} controls className="w-full h-7 mt-1" />
        )}
        {scene.audioStatus === "generating" && (
          <span className="text-[10px] text-pink-300 animate-pulse mt-1 block">Generating voiceover...</span>
        )}
      </div>

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

      {/* Trim controls — only show for completed scenes */}
      {scene.videoUrl && (() => {
        const trimStart = scene.trimStart ?? 0;
        const trimEnd = scene.trimEnd ?? scene.duration;
        return (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 w-6">Trim</span>
          <div className="flex-1 flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={trimEnd - 0.1}
              step={0.1}
              value={trimStart}
              onChange={(e) => onUpdate({ ...scene, trimStart: Math.max(0, Number(e.target.value)) })}
              className="w-14 rounded bg-zinc-800 border border-zinc-700 px-1.5 py-1 text-[10px] text-center focus:outline-none focus:border-blue-500"
            />
            <div className="flex-1 h-1.5 rounded-full bg-zinc-800 relative">
              <div
                className="absolute h-full bg-blue-500/50 rounded-full"
                style={{
                  left: `${(trimStart / scene.duration) * 100}%`,
                  right: `${100 - (trimEnd / scene.duration) * 100}%`,
                }}
              />
            </div>
            <input
              type="number"
              min={trimStart + 0.1}
              max={scene.duration}
              step={0.1}
              value={trimEnd}
              onChange={(e) => onUpdate({ ...scene, trimEnd: Math.min(scene.duration, Number(e.target.value)) })}
              className="w-14 rounded bg-zinc-800 border border-zinc-700 px-1.5 py-1 text-[10px] text-center focus:outline-none focus:border-blue-500"
            />
          </div>
          <span className="text-[10px] text-zinc-600">{(trimEnd - trimStart).toFixed(1)}s</span>
        </div>
        );
      })()}

      {/* Error */}
      {scene.error && (
        <p className="text-[11px] text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
          {scene.error}
        </p>
      )}

      {/* Video preview */}
      {scene.videoUrl && (
        <video src={scene.videoUrl} controls muted={!!scene.audioUrl} className="w-full rounded-lg" />
      )}

      {/* Progress bar */}
      {isActive && (
        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all duration-500 animate-pulse" style={{ width: `${Math.max(scene.progress, 15)}%` }} />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-1.5">
        <button
          onClick={onGenerate}
          disabled={isActive || !scene.prompt.trim() || !keyConnected}
          className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 px-3 py-2.5 text-xs font-semibold transition"
        >
          {!keyConnected ? "Connect key" : isActive ? "Generating..." : scene.status === "completed" ? "Regenerate" : "Generate"}
        </button>
        {scene.voiceoverText?.trim() && (
          <button
            onClick={onGenerateAll}
            disabled={isActive || !scene.prompt.trim() || !keyConnected}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 px-3 py-2.5 text-xs font-semibold transition"
            title="Generate video + voiceover audio"
          >
            Video + Audio
          </button>
        )}
        <button
          onClick={onCompare}
          disabled={!scene.prompt.trim() || !keyConnected}
          className="rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 border border-zinc-700 px-2.5 py-2.5 text-xs font-medium transition"
          title="Compare this scene across multiple models"
        >
          &#x2194;
        </button>
      </div>
    </div>
  );
}

// ── Avatar sub-component ──

function AvatarUI({ scene, onUpdate }: { scene: Scene; onUpdate: (s: Scene) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFaceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onUpdate({ ...scene, avatarImageUrl: reader.result as string });
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <>
      {/* Avatar model selector */}
      <select
        value={scene.modelId}
        onChange={(e) => onUpdate({ ...scene, modelId: e.target.value })}
        className="w-full rounded-lg bg-zinc-800 border border-purple-900/30 px-3 py-2 text-xs focus:outline-none focus:border-purple-500"
      >
        {AVATAR_MODEL_CATALOG.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} — {m.bestFor} (${m.costPerSec}/s)
          </option>
        ))}
      </select>

      {/* Face upload */}
      <div className="space-y-1.5">
        <span className="text-[10px] text-zinc-500">Face / portrait photo</span>
        {scene.avatarImageUrl ? (
          <div className="flex items-center gap-3">
            <img
              src={scene.avatarImageUrl}
              alt="Avatar face"
              className="h-16 w-16 rounded-xl object-cover border border-purple-700/30"
            />
            <div className="flex-1">
              <p className="text-[10px] text-purple-300">Face uploaded</p>
              <button
                onClick={() => onUpdate({ ...scene, avatarImageUrl: undefined })}
                className="text-[10px] text-zinc-500 hover:text-red-400 mt-0.5"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-lg border border-dashed border-purple-700/30 hover:border-purple-500/50 bg-purple-950/20 hover:bg-purple-950/30 px-4 py-4 text-xs text-purple-300/60 transition"
          >
            Click to upload a face photo
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFaceUpload} className="hidden" />
      </div>
    </>
  );
}
