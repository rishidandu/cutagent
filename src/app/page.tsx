"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import SceneCard from "@/components/SceneCard";
import Timeline from "@/components/Timeline";
import StylePanel from "@/components/StylePanel";
import ProductImport from "@/components/ProductImport";
import TemplateGallery from "@/components/TemplateGallery";
import BatchPanel from "@/components/BatchPanel";
import AudioPanel from "@/components/AudioPanel";
import ScriptImport from "@/components/ScriptImport";
import BrandKitPanel from "@/components/BrandKitPanel";
import CompareModal from "@/components/CompareModal";
import PreviewPlayer from "@/components/PreviewPlayer";
import UserMenu from "@/components/UserMenu";
import HookLab from "@/components/HookLab";
import ProjectSidebar from "@/components/ProjectSidebar";
import { configureFal, generateScene } from "@/lib/fal";
import { TTS_MODELS, generateVoiceover } from "@/lib/audio";
import { exportProject } from "@/lib/video-export";
import { onSceneCompleted, planGenerationOrder } from "@/lib/style-engine";
import { generateProductStoryboard, type ProductData } from "@/lib/storyboard-generator";
import { scriptToScenes } from "@/lib/script-to-storyboard";
import { applyTemplate, type Template } from "@/lib/templates";
import { createDefaultBrandKit, brandKitToBrief, type BrandKit } from "@/lib/brand-kit";
import { exportProjectFile, importProjectFile } from "@/lib/project-io";
import { recordCost, getCostSummary, recordCostToDb } from "@/lib/cost-tracker";
import { saveActiveJob, removeActiveJob } from "@/lib/job-recovery";
import { persistVideo } from "@/lib/video-storage";
import { generateAvatarVideo } from "@/lib/avatar";
import { type AudioTrack } from "@/lib/audio";
import { MODEL_CATALOG, createDefaultStyleContext, type Scene, type StyleContext } from "@/types";

// ── Helpers ──

function makeScene(index: number): Scene {
  const dur = MODEL_CATALOG[0].supportedDurations[0];
  return {
    id: crypto.randomUUID(),
    index,
    role: "custom" as const,
    modelId: MODEL_CATALOG[0].id,
    prompt: "",
    duration: dur,
    aspectRatio: "16:9",
    trimStart: 0,
    trimEnd: dur,
    voiceoverText: "",
    status: "idle",
    progress: 0,
  };
}

function scenesFromPartials(partials: Omit<Scene, "id">[]): Scene[] {
  return partials.map((p) => ({
    ...p,
    id: crypto.randomUUID(),
    trimStart: p.trimStart ?? 0,
    trimEnd: p.trimEnd ?? p.duration,
    voiceoverText: (p as Scene).voiceoverText ?? "",
  }));
}

const STORAGE_KEY = "cutagent-project";

function saveToStorage(scenes: Scene[], apiKey: string, styleContext: StyleContext) {
  try {
    // Don't save base64 reference images to localStorage (5MB limit).
    // Only save references that are hosted URLs.
    const safeRefs = styleContext.references.filter((r) => !r.url.startsWith("data:"));
    const safeCtx = { ...styleContext, references: safeRefs };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ scenes, apiKey, styleContext: safeCtx, savedAt: Date.now() }));
  } catch { /* quota exceeded, ignore */ }
}

function loadFromStorage(): { scenes: Scene[]; apiKey: string; styleContext?: StyleContext } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.scenes?.length) {
      // Migrate old scenes that may lack new fields
      data.scenes = data.scenes.map((s: Record<string, unknown>) => ({
        ...s,
        role: s.role ?? "custom",
        sceneType: s.sceneType ?? "video",
        trimStart: s.trimStart ?? 0,
        trimEnd: s.trimEnd ?? s.duration,
        voiceoverText: s.voiceoverText ?? "",
      }));
      // Deduplicate references in styleContext (from old extract-as-ref bug)
      if (data.styleContext?.references) {
        const seen = new Set<string>();
        data.styleContext.references = data.styleContext.references.filter((r: { id: string }) => {
          if (seen.has(r.id)) return false;
          seen.add(r.id);
          return true;
        });
      }
      return data;
    }
  } catch { /* corrupted, ignore */ }
  return null;
}

// ── App ──

