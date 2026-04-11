"use client";

import { useEffect, useRef, useState } from "react";
import type { Scene } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  scenes: Scene[];
}

/**
 * Full storyboard preview — plays completed scenes back-to-back.
 */
export default function PreviewPlayer({ open, onClose, scenes }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const completedScenes = scenes.filter((s) => s.videoUrl);

  useEffect(() => {
    if (open) {
      setCurrentIdx(0);
      setIsPlaying(true);
    }
  }, [open]);

  if (!open || completedScenes.length === 0) return null;

  // Guard against out-of-bounds if scenes change while modal is open
  const safeIdx = Math.min(currentIdx, completedScenes.length - 1);
  const current = completedScenes[safeIdx];
  const totalDuration = completedScenes.reduce((s, sc) => s + ((sc.trimEnd ?? sc.duration) - (sc.trimStart ?? 0)), 0);

  const handleEnded = () => {
    if (safeIdx < completedScenes.length - 1) {
      setCurrentIdx(safeIdx + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const handleVideoLoad = () => {
    if (isPlaying && videoRef.current) {
      const start = current.trimStart ?? 0;
      videoRef.current.currentTime = start;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && current) {
      const end = current.trimEnd ?? current.duration;
      if (videoRef.current.currentTime >= end) {
        handleEnded();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-zinc-100">Preview</h2>
            <p className="text-[11px] text-zinc-500">
              Scene {currentIdx + 1} of {completedScenes.length} · {totalDuration.toFixed(0)}s total
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-lg leading-none">&times;</button>
        </div>

        {/* Video */}
        <div className="relative rounded-xl overflow-hidden bg-black mb-4">
          <video
            ref={videoRef}
            src={current?.videoUrl}
            onLoadedData={handleVideoLoad}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            className="w-full aspect-video"
            playsInline
          />
          {/* Scene indicator */}
          <div className="absolute top-3 left-3 bg-black/60 rounded-lg px-2 py-1">
            <span className="text-[10px] text-white font-medium">Scene {currentIdx + 1}</span>
          </div>
        </div>

        {/* Scene track */}
        <div className="flex gap-1 mb-4">
          {completedScenes.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { setCurrentIdx(i); setIsPlaying(true); }}
              className={`flex-1 h-1.5 rounded-full transition ${
                i === currentIdx ? "bg-blue-500" : i < currentIdx ? "bg-emerald-500" : "bg-zinc-700"
              }`}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => { setCurrentIdx(0); setIsPlaying(true); }}
            className="rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 text-xs transition"
          >
            Restart
          </button>
          <button
            onClick={() => {
              if (videoRef.current) {
                if (isPlaying) { videoRef.current.pause(); }
                else { videoRef.current.play(); }
                setIsPlaying(!isPlaying);
              }
            }}
            className="rounded-lg bg-blue-600 hover:bg-blue-500 px-5 py-1.5 text-xs font-semibold transition"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            onClick={() => { if (currentIdx < completedScenes.length - 1) { setCurrentIdx((i) => i + 1); setIsPlaying(true); } }}
            disabled={currentIdx >= completedScenes.length - 1}
            className="rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 border border-zinc-700 px-3 py-1.5 text-xs transition"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
