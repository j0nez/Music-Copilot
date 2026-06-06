import { useState } from "react";
import { useProject } from "../store/projectContext";

export default function Dashboard() {
  const { project, createProject } = useProject();
  const [showNewProject, setShowNewProject] = useState(false);
  const [newName, setNewName] = useState("");

  return (
    <div className="h-full flex flex-col gap-4">
      {/* TopBar */}
      <TopBar project={project} onNewProject={() => setShowNewProject(true)} />

      {/* Main area: left 40% | right 60% */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left column: Project Anchor + Music Theory */}
        <div className="w-2/5 flex flex-col gap-4 min-h-0">
          <ProjectAnchor
            project={project}
            showNewProject={showNewProject}
            setShowNewProject={setShowNewProject}
            newName={newName}
            setNewName={setNewName}
            onCreateProject={createProject}
          />
          <Panel title="Music Theory" className="flex-1 min-h-0">
            <p className="text-gray-500 text-sm text-center mt-8">
              Scales &middot; Chords &middot; Intervals &middot; Progressions &middot; Generator
            </p>
          </Panel>
        </div>

        {/* Right column: Co-Producer Chat (hero) */}
        <div className="flex-1 min-h-0">
          <Panel title="Co-Producer" className="h-full">
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
              <span className="text-3xl">💬</span>
              <p className="text-sm">Coming soon &mdash; AI-powered production assistant</p>
              <div className="flex gap-2 mt-2">
                <Chip label="Producer Chat" />
                <Chip label="Why Does This Sound Good?" />
                <Chip label="Finish My Idea" />
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* Bottom row: 3 equal columns */}
      <div className="h-44 flex gap-4 shrink-0">
        <Panel title="Chord Pads" className="flex-1">
          <p className="text-gray-500 text-sm text-center mt-6">Generate a progression to see pads here</p>
        </Panel>
        <Panel title="Sample Analysis" className="flex-1">
          <p className="text-gray-500 text-sm text-center mt-6">Drop audio to analyze BPM, key, scale</p>
        </Panel>
        <Panel title="Session Notes" className="flex-1">
          <p className="text-gray-500 text-sm text-center mt-6">Quick ideas and notes</p>
        </Panel>
      </div>
    </div>
  );
}

/* ── TopBar ─────────────────────── */

function TopBar({
  project,
  onNewProject,
}: {
  project: { name: string } | null;
  onNewProject: () => void;
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-surface-800/50 rounded-xl border border-surface-700/50 shrink-0">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-accent-400" />
        <span className="font-heading font-bold text-sm tracking-wide text-accent-300">Music Copilot</span>
      </div>
      <span className="text-xs text-gray-600">v0.1.0</span>

      <div className="flex-1" />

      <button className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded border border-surface-700/50">
        Ctrl+K Search
      </button>
      <button className="text-xs text-gray-400 hover:text-white transition-colors px-3 py-1 rounded border border-surface-700/50 hover:border-surface-600">
        Library
      </button>
      <button
        onClick={onNewProject}
        className="text-xs bg-accent-500/20 text-accent-300 px-3 py-1.5 rounded-lg border border-accent-500/30 hover:bg-accent-500/30 transition-colors"
      >
        {project ? "Switch Project" : "New Project"}
      </button>
    </div>
  );
}

/* ── Project Anchor ─────────────── */

function ProjectAnchor({
  project,
  showNewProject,
  setShowNewProject,
  newName,
  setNewName,
  onCreateProject,
}: {
  project: { id: number; name: string; bpm: number; key: string; scale: string } | null;
  showNewProject: boolean;
  setShowNewProject: (v: boolean) => void;
  newName: string;
  setNewName: (v: string) => void;
  onCreateProject: (name: string, bpm?: number, key?: string, scale?: string) => Promise<unknown>;
}) {
  if (!project) {
    return (
      <Panel title="Project">
        {showNewProject ? (
          <div className="p-3 space-y-3">
            <input
              autoFocus
              placeholder="Project name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && newName.trim()) {
                  await onCreateProject(newName.trim());
                  setShowNewProject(false);
                  setNewName("");
                }
              }}
              className="w-full rounded bg-surface-900 border border-surface-700 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent-500/50"
            />
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (newName.trim()) {
                    await onCreateProject(newName.trim());
                    setShowNewProject(false);
                    setNewName("");
                  }
                }}
                className="text-xs bg-accent-500/20 text-accent-300 px-3 py-1.5 rounded border border-accent-500/30 hover:bg-accent-500/30 transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => setShowNewProject(false)}
                className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 rounded border border-surface-700/50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-sm">No project loaded</p>
          </div>
        )}
      </Panel>
    );
  }

  return (
    <Panel title="Project">
      <div className="p-3 space-y-2">
        <p className="text-sm font-medium text-gray-200 truncate">{project.name}</p>
        <div className="flex gap-2 flex-wrap">
          <MetaChip label="BPM" value={String(project.bpm)} />
          <MetaChip label="Key" value={project.key} />
          <MetaChip label="Scale" value={project.scale} />
        </div>
      </div>
    </Panel>
  );
}

/* ── Reusable parts ────────────── */

function Panel({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-xl border border-surface-700/50 bg-surface-800/40 flex flex-col overflow-hidden ${className ?? ""}`}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-surface-700/30 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-400/60" />
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{title}</span>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-900/80 border border-surface-700/50 text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="font-mono font-semibold text-accent-300">{value}</span>
    </span>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="px-2.5 py-1 rounded-full bg-surface-700/60 border border-surface-600/40 text-xs text-gray-400">
      {label}
    </span>
  );
}