export default function Home() {
  const { data: session } = useSession();
  const [apiKey, setApiKey] = useState("");
  const [keySet, setKeySet] = useState(false);
  const [scenes, setScenes] = useState<Scene[]>([makeScene(0)]);
  const [selectedScene, setSelectedScene] = useState(0);
  const [styleContext, setStyleContext] = useState<StyleContext>(createDefaultStyleContext());
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [brandKit, setBrandKit] = useState<BrandKit>(createDefaultBrandKit());
  const projectFileInputRef = useRef<HTMLInputElement>(null);

  // Cost tracking — hydration-safe (localStorage only available on client)
  const [totalSpent, setTotalSpent] = useState(0);
  useEffect(() => {
    setTotalSpent(getCostSummary(scenes).totalSpent);
  }, [scenes]);

  // New feature modals
  const [showScript, setShowScript] = useState(false);
  const [showHookLab, setShowHookLab] = useState(false);
  const [hookLabProduct, setHookLabProduct] = useState<ProductData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [compareScene, setCompareScene] = useState<Scene | null>(null);

  // Voice settings
  const [voiceModelId, setVoiceModelId] = useState(TTS_MODELS[0].id);
  const [voiceId, setVoiceId] = useState(TTS_MODELS[0].voices[0].id);

  // Modal states
  const [showImport, setShowImport] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showBatch, setShowBatch] = useState(false);

  // Batch variations storage
  const [variations, setVariations] = useState<Scene[][]>([]);
  const [activeVariation, setActiveVariation] = useState(-1);
  const [originalScenes, setOriginalScenes] = useState<Scene[] | null>(null);
  const mountedRef = useRef(false);

  // ── Load from localStorage on mount ──
  useEffect(() => {
    const saved = loadFromStorage();
    if (saved) {
      // Migrate scenes: ensure trimStart/trimEnd/voiceoverText exist
      const migratedScenes = saved.scenes.map((s: Scene) => ({
        ...s,
        trimStart: s.trimStart ?? 0,
        trimEnd: s.trimEnd ?? s.duration,
        voiceoverText: s.voiceoverText ?? "",
      }));
      setScenes(migratedScenes);
      if (saved.styleContext) {
        setStyleContext(saved.styleContext);
      }
      if (saved.apiKey) {
        setApiKey(saved.apiKey);
        configureFal(saved.apiKey);
        setKeySet(true);
      }
    }
    // Mark mounted after initial load to avoid save race
    requestAnimationFrame(() => { mountedRef.current = true; });
  }, []);

  // ── Auto-save to localStorage (skip initial mount to avoid overwriting key) ──
  useEffect(() => {
    if (!mountedRef.current) return;
    if (scenes.length > 0) {
      saveToStorage(scenes, keySet ? apiKey : "", styleContext);
    }
  }, [scenes, apiKey, keySet, styleContext]);

  const updateScene = useCallback((updated: Scene) => {
    setScenes((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }, []);

  const addScene = () => {
    setScenes((prev) => {
      const next = [...prev, makeScene(prev.length)];
      // Use functional update to avoid stale closure — prev.length is the new scene's index
      setSelectedScene(prev.length);
      return next;
    });
  };

  const removeScene = (id: string) => {
    setScenes((prev) => {
      const next = prev.filter((s) => s.id !== id).map((s, i) => ({ ...s, index: i }));
      return next.length === 0 ? [makeScene(0)] : next;
    });
    setSelectedScene((prev) => Math.max(0, prev - 1));
  };

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

  // ── Generate a single scene (using Style Engine) ──
  // ── Generate avatar video (TTS first → then avatar endpoint) ──
  const handleGenerateAvatar = async (scene: Scene) => {
    if (!keySet) return;
    if (!scene.avatarImageUrl) {
      updateScene({ ...scene, error: "Upload a face photo first", status: "failed" });
      return;
    }
    if (!scene.voiceoverText?.trim()) {
      updateScene({ ...scene, error: "Write voiceover text first (avatar needs audio to drive lip sync)", status: "failed" });
      return;
    }

    updateScene({ ...scene, status: "generating", progress: 10, error: undefined, videoUrl: undefined });

    try {
      // Step 1: Generate TTS voiceover
      const ttsResult = await generateVoiceover({
        text: scene.voiceoverText,
        ttsModelId: voiceModelId,
        voiceId,
        sceneDuration: scene.duration,
      });
      updateScene({ ...scene, audioUrl: ttsResult.url, audioStatus: "completed", progress: 40, status: "generating" });

      // Step 2: Generate avatar video with TTS audio
      const avatarResult = await generateAvatarVideo({
        avatarImageUrl: scene.avatarImageUrl,
        audioUrl: ttsResult.url,
        avatarModelId: scene.modelId,
        onProgress: (status) => updateScene({ ...scene, status: "generating", progress: 70 }),
      });

      const completed = {
        ...scene,
        status: "completed" as const,
        progress: 100,
        videoUrl: avatarResult.videoUrl,
        audioUrl: ttsResult.url,
        audioStatus: "completed" as const,
        requestId: avatarResult.requestId,
      };
      updateScene(completed);
      recordCost(completed);
      setTotalSpent(getCostSummary(scenes).totalSpent);
      if (session?.user) recordCostToDb(completed, null);
      if (avatarResult.videoUrl) {
        persistVideo(avatarResult.videoUrl, scene.id).then((url) => {
          if (url !== avatarResult.videoUrl) updateScene({ ...completed, videoUrl: url });
        });
      }
    } catch (err) {
      updateScene({
        ...scene,
        status: "failed",
        progress: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleGenerate = async (scene: Scene) => {
    if (!keySet) return;
    // Route to avatar handler if scene type is avatar
    if (scene.sceneType === "avatar") {
      return handleGenerateAvatar(scene);
    }
    updateScene({ ...scene, status: "generating", progress: 0, error: undefined, videoUrl: undefined });

    try {
      const result = await generateScene({
        scene,
        styleContext,
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
      recordCost(completed);
      setTotalSpent(getCostSummary(scenes).totalSpent);
      removeActiveJob(scene.id);
      // Persist to cloud if signed in
      if (session?.user) recordCostToDb(completed, null);
      // Persist video to Supabase Storage (runs in background, non-blocking)
      if (result.videoUrl) {
        persistVideo(result.videoUrl, scene.id).then((permanentUrl) => {
          if (permanentUrl !== result.videoUrl) {
            updateScene({ ...completed, videoUrl: permanentUrl });
          }
        });
      }

      // Style Engine: extract frames and update reference bank
      const updatedCtx = await onSceneCompleted(completed, styleContext);
      setStyleContext(updatedCtx);
    } catch (err) {
      // fal.ai SDK throws ValidationError with empty .message but real info in .body
      let errorMsg = "Unknown error";
      try {
        const e = err as Record<string, unknown>;
        if (typeof e?.body === "object" && e.body !== null) {
          const body = e.body as Record<string, unknown>;
          // Pydantic validation: { detail: [...] } or { detail: "string" }
          if (typeof body.detail === "string") {
            errorMsg = body.detail;
          } else if (Array.isArray(body.detail)) {
            errorMsg = body.detail.map((d: { msg?: string; loc?: unknown[] }) =>
              `${d.msg ?? ""}${d.loc ? ` at ${JSON.stringify(d.loc)}` : ""}`
            ).join("; ");
          } else {
            errorMsg = JSON.stringify(body);
          }
        } else if (typeof e?.body === "string") {
          errorMsg = e.body;
        } else if (typeof e?.message === "string" && e.message) {
          errorMsg = e.message;
        } else {
          errorMsg = `${e?.name ?? "Error"} (status ${e?.status ?? "?"})`;
        }
      } catch {
        errorMsg = String(err);
      }
      updateScene({
        ...scene,
        status: "failed",
        progress: 0,
        error: errorMsg,
      });
    }
  };

  // ── Generate All (smart batching via Style Engine) ──
  const generateAll = async () => {
    const pending = scenes.filter((s) => s.prompt.trim() && s.status !== "generating" && s.status !== "completed");
    const batches = planGenerationOrder(pending, styleContext);

    for (const batch of batches) {
      await Promise.all(batch.map((scene) => handleGenerate(scene)));
    }
  };

  // ── Export ──
  const [exportWithCaptions, setExportWithCaptions] = useState(true);

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress("");
    try {
      await exportProject(scenes, audioTracks, setExportProgress, { captions: exportWithCaptions });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
      setExportProgress("");
    }
  };

  // ── Project Save/Load ──
  const [projectId, setProjectId] = useState<string | null>(null);
  const [savedProjects, setSavedProjects] = useState<{ id: string; name: string; updated_at: string }[]>([]);
  const [showProjectPicker, setShowProjectPicker] = useState(false);

  const handleSaveProject = async () => {
    const name = prompt("Project name:", "My CutAgent Project") ?? "project";

    // Save to Supabase if signed in
    if (session?.user) {
      try {
        const body = { name, scenes, styleContext, audioTracks };
        if (projectId) {
          await fetch(`/api/projects/${projectId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        } else {
          const resp = await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (resp.ok) {
            const data = await resp.json();
            setProjectId(data.id);
          }
        }
      } catch {
        // Cloud save failed — fall through to local
      }
    }

    // Always also save as local JSON file
    exportProjectFile(name, scenes, styleContext, audioTracks);
  };

  const handleLoadProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const project = await importProjectFile(file);
      setScenes(scenesFromPartials(project.scenes));
      if (project.styleContext) setStyleContext(project.styleContext);
      if (project.audioTracks) setAudioTracks(project.audioTracks);
      setSelectedScene(0);
      setProjectId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load project");
    }
    if (projectFileInputRef.current) projectFileInputRef.current.value = "";
  };

  const handleLoadCloudProject = async (id: string) => {
    try {
      if (id.startsWith("local-")) {
        // Load from localStorage
        const raw = localStorage.getItem(`cutagent-project-${id}`);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (data.scenes) setScenes(scenesFromPartials(data.scenes));
        if (data.styleContext) setStyleContext(data.styleContext);
        if (data.audioTracks) setAudioTracks(data.audioTracks);
      } else {
        // Load from Supabase
        const resp = await fetch(`/api/projects/${id}`);
        if (!resp.ok) return;
        const data = await resp.json();
        if (data.scenes) setScenes(scenesFromPartials(data.scenes));
        if (data.style_context) setStyleContext(data.style_context);
        if (data.audio_tracks) setAudioTracks(data.audio_tracks);
      }
      setProjectId(id);
      setSelectedScene(0);
      setShowProjectPicker(false);
    } catch {
      alert("Failed to load project");
    }
  };

  const handleOpenProjectPicker = async () => {
    if (session?.user) {
      try {
        const resp = await fetch("/api/projects");
        if (resp.ok) {
          const projects = await resp.json();
          setSavedProjects(projects);
        }
      } catch { /* ignore */ }
    }
    setShowProjectPicker(true);
  };

  // ── Sidebar: fetch projects on mount ──
  const LOCAL_PROJECTS_KEY = "cutagent-projects-list";

  const fetchProjects = async () => {
    if (session?.user) {
      // Cloud: fetch from Supabase
      try {
        const resp = await fetch("/api/projects");
        if (resp.ok) setSavedProjects(await resp.json());
      } catch { /* ignore */ }
    } else {
      // Local: load project list from localStorage
      try {
        const raw = localStorage.getItem(LOCAL_PROJECTS_KEY);
        if (raw) setSavedProjects(JSON.parse(raw));
      } catch { /* ignore */ }
    }
  };

  const saveLocalProjectList = (projects: typeof savedProjects) => {
    try { localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projects)); } catch { /* ignore */ }
  };

  useEffect(() => { fetchProjects(); }, [session?.user?.id]);

  // ── Sidebar: new project ──
  const handleNewProject = () => {
    setScenes([makeScene(0)]);
    setStyleContext(createDefaultStyleContext());
    setAudioTracks([]);
    setProjectId(null);
    setSelectedScene(0);
  };

  // ── Sidebar: delete project ──
  const handleDeleteProject = async (id: string) => {
    try {
      if (id.startsWith("local-")) {
        localStorage.removeItem(`cutagent-project-${id}`);
      } else {
        await fetch(`/api/projects/${id}`, { method: "DELETE" });
      }
      setSavedProjects((prev) => {
        const updated = prev.filter((p) => p.id !== id);
        if (!session?.user) saveLocalProjectList(updated);
        return updated;
      });
      if (projectId === id) handleNewProject();
    } catch { /* ignore */ }
  };

  // ── Auto-save (debounced 3s) — cloud when signed in, localStorage when not ──
  const cloudSaveTimer = useRef<NodeJS.Timeout>(undefined);
  useEffect(() => {
    if (!mountedRef.current) return;
    clearTimeout(cloudSaveTimer.current);
    cloudSaveTimer.current = setTimeout(async () => {
      // Only auto-save if there's actual content
      if (!scenes.some((s) => s.prompt.trim() || s.videoUrl)) return;

      if (session?.user) {
        // Cloud save
        try {
          const body = { name: "Untitled", scenes, styleContext, audioTracks };
          if (projectId) {
            await fetch(`/api/projects/${projectId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
          } else {
            const resp = await fetch("/api/projects", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            if (resp.ok) {
              const data = await resp.json();
              setProjectId(data.id);
              fetchProjects();
            }
          }
        } catch { /* silent */ }
      } else {
        // Local save — store project in localStorage project list
        const id = projectId || `local-${Date.now()}`;
        if (!projectId) setProjectId(id);
        const projectEntry = { id, name: "Untitled", updated_at: new Date().toISOString() };
        const projectData = { scenes, styleContext, audioTracks };
        try {
          localStorage.setItem(`cutagent-project-${id}`, JSON.stringify(projectData));
          setSavedProjects((prev) => {
            const existing = prev.filter((p) => p.id !== id);
            const updated = [projectEntry, ...existing];
            saveLocalProjectList(updated);
            return updated;
          });
        } catch { /* quota exceeded */ }
      }
    }, 3000);
    return () => clearTimeout(cloudSaveTimer.current);
  }, [scenes, styleContext, audioTracks, session?.user?.id]);

  // ── Audio tracks (project-level music) ──
  const addAudioTrack = (track: AudioTrack) => setAudioTracks((prev) => [...prev, track]);
  const removeAudioTrack = (id: string) => setAudioTracks((prev) => prev.filter((t) => t.id !== id));

  const totalDuration = scenes.reduce((s, sc) => s + ((sc.trimEnd ?? sc.duration) - (sc.trimStart ?? 0)), 0);

  // ── Per-scene voiceover generation ──
  const handleGenerateSceneAudio = async (sceneId: string) => {
    const scene = scenes.find((s) => s.id === sceneId);
    if (!scene?.voiceoverText?.trim() || !keySet) return;

    updateScene({ ...scene, audioStatus: "generating" });
    try {
      const result = await generateVoiceover({
        text: scene.voiceoverText,
        ttsModelId: voiceModelId,
        voiceId,
        sceneDuration: (scene.trimEnd ?? scene.duration) - (scene.trimStart ?? 0),
      });
      updateScene({ ...scene, audioUrl: result.url, audioStatus: "completed" });
    } catch {
      updateScene({ ...scene, audioStatus: "failed" });
    }
  };

  const handleGenerateAllAudio = async () => {
    const withVO = scenes.filter((s) => s.voiceoverText?.trim() && !s.audioUrl);
    for (const scene of withVO) {
      await handleGenerateSceneAudio(scene.id);
    }
  };

  const handleUpdateSceneVO = (sceneId: string, text: string) => {
    setScenes((prev) => prev.map((s) => s.id === sceneId ? { ...s, voiceoverText: text } : s));
  };

  // ── Product Import handler ──
  const handleProductImport = (product: ProductData) => {
    const storyboard = generateProductStoryboard(product);
    const newScenes = scenesFromPartials(storyboard);
    setScenes(newScenes);
    setSelectedScene(0);
    setShowImport(false);

    // Inject product images into StyleContext as "product" references
    // AND auto-fill the style brief with product info
    if ((product.images?.length ?? 0) > 0 || product.title) {
      setStyleContext((prev) => {
        const productRefs = (product.images ?? []).slice(0, 3).map((url, i) => ({
          id: `product-import-${i}`,
          url,
          type: "product" as const,
          label: i === 0 ? `${product.title.slice(0, 30)} (main)` : `Product image ${i + 1}`,
        }));

        // Build a rich style brief from product data + entities
        const briefParts: string[] = [];
        if (product.title) briefParts.push(`Product: ${product.title.replace(/[®™©]/g, "")}.`);
        if (product.description) {
          // Use first 2 sentences of description for context
          const descSentences = product.description.split(/[.!]/).filter((s: string) => s.trim().length > 10).slice(0, 2);
          if (descSentences.length) briefParts.push(`What it is: ${descSentences.join(". ")}.`);
        }
        if (product.category) briefParts.push(`Category: ${product.category}.`);
        if (product.color) briefParts.push(`Color: ${product.color}.`);
        if (product.material) briefParts.push(`Material: ${product.material}.`);
        briefParts.push("The actual product must be clearly visible and recognizable in every scene.");
        briefParts.push("When showing a person, they must be holding or interacting with this specific product.");

        return {
          ...prev,
          references: [
            // Remove old product refs, keep others
            ...prev.references.filter((r) => r.type !== "product"),
            ...productRefs,
          ],
          brief: {
            ...prev.brief,
            description: prev.brief.description || briefParts.join(" "),
          },
        };
      });
    }
  };

  // ── Hook Lab handler ──
  const handleHookLab = (product: ProductData) => {
    setHookLabProduct(product);
    setShowHookLab(true);
    setShowImport(false);
    // Set up StyleContext with product refs (same as handleProductImport)
    if ((product.images?.length ?? 0) > 0 || product.title) {
      setStyleContext((prev) => {
        const productRefs = (product.images ?? []).slice(0, 3).map((url, i) => ({
          id: `product-import-${i}`,
          url,
          type: "product" as const,
          label: i === 0 ? `${product.title.slice(0, 30)} (main)` : `Product image ${i + 1}`,
        }));
        const briefParts: string[] = [];
        if (product.title) briefParts.push(`Product: ${product.title.replace(/[®™©]/g, "")}.`);
        if (product.description) {
          const descSentences = product.description.split(/[.!]/).filter((s: string) => s.trim().length > 10).slice(0, 2);
          if (descSentences.length) briefParts.push(`What it is: ${descSentences.join(". ")}.`);
        }
        if (product.category) briefParts.push(`Category: ${product.category}.`);
        briefParts.push("The actual product must be clearly visible and recognizable in every scene.");
        return {
          ...prev,
          references: [...prev.references.filter((r) => r.type !== "product"), ...productRefs],
          brief: { ...prev.brief, description: prev.brief.description || briefParts.join(" ") },
        };
      });
    }
  };

  const handleHookLabExpand = (storyboards: Omit<Scene, "id">[][]) => {
    if (storyboards.length === 1) {
      setScenes(scenesFromPartials(storyboards[0]));
    } else {
      setScenes(scenesFromPartials(storyboards[0]));
      setVariations(storyboards.slice(1).map((sb) => scenesFromPartials(sb)));
      setOriginalScenes(scenesFromPartials(storyboards[0]));
    }
    setSelectedScene(0);
    setShowHookLab(false);
  };

  // ── Template handler ──
  const handleTemplateSelect = (template: Template, productName: string) => {
    const storyboard = applyTemplate(template, productName);
    const newScenes = scenesFromPartials(storyboard);
    setScenes(newScenes);
    setSelectedScene(0);
    setShowTemplates(false);
  };

  // ── Script-to-Storyboard handler ──
  const handleScriptApply = (script: string, aspectRatio: string) => {
    const storyboard = scriptToScenes(script, aspectRatio);
    setScenes(scenesFromPartials(storyboard));
    setSelectedScene(0);
    setShowScript(false);
  };

  // ── Compare handler ──
  const handleComparePickWinner = (modelId: string, videoUrl: string) => {
    if (!compareScene) return;
    updateScene({ ...compareScene, modelId, videoUrl, status: "completed", progress: 100 });
    setCompareScene(null);
  };

  // ── Batch Variations handler ──
  const handleBatchGenerate = (variationData: Omit<Scene, "id">[][]) => {
    const newVariations = variationData.map((v) => scenesFromPartials(v));
    setVariations(newVariations);
    setActiveVariation(-1);
    setShowBatch(false);
  };

  const switchVariation = (index: number) => {
    if (index === activeVariation) return;
    if (activeVariation === -1) {
      setOriginalScenes([...scenes]);
    }
    if (index === -1) {
      if (originalScenes) setScenes(originalScenes);
    } else if (index >= 0 && index < variations.length) {
      setScenes(variations[index]);
    }
    setActiveVariation(index);
    setSelectedScene(0);
  };

  const removeVariation = (index: number) => {
    setVariations((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (activeVariation === index) {
        if (originalScenes) setScenes(originalScenes);
        setActiveVariation(-1);
      } else if (activeVariation > index) {
        setActiveVariation((v) => v - 1);
      }
      return next;
    });
  };

  const completedCount = scenes.filter((s) => s.status === "completed").length;
  const canExport = completedCount > 0;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-7rem] top-[-4rem] h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute right-[-6rem] top-20 h-80 w-80 rounded-full bg-violet-400/10 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-300/8 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-20 border-b border-white/10 bg-slate-950/55 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-sm font-semibold shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
              CA
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="hero-title text-xl font-semibold text-white">CutAgent</h1>
                <span className="rounded-full border border-cyan-400/18 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-200">
                  open source
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Storyboard-first AI video studio for product ads, UGC, and fast creative testing
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <UserMenu />
            <a
              href="https://github.com/rishidandu/cutagent"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs font-medium text-zinc-300 hover:border-white/20 hover:bg-white/10"
            >
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z"/></svg>
              GitHub
            </a>
            <Link
              href="/waitlist"
              className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs font-medium text-zinc-300 hover:border-white/20 hover:bg-white/10"
            >
              Home
            </Link>
            {!keySet ? (
              <div className="glass-panel flex flex-wrap gap-2 rounded-2xl p-2">
                <input
                  type="password"
                  placeholder="fal.ai API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && connectKey()}
                  className="mono-ui h-10 w-64 rounded-xl border border-white/10 bg-black/20 px-3 text-xs text-white placeholder:text-zinc-600 focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/15"
                />
                <button
                  onClick={connectKey}
                  disabled={!apiKey.trim()}
                  className="h-10 rounded-xl bg-cyan-400 px-4 text-xs font-semibold text-slate-950 shadow-[0_14px_32px_rgba(83,212,255,0.24)] hover:bg-cyan-300 disabled:bg-zinc-800 disabled:text-zinc-500"
                >
                  Connect
                </button>
              </div>
            ) : (
              <div className="glass-panel flex items-center gap-3 rounded-2xl px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(74,222,128,0.75)]" />
                  <span className="text-xs text-zinc-300">fal.ai connected</span>
                </div>
                <button
                  onClick={() => { setKeySet(false); setApiKey(""); }}
                  className="mono-ui text-[10px] uppercase tracking-[0.18em] text-zinc-500 hover:text-zinc-300"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        {/* Project sidebar (ChatGPT-style) — always visible */}
        <ProjectSidebar
          projects={savedProjects}
          activeProjectId={projectId}
          onSelectProject={handleLoadCloudProject}
          onNewProject={handleNewProject}
          onDeleteProject={handleDeleteProject}
          visible={true}
        />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-6xl">
            {/* ── Product URL Import (primary CTA) ── */}
            <div className="glass-panel-strong mb-4 rounded-[1.6rem] p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  onClick={() => setShowImport(true)}
                  className="flex-1 flex items-center gap-3 rounded-xl border border-dashed border-cyan-500/30 hover:border-cyan-400/50 bg-cyan-400/[0.04] hover:bg-cyan-400/[0.08] px-5 py-3.5 text-left transition group"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300 text-lg shrink-0">
                    🔗
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white block">Paste a product URL to get started</span>
                    <span className="text-[11px] text-zinc-500">Shopify, Amazon, or any product page → 4-scene ad storyboard</span>
                  </div>
                </button>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setShowScript(true)} className="rounded-xl border border-white/8 bg-white/[0.04] hover:bg-white/[0.07] px-3.5 py-2.5 text-xs text-zinc-300 transition" title="Paste a script">
                    Script
                  </button>
                  <button onClick={() => setShowTemplates(true)} className="rounded-xl border border-white/8 bg-white/[0.04] hover:bg-white/[0.07] px-3.5 py-2.5 text-xs text-zinc-300 transition" title="Use a template">
                    Templates
                  </button>
                  <button
                    onClick={() => setShowBatch(true)}
                    disabled={!scenes.some((s) => s.prompt.trim())}
                    className="rounded-xl border border-white/8 bg-white/[0.04] hover:bg-white/[0.07] px-3.5 py-2.5 text-xs text-zinc-300 transition disabled:opacity-30"
                    title="Generate hook variations"
                  >
                    Batch
                  </button>
                  <button
                    onClick={() => hookLabProduct ? setShowHookLab(true) : setShowImport(true)}
                    className="rounded-xl border border-orange-500/20 bg-orange-400/[0.06] hover:bg-orange-400/[0.12] px-3.5 py-2.5 text-xs text-orange-300 font-semibold transition"
                    title="Test 20+ hooks fast, then expand winners to full ads"
                  >
                    Hook Lab
                  </button>
                </div>
              </div>
            </div>

            {/* ── Action bar (Generate All + controls) ── */}
            <div className="glass-panel mb-4 rounded-[1.4rem] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400">
                    {scenes.length} scene{scenes.length !== 1 ? "s" : ""}
                    {completedCount > 0 && <span className="text-emerald-400"> · {completedCount} done</span>}
                    {totalSpent > 0 && <span className="text-amber-300"> · ${totalSpent.toFixed(2)}</span>}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button onClick={addScene} className="rounded-lg border border-white/8 bg-white/[0.04] hover:bg-white/[0.07] px-3 py-1.5 text-xs text-zinc-300 transition">
                    + Scene
                  </button>
                  <button
                    onClick={generateAll}
                    disabled={!keySet || scenes.every((s) => !s.prompt.trim() || s.status === "generating")}
                    className="rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-zinc-800 disabled:text-zinc-600 px-5 py-1.5 text-xs font-semibold text-slate-950 transition shadow-[0_8px_20px_rgba(83,212,255,0.2)]"
                  >
                    Generate All
                  </button>
                  <button onClick={() => setShowPreview(true)} disabled={completedCount === 0} className="rounded-lg border border-white/8 bg-white/[0.04] hover:bg-white/[0.07] disabled:opacity-30 px-3 py-1.5 text-xs text-zinc-300 transition">
                    Preview
                  </button>
                  <button
                    onClick={() => setExportWithCaptions((v) => !v)}
                    className={`rounded-lg border px-2 py-1.5 text-[10px] font-medium transition ${
                      exportWithCaptions
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                        : "border-white/8 bg-white/[0.04] text-zinc-500"
                    }`}
                    title="Burn captions into exported video"
                  >
                    CC
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={!canExport || isExporting}
                    className="rounded-lg bg-emerald-500/90 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 px-3 py-1.5 text-xs font-semibold text-white transition"
                  >
                    {isExporting ? (exportProgress || "Export...") : "Export"}
                  </button>
                  <button onClick={handleSaveProject} className="rounded-lg border border-white/8 bg-white/[0.04] hover:bg-white/[0.07] px-3 py-1.5 text-xs text-zinc-300 transition" title="Save">
                    Save
                  </button>
                  <button onClick={() => projectFileInputRef.current?.click()} className="rounded-lg border border-white/8 bg-white/[0.04] hover:bg-white/[0.07] px-3 py-1.5 text-xs text-zinc-300 transition" title="Import .json file">
                    Import
                  </button>
                  <input ref={projectFileInputRef} type="file" accept=".json" onChange={handleLoadProject} className="hidden" />
                </div>
              </div>
            </div>

            {/* Style Engine */}
            <div className="mb-3">
              <StylePanel
                styleContext={styleContext}
                onChange={setStyleContext}
              />
            </div>

            {/* Variation tabs */}
            {variations.length > 0 && (
              <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
                <button
                  onClick={() => switchVariation(-1)}
                  className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-medium transition border ${
                    activeVariation === -1
                      ? "border-blue-500 bg-blue-500/10 text-blue-300"
                      : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                  }`}
                >
                  Original
                </button>
                {variations.map((_, i) => (
                  <div key={`var-${i}`} className="flex-shrink-0 flex items-center">
                    <button
                      onClick={() => switchVariation(i)}
                      className={`rounded-l-lg px-3 py-1.5 text-[11px] font-medium transition border border-r-0 ${
                        activeVariation === i
                          ? "border-orange-500 bg-orange-500/10 text-orange-300"
                          : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                      }`}
                    >
                      Variation {i + 1}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeVariation(i); }}
                      className={`rounded-r-lg px-1.5 py-1.5 text-[10px] transition border ${
                        activeVariation === i
                          ? "border-orange-500 bg-orange-500/10 text-orange-400 hover:text-red-400 hover:bg-red-500/10"
                          : "border-zinc-700 bg-zinc-800 text-zinc-600 hover:text-red-400 hover:bg-red-500/10"
                      }`}
                      title={`Delete Variation ${i + 1}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    if (originalScenes) setScenes(originalScenes);
                    setVariations([]);
                    setActiveVariation(-1);
                  }}
                  className="flex-shrink-0 rounded-lg px-2 py-1.5 text-[11px] text-zinc-600 hover:text-red-400 transition"
                >
                  Clear All
                </button>
              </div>
            )}

            {/* Scene cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scenes.map((scene, i) => (
                <SceneCard
                  key={scene.id}
                  scene={scene}
                  isFirst={i === 0}
                  isLast={i === scenes.length - 1}
                  keyConnected={keySet}
                  styleContext={styleContext}
                  onUpdate={updateScene}
                  onGenerate={() => handleGenerate(scene)}
                  onRemove={() => removeScene(scene.id)}
                  onMoveUp={() => moveScene(i, i - 1)}
                  onMoveDown={() => moveScene(i, i + 1)}
                  onCompare={() => setCompareScene(scene)}
                  onGenerateAll={async () => {
                    await handleGenerate(scene);
                    // After video completes, generate voiceover if text exists
                    if (scene.voiceoverText?.trim()) {
                      await handleGenerateSceneAudio(scene.id);
                    }
                  }}
                />
              ))}
            </div>

            {/* Audio panel (below scenes) */}
            <div className="mt-6">
              <AudioPanel
                scenes={scenes}
                audioTracks={audioTracks}
                voiceModelId={voiceModelId}
                voiceId={voiceId}
                onVoiceModelChange={(m, v) => { setVoiceModelId(m); setVoiceId(v); }}
                onGenerateSceneAudio={handleGenerateSceneAudio}
                onGenerateAllAudio={handleGenerateAllAudio}
                onAddTrack={addAudioTrack}
                onRemoveTrack={removeAudioTrack}
                onUpdateSceneVO={handleUpdateSceneVO}
                totalDuration={totalDuration}
              />
            </div>

            {/* Empty state */}
            {!keySet && (
              <div className="glass-panel mt-12 rounded-[1.6rem] px-6 py-8 text-center text-zinc-600">
                <p className="text-sm text-zinc-300">Paste your fal.ai API key above to start generating</p>
                <p className="mt-1 text-xs">
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

      {/* Modals */}
      <ProductImport
        open={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleProductImport}
        onHookLab={handleHookLab}
      />
      <TemplateGallery
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelect={handleTemplateSelect}
      />
      <BatchPanel
        open={showBatch}
        onClose={() => setShowBatch(false)}
        scenes={scenes}
        onGenerate={handleBatchGenerate}
      />
      <ScriptImport
        open={showScript}
        onClose={() => setShowScript(false)}
        onApply={handleScriptApply}
      />
      <CompareModal
        open={!!compareScene}
        onClose={() => setCompareScene(null)}
        scene={compareScene}
        styleContext={styleContext}
        onPickWinner={handleComparePickWinner}
      />
      <PreviewPlayer
        open={showPreview}
        onClose={() => setShowPreview(false)}
        scenes={scenes}
      />
      {/* Project picker modal */}
      {showProjectPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-zinc-100">Load Project</h2>
              <button onClick={() => setShowProjectPicker(false)} className="text-zinc-500 hover:text-zinc-300">&times;</button>
            </div>

            {/* Cloud projects */}
            {savedProjects.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] text-zinc-500 mb-2 uppercase tracking-wider">Saved projects</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {savedProjects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleLoadCloudProject(p.id)}
                      className="w-full text-left rounded-lg border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 px-3 py-2.5 transition"
                    >
                      <span className="text-xs font-medium text-zinc-200 block">{p.name}</span>
                      <span className="text-[10px] text-zinc-500">
                        {new Date(p.updated_at).toLocaleDateString()} · {new Date(p.updated_at).toLocaleTimeString()}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Local file fallback */}
            <div className="border-t border-zinc-800 pt-3">
              <p className="text-[10px] text-zinc-500 mb-2">Or load from file</p>
              <button
                onClick={() => { projectFileInputRef.current?.click(); setShowProjectPicker(false); }}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 px-3 py-2.5 text-xs text-zinc-300 transition"
              >
                Browse .json files...
              </button>
              <input ref={projectFileInputRef} type="file" accept=".json" onChange={handleLoadProject} className="hidden" />
            </div>
          </div>
        </div>
      )}
      {hookLabProduct && (
        <HookLab
          open={showHookLab}
          onClose={() => setShowHookLab(false)}
          product={hookLabProduct}
          styleContext={styleContext}
          onExpandToStoryboard={handleHookLabExpand}
        />
      )}
    </div>
  );
}
