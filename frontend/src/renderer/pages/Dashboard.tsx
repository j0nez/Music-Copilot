import { useState } from "react";
import { useProject } from "../store/projectContext";
import MusicTheoryPanel from "../components/MusicTheoryPanel";
import ChordPads from "../components/ChordPads";
import SampleAnalysisPanel from "../components/SampleAnalysisPanel";
import LibraryModal from "../components/LibraryModal";
import type { ProgressionChord } from "../types";

const NOTES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

const SCALE_TYPES = [
  "Major", "Natural Minor", "Harmonic Minor", "Melodic Minor",
  "Dorian", "Phrygian", "Lydian", "Mixolydian", "Locrian",
  "Pentatonic Major", "Pentatonic Minor",
];

export default function Dashboard() {
  const { project, createProject, updateProject } = useProject();
  const [showNewProject, setShowNewProject] = useState(false);
  const [chordPads, setChordPads] = useState<ProgressionChord[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const handleProgressionGenerated = (progression: { chords: ProgressionChord[] }) => {
    setChordPads(progression.chords);
  };

  const handleChordPadsReorder = (chords: ProgressionChord[]) => {
    setChordPads(chords);
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {libraryOpen && <LibraryModal onClose={() => setLibraryOpen(false)} />}

      {/* TopBar */}
      <TopBar
        projectName={project?.name ?? null}
        onNewProject={() => setShowNewProject(true)}
        onOpenLibrary={() => setLibraryOpen(true)}
      />

      {/* Main area: left 40% | right 60% */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left column: Project Anchor + Music Theory */}
        <div className="w-2/5 flex flex-col gap-4 min-h-0">
          <ProjectAnchor
            project={project}
            showNewProject={showNewProject}
            setShowNewProject={setShowNewProject}
            onCreateProject={createProject}
            updateProject={updateProject}
          />
          {project ? (
            <Panel title="Music Theory" className="flex-1 min-h-0">
              <MusicTheoryPanel onProgressionGenerated={handleProgressionGenerated} />
            </Panel>
          ) : (
            <Panel title="Music Theory" className="flex-1 min-h-0">
              <div className="flex items-center justify-center h-full text-gray-600 text-xs">
                Create a project first
              </div>
            </Panel>
          )}
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
          <ChordPads
            progression={chordPads}
            onReorder={handleChordPadsReorder}
            onClear={() => setChordPads([])}
          />
        </Panel>
        <Panel title="Sample Analysis" className="flex-1">
          <SampleAnalysisPanel />
        </Panel>
        <Panel title="Session Notes" className="flex-1">
          <div className="flex flex-col h-full p-2">
            <textarea
              placeholder="Jot down ideas, notes, or reminders..."
              className="flex-1 bg-transparent text-xs text-gray-400 placeholder-gray-600 resize-none outline-none"
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ── TopBar ─────────────────────── */

function TopBar({
  projectName,
  onNewProject,
  onOpenLibrary,
}: {
  projectName: string | null;
  onNewProject: () => void;
  onOpenLibrary: () => void;
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
      <button onClick={onOpenLibrary} className="text-xs text-gray-400 hover:text-white transition-colors px-3 py-1 rounded border border-surface-700/50 hover:border-surface-600">
        Library
      </button>
      <button
        onClick={onNewProject}
        className="text-xs bg-accent-500/20 text-accent-300 px-3 py-1.5 rounded-lg border border-accent-500/30 hover:bg-accent-500/30 transition-colors"
      >
        {projectName ? "Switch Project" : "New Project"}
      </button>
    </div>
  );
}

/* ── Project Anchor ─────────────── */

const NEW_BPM_DEFAULT = 120;
const NEW_KEY_DEFAULT = "C";
const NEW_SCALE_DEFAULT = "Major";

function NewProjectForm({
  onCreate,
  onCancel,
}: {
  onCreate: (name: string, bpm: number, key: string, scale: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [bpm, setBpm] = useState(NEW_BPM_DEFAULT);
  const [key, setKey] = useState(NEW_KEY_DEFAULT);
  const [scale, setScale] = useState(NEW_SCALE_DEFAULT);

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim(), bpm, key, scale);
  };

  return (
    <div className="p-3 space-y-3">
      <input
        autoFocus
        placeholder="Project name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleCreate();
          if (e.key === "Escape") onCancel();
        }}
        className="w-full rounded bg-surface-900 border border-surface-700 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent-500/50"
      />
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-gray-500 block mb-1">BPM</label>
          <input
            type="number"
            min={20}
            max={300}
            value={bpm}
            onChange={(e) => setBpm(Math.max(20, Math.min(300, +e.target.value || 20)))}
            className="w-full rounded bg-surface-900 border border-surface-700 px-3 py-2 text-sm font-mono text-gray-200 focus:outline-none focus:border-accent-500/50"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Key</label>
          <select
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="w-full rounded bg-surface-900 border border-surface-700 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent-500/50"
          >
            {NOTES.map((n) => <option key={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Scale</label>
          <select
            value={scale}
            onChange={(e) => setScale(e.target.value)}
            className="w-full rounded bg-surface-900 border border-surface-700 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent-500/50"
          >
            {SCALE_TYPES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleCreate}
          disabled={!name.trim()}
          className="text-xs bg-accent-500/20 text-accent-300 px-3 py-1.5 rounded border border-accent-500/30 hover:bg-accent-500/30 transition-colors disabled:opacity-50"
        >
          Create
        </button>
        <button
          onClick={onCancel}
          className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 rounded border border-surface-700/50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── Inline editable fields ───── */

function InlineEdit({
  value,
  onSave,
  renderDisplay,
  renderInput,
}: {
  value: string;
  onSave: (val: string) => void;
  renderDisplay: (val: string, startEdit: () => void) => React.ReactNode;
  renderInput: (val: string, onValChange: (v: string) => void, onCommit: () => void, onCancel: () => void) => React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const startEdit = () => {
    setDraft(value);
    setEditing(true);
  };

  const commit = () => {
    if (draft.trim() && draft !== value) {
      onSave(draft.trim());
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return <>{renderInput(draft, setDraft, commit, cancel)}</>;
  }

  return <>{renderDisplay(value, startEdit)}</>;
}

function EditableName({
  name,
  onSave,
}: {
  name: string;
  onSave: (v: string) => void;
}) {
  return (
    <InlineEdit
      value={name}
      onSave={onSave}
      renderDisplay={(val, startEdit) => (
        <div onClick={startEdit} className="group flex items-center gap-2 cursor-pointer">
          <p className="text-sm font-medium text-gray-200 truncate">{val}</p>
          <span className="text-gray-600 group-hover:text-gray-400 transition-colors text-xs">✎</span>
        </div>
      )}
      renderInput={(val, setVal, commit, cancel) => (
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          onBlur={commit}
          className="w-full rounded bg-surface-900 border border-accent-500/50 px-2 py-1 text-sm text-gray-200 focus:outline-none"
        />
      )}
    />
  );
}

function EditableBpm({
  bpm,
  onSave,
}: {
  bpm: number;
  onSave: (v: string) => void;
}) {
  return (
    <InlineEdit
      value={String(bpm)}
      onSave={onSave}
      renderDisplay={(val, startEdit) => (
        <span
          onClick={startEdit}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-900/80 border border-surface-700/50 text-xs cursor-pointer hover:border-accent-500/50 transition-colors"
        >
          <span className="text-gray-500">BPM</span>
          <span className="font-mono font-semibold text-accent-300">{val}</span>
          <span className="text-gray-600 text-[10px]">✎</span>
        </span>
      )}
      renderInput={(val, setVal, commit, cancel) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-900/80 border border-accent-500/50 text-xs">
          <span className="text-gray-500">BPM</span>
          <input
            autoFocus
            type="number"
            min={20}
            max={300}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") cancel();
            }}
            onBlur={commit}
            className="w-14 bg-transparent font-mono font-semibold text-accent-300 outline-none"
          />
        </span>
      )}
    />
  );
}

function EditableKey({
  keyVal,
  onSave,
}: {
  keyVal: string;
  onSave: (v: string) => void;
}) {
  return (
    <InlineEdit
      value={keyVal}
      onSave={onSave}
      renderDisplay={(val, startEdit) => (
        <span
          onClick={startEdit}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-900/80 border border-surface-700/50 text-xs cursor-pointer hover:border-accent-500/50 transition-colors"
        >
          <span className="text-gray-500">Key</span>
          <span className="font-mono font-semibold text-accent-300">{val}</span>
          <span className="text-gray-600 text-[10px]">✎</span>
        </span>
      )}
      renderInput={(val, setVal, commit, cancel) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-900/80 border border-accent-500/50 text-xs">
          <span className="text-gray-500">Key</span>
          <select
            autoFocus
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={() => commit()}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancel();
              if (e.key === "Enter") commit();
            }}
            className="bg-transparent font-mono font-semibold text-accent-300 outline-none"
          >
            {NOTES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </span>
      )}
    />
  );
}

function EditableScale({
  scale,
  onSave,
}: {
  scale: string;
  onSave: (v: string) => void;
}) {
  return (
    <InlineEdit
      value={scale}
      onSave={onSave}
      renderDisplay={(val, startEdit) => (
        <span
          onClick={startEdit}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-900/80 border border-surface-700/50 text-xs cursor-pointer hover:border-accent-500/50 transition-colors"
        >
          <span className="text-gray-500">Scale</span>
          <span className="font-mono font-semibold text-accent-300">{val}</span>
          <span className="text-gray-600 text-[10px]">✎</span>
        </span>
      )}
      renderInput={(val, setVal, commit, cancel) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-900/80 border border-accent-500/50 text-xs">
          <span className="text-gray-500">Scale</span>
          <select
            autoFocus
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={() => commit()}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancel();
              if (e.key === "Enter") commit();
            }}
            className="bg-transparent font-mono font-semibold text-accent-300 outline-none"
          >
            {SCALE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </span>
      )}
    />
  );
}

function FlStudioBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-[10px] text-accent-400/70">
      <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse" />
      FL Studio &middot; Live Sync (Phase 7)
    </span>
  );
}

