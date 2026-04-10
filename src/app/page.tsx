"use client";

import { useCallback, useEffect, useState } from "react";
import SceneCard from "@/components/SceneCard";
import Timeline from "@/components/Timeline";
import { configureFal, generateScene } from "@/lib/fal";
import { extractLastFrame } from "@/lib/frame-extractor";
import { exportProject } from "@/lib/video-export";
import { MODEL_CATALOG, type Scene } from "@/types";

// ── Helpers ──

function makeScene(index: number): Scene {
  return {
    id: crypto.randomUUID(),
    index,
    modelId: MODEL_CATALOG[0].id,
    prompt: "",
    duration: MODEL_CATALOG[0].supportedDurations[0],
    aspectRatio: "16:9",
    status: "idle",
    progress: 0,
  };
}

const STORAGE_KEY = "cutagent-project";

function saveToStorage(scenes: Scene[], apiKey: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ scenes, apiKey, savedAt: Date.now() }));
  } catch { /* quota exceeded, ignore */ }
}

function loadFromStorage(): { scenes: Scene[]; apiKey: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.scenes?.length) return data;
  } catch { /* corrupted, ignore */ }
  return null;
}

// ── App ──

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [keySet, setKeySet] = useState(false);
  const [scenes, setScenes] = useState<Scene[]>([makeScene(0)]);
  const [selectedScene, setSelectedScene] = useState(0);
  const [styleHarness, setStyleHarness] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // ── Load from localStorage on mount ──
  useEffect(() => {
    const saved = loadFromStorage();
    if (saved) {
      setScenes(saved.scenes);
      if (saved.apiKey) {
        setApiKey(saved.apiKey);
        configureFal(saved.apiKey);
        setKeySet(true);
      }
    }
  }, []);

  // ── Auto-save to localStorage ──
  useEffect(() => {
    if (scenes.length > 0) {
      saveToStorage(scenes, keySet ? apiKey : "");
    }
  }, [scenes, apiKey, keySet]);

  const updateScene = useCallback((updated: Scene) => {
    setScenes((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }, []);

  const addScene = () => {
    setScenes((prev) => [...prev, makeScene(prev.length)]);
    setSelectedScene(scenes.length);
  };

  const removeScene = (id: string) => {
    setScenes((prev) => {
      const next = prev.filter((s) => s.id !== id).map((s, i) => ({ ...s, index: i }));
      return next.length === 0 ? [makeScene(0)] : next;
    });
    setSelectedScene((prev) => Math.max(0, prev - 1));
  };

  // ── Drag-to-reorder ──
  const moveScene = useCallback((fromIndex: number, toIndex: number) => {
    setScenes((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next.map((s, i) => ({ ...s, index: i }));
    });
    setSelectedScene(toIndex);
  }, []);

  const connectKey = () => {
    if (!apiKey.trim()) return;
    configureFal(apiKey.trim());
    setKeySet(true);
  };

  // ── Style Harness: chain scenes via last-frame extraction ──
  const applyStyleHarness = useCallback(async (completedScene: Scene) => {
    if (!styleHarness || !completedScene.videoUrl) return;

    // Find the next scene in order
    setScenes((prev) => {
      const idx = prev.findIndex((s) => s.id === completedScene.id);
      const nextScene = prev[idx + 1];
      if (!nextScene || nextScene.referenceImageUrl) return prev; // already has ref

      // Extract last frame async and update
      extractLastFrame(completedScene.videoUrl!).then((frameDataUrl) => {
        setScenes((current) =>
          current.map((s) =>
            s.id === nextScene.id ? { ...s, referenceImageUrl: frameDataUrl } : s,
          ),
        );
      }).catch(() => { /* frame extraction failed, continue without chaining */ });

      return prev;
    });
  }, [styleHarness]);

  // ── Generate a single scene ──
  const handleGenerate = async (scene: Scene) => {
    if (!keySet) return;
    updateScene({ ...scene, status: "generating", progress: 0, error: undefined, videoUrl: undefined });

    try {
      const result = await generateScene({
        scene,
        onProgress: (status) => {
          const progress = status === "Queued" ? 10 : 50;
          updateScene({ ...scene, status: "generating", progress });
        },
      });

      const completed = {
        ...scene,
        status: "completed" as const,
        progress: 100,
        videoUrl: result.videoUrl,
        requestId: result.requestId,
      };
      updateScene(completed);

      // Style Harness: chain to next scene
      await applyStyleHarness(completed);
    } catch (err) {
      updateScene({
        ...scene,
        status: "failed",
        progress: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  // ── Generate All (sequential for style harness chaining) ──
  const generateAll = async () => {
    const pending = scenes.filter((s) => s.prompt.trim() && s.status !== "generating" && s.status !== "completed");
    if (styleHarness) {
      // Sequential: chain each scene's last frame to the next
      for (const scene of pending) {
        await handleGenerate(scene);
      }
    } else {
      // Parallel: fire all at once
      for (const scene of pending) {
        handleGenerate(scene);
      }
    }
  };

  // ── Export ──
  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportProject(scenes);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const completedCount = scenes.filter((s) => s.status === "completed").length;
  const canExport = completedCount > 0;

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-base font-bold">CutAgent</h1>
          <span className="text-[10px] text-zinc-600 bg-zinc-800 rounded px-2 py-0.5">open source</span>
        </div>

        <div className="flex items-center gap-3">
          {!keySet ? (
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="fal.ai API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && connectKey()}
                className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs font-mono w-64 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={connectKey}
                disabled={!apiKey.trim()}
                className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 px-4 py-1.5 text-xs font-semibold transition"
              >
                Connect
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-xs text-zinc-400">fal.ai connected</span>
              </div>
              <button
                onClick={() => { setKeySet(false); setApiKey(""); }}
                className="text-[10px] text-zinc-600 hover:text-zinc-400"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-sm font-semibold text-zinc-300">Storyboard</h2>
                <p className="text-[11px] text-zinc-600 mt-0.5">
                  {scenes.length} scene{scenes.length !== 1 ? "s" : ""} · {completedCount} generated
                </p>
              </div>
              <div className="flex gap-2 items-center">
                {/* Style Harness toggle */}
                <button
                  onClick={() => setStyleHarness((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[10px] font-medium transition ${
                    styleHarness
                      ? "border-violet-700 bg-violet-950/40 text-violet-300"
                      : "border-zinc-700 bg-zinc-800 text-zinc-500"
                  }`}
                  title="When enabled, each scene's last frame is passed as a reference to the next scene for visual consistency"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${styleHarness ? "bg-violet-400" : "bg-zinc-600"}`} />
                  Style Harness
                </button>

                <button
                  onClick={addScene}
                  className="rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-4 py-2 text-xs font-medium transition"
                >
                  + Add Scene
                </button>
                <button
                  onClick={generateAll}
                  disabled={!keySet || scenes.every((s) => !s.prompt.trim() || s.status === "generating")}
                  className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 px-5 py-2 text-xs font-semibold transition"
                >
                  Generate All
                </button>
                <button
                  onClick={handleExport}
                  disabled={!canExport || isExporting}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 px-4 py-2 text-xs font-semibold transition"
                >
                  {isExporting ? "Exporting..." : "Export"}
                </button>
              </div>
            </div>

            {/* Scene cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scenes.map((scene, i) => (
                <SceneCard
                  key={scene.id}
                  scene={scene}
                  onUpdate={updateScene}
                  onGenerate={() => handleGenerate(scene)}
                  onRemove={() => removeScene(scene.id)}
                />
              ))}
            </div>

            {/* Empty state */}
            {!keySet && (
              <div className="mt-12 text-center text-zinc-600">
                <p className="text-sm">Paste your fal.ai API key above to start generating</p>
                <p className="text-xs mt-1">
                  Get one free at{" "}
                  <a href="https://fal.ai/dashboard/keys" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                    fal.ai/dashboard/keys
                  </a>
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Timeline */}
      <Timeline
        scenes={scenes}
        selectedIndex={selectedScene}
        onSelect={setSelectedScene}
      />
    </div>
  );
}
