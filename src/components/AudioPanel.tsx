"use client";

import { useState } from "react";
import {
  TTS_MODELS,
  MUSIC_MODELS,
  generateVoiceover,
  generateMusic,
  type AudioTrack,
} from "@/lib/audio";
import type { Scene } from "@/types";

interface Props {
  scenes: Scene[];
  audioTracks: AudioTrack[];
  voiceModelId: string;
  voiceId: string;
  onVoiceModelChange: (modelId: string, voiceId: string) => void;
  onGenerateSceneAudio: (sceneId: string) => void;
  onGenerateAllAudio: () => void;
  onAddTrack: (track: AudioTrack) => void;
  onRemoveTrack: (id: string) => void;
  onUpdateSceneVO: (sceneId: string, text: string) => void;
  totalDuration: number;
}

export default function AudioPanel({
  scenes, audioTracks, voiceModelId, voiceId,
  onVoiceModelChange, onGenerateSceneAudio, onGenerateAllAudio,
  onAddTrack, onRemoveTrack, onUpdateSceneVO, totalDuration,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [musicPrompt, setMusicPrompt] = useState("");
  const [musicModelId, setMusicModelId] = useState(MUSIC_MODELS[0].id);
  const [musicLoading, setMusicLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedTtsModel = TTS_MODELS.find((m) => m.id === voiceModelId) ?? TTS_MODELS[0];
  const scenesWithVO = scenes.filter((s) => s.voiceoverText?.trim());
  const scenesWithAudio = scenes.filter((s) => s.audioUrl);
  const musicTracks = audioTracks.filter((t) => t.type === "music");

  const handleMusic = async () => {
    if (!musicPrompt.trim()) return;
    setMusicLoading(true);
    setError("");
    try {
      const result = await generateMusic({
        prompt: musicPrompt,
        duration: Math.max(totalDuration, 10),
        musicModelId,
      });
      const model = MUSIC_MODELS.find((m) => m.id === musicModelId);
      onAddTrack({
        id: `music-${Date.now()}`,
        type: "music",
        url: result.url,
        label: `Music — ${model?.name ?? musicModelId}`,
        musicPrompt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Music generation failed");
    } finally {
      setMusicLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/30 transition"
      >
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${scenesWithVO.length > 0 || musicTracks.length > 0 ? "bg-pink-400" : "bg-zinc-600"}`} />
          <span className="text-xs font-semibold text-zinc-300">Script &amp; Audio</span>
          {scenesWithVO.length > 0 && (
            <span className="text-[10px] text-pink-400 bg-pink-500/10 rounded px-1.5 py-0.5 border border-pink-800">
              {scenesWithAudio.length}/{scenesWithVO.length} voiced
            </span>
          )}
          {musicTracks.length > 0 && (
            <span className="text-[10px] text-cyan-400 bg-cyan-500/10 rounded px-1.5 py-0.5 border border-cyan-800">
              {musicTracks.length} music
            </span>
          )}
        </div>
        <span className="text-zinc-600 text-xs">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-zinc-800">
          {/* Voice Settings */}
          <div className="pt-3">
            <label className="text-[10px] text-zinc-500 block mb-1.5" htmlFor="voice-model">Voice (applies to all scenes)</label>
            <div className="flex gap-2">
              <select
                id="voice-model"
                value={voiceModelId}
                onChange={(e) => {
                  const m = TTS_MODELS.find((m) => m.id === e.target.value);
                  onVoiceModelChange(e.target.value, m?.voices[0].id ?? "");
                }}
                className="rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-[11px] focus:outline-none focus:border-pink-500"
              >
                {TTS_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} (${m.costPer1KChars}/1K chars)</option>
                ))}
              </select>
              <select
                value={voiceId}
                onChange={(e) => onVoiceModelChange(voiceModelId, e.target.value)}
                className="rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-[11px] focus:outline-none focus:border-pink-500"
              >
                {selectedTtsModel.voices.map((v) => (
                  <option key={v.id} value={v.id}>{v.name} ({v.gender})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Script Overview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] text-zinc-500" htmlFor="script-overview">Script overview</label>
              <button
                onClick={onGenerateAllAudio}
                disabled={scenesWithVO.length === 0}
                className="rounded-lg bg-pink-600 hover:bg-pink-500 disabled:bg-zinc-800 disabled:text-zinc-600 px-3 py-1 text-[10px] font-semibold transition"
              >
                Generate All Voiceovers ({scenesWithVO.length})
              </button>
            </div>
            <div className="space-y-1.5">
              {scenes.map((scene) => (
                <div key={scene.id} className="flex gap-2 items-start">
                  <span className="text-[10px] text-zinc-500 w-5 pt-2 flex-shrink-0 text-right">
                    S{scene.index + 1}
                  </span>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={scene.voiceoverText ?? ""}
                      onChange={(e) => onUpdateSceneVO(scene.id, e.target.value)}
                      placeholder={`Scene ${scene.index + 1} voiceover...`}
                      className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs placeholder:text-zinc-600 focus:outline-none focus:border-pink-500 pr-16"
                    />
                    <div className="absolute right-1 top-1 flex items-center gap-1">
                      {scene.audioUrl && (
                        <span className="text-[8px] text-emerald-400 bg-emerald-900/40 rounded px-1 py-0.5">done</span>
                      )}
                      {scene.audioStatus === "generating" && (
                        <span className="text-[8px] text-pink-300 animate-pulse">gen...</span>
                      )}
                      {scene.voiceoverText?.trim() && !scene.audioUrl && scene.audioStatus !== "generating" && (
                        <button
                          onClick={() => onGenerateSceneAudio(scene.id)}
                          className="text-[8px] text-pink-400 hover:text-pink-300 bg-pink-900/30 rounded px-1.5 py-0.5 transition"
                        >
                          gen
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Background Music */}
          <div className="border-t border-zinc-800 pt-3">
            <label className="text-[10px] text-zinc-500 block mb-1.5" htmlFor="music-section">Background music</label>
            <div className="flex gap-2 mb-2">
              <select
                value={musicModelId}
                onChange={(e) => setMusicModelId(e.target.value)}
                className="rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-[11px] focus:outline-none focus:border-cyan-500"
              >
                {MUSIC_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.costDescription})</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={musicPrompt}
                onChange={(e) => setMusicPrompt(e.target.value)}
                placeholder="Describe the background music..."
                className="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleMusic}
                disabled={musicLoading || !musicPrompt.trim()}
                className="rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-600 px-3 py-1.5 text-[10px] font-semibold transition whitespace-nowrap"
              >
                {musicLoading ? "..." : "Generate"}
              </button>
            </div>

            {/* Music tracks */}
            {musicTracks.map((track) => (
              <div key={track.id} className="flex items-center gap-2 mt-2 rounded-lg bg-zinc-800/50 border border-zinc-700 px-3 py-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                <span className="text-xs text-zinc-300 truncate flex-1">{track.label}</span>
                <audio src={track.url} controls className="h-7 max-w-[140px]" />
                <button onClick={() => onRemoveTrack(track.id)} className="text-zinc-600 hover:text-red-400 text-[10px]">✕</button>
              </div>
            ))}
          </div>

          {error && (
            <p className="text-[11px] text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