/* ── Project Anchor ─────────────── */

function ProjectAnchor({
  project,
  showNewProject,
  setShowNewProject,
  onCreateProject,
  updateProject,
}: {
  project: { id: number; name: string; bpm: number; key: string; scale: string } | null;
  showNewProject: boolean;
  setShowNewProject: (v: boolean) => void;
  onCreateProject: (name: string, bpm?: number, key?: string, scale?: string) => Promise<unknown>;
  updateProject: (updates: Partial<{ name: string; bpm: number; key: string; scale: string }>) => Promise<void>;
}) {
  if (!project) {
    return (
      <Panel title="Project">
        {showNewProject ? (
          <NewProjectForm
            onCreate={(name, bpm, key, scale) => {
              onCreateProject(name, bpm, key, scale);
              setShowNewProject(false);
            }}
            onCancel={() => setShowNewProject(false)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500 py-8">
            <p className="text-sm">No project loaded</p>
            <p className="text-xs text-gray-600">Click <span className="text-accent-400/80">New Project</span> in the top bar</p>
          </div>
        )}
      </Panel>
    );
  }

  return (
    <Panel title="Project">
      <div className="p-3 space-y-2">
        <EditableName
          name={project.name}
          onSave={(v) => updateProject({ name: v })}
        />
        <FlStudioBadge />
        <div className="flex gap-2 flex-wrap items-center">
          <EditableBpm
            bpm={project.bpm}
            onSave={(v) => updateProject({ bpm: parseInt(v, 10) || 120 })}
          />
          <EditableKey
            keyVal={project.key}
            onSave={(v) => updateProject({ key: v })}
          />
          <EditableScale
            scale={project.scale}
            onSave={(v) => updateProject({ scale: v })}
          />
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

function Chip({ label }: { label: string }) {
  return (
    <span className="px-2.5 py-1 rounded-full bg-surface-700/60 border border-surface-600/40 text-xs text-gray-400">
      {label}
    </span>
  );
}
