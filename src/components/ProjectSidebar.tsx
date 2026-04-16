"use client";

import { useState } from "react";

interface Project {
  id: string;
  name: string;
  updated_at: string;
}

interface Props {
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onDeleteProject: (id: string) => void;
  visible: boolean;
}

export default function ProjectSidebar({
  projects,
  activeProjectId,
  onSelectProject,
  onNewProject,
  onDeleteProject,
  visible,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (!visible) return null;

  return (
    <aside className="w-64 shrink-0 border-r border-white/8 bg-[#0a0d1a] flex flex-col overflow-hidden">
      {/* New Project button */}
      <div className="p-3 border-b border-white/6">
        <button
          onClick={onNewProject}
          className="w-full flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-3 py-2.5 text-xs font-medium text-zinc-300 transition"
        >
          <span className="text-sm">+</span>
          New project
        </button>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {projects.length === 0 ? (
          <p className="text-[10px] text-zinc-600 text-center py-6">
            No saved projects yet.<br />
            Generate scenes and they'll auto-save here.
          </p>
        ) : (
          projects.map((p) => (
            <div
              key={p.id}
              className={`group relative rounded-lg px-3 py-2.5 cursor-pointer transition ${
                p.id === activeProjectId
                  ? "bg-white/[0.08] border border-cyan-500/20"
                  : "hover:bg-white/[0.04] border border-transparent"
              }`}
              onClick={() => onSelectProject(p.id)}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-medium truncate ${
                    p.id === activeProjectId ? "text-cyan-200" : "text-zinc-300"
                  }`}>
                    {p.name}
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">
                    {formatRelativeTime(p.updated_at)}
                  </p>
                </div>

                {/* Delete button */}
                {confirmDelete === p.id ? (
                  <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => { onDeleteProject(p.id); setConfirmDelete(null); }}
                      className="text-[9px] text-red-400 hover:text-red-300 px-1"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-[9px] text-zinc-500 hover:text-zinc-300 px-1"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(p.id); }}
                    className="opacity-0 group-hover:opacity-100 text-[10px] text-zinc-600 hover:text-red-400 shrink-0 transition-opacity"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/6">
        <p className="text-[9px] text-zinc-600 text-center">
          Auto-saves every 3 seconds
        </p>
      </div>
    </aside>
  );
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  if (diff < 60_000) return "Just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  if (diff < 604800_000) return `${Math.floor(diff / 86400_000)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
