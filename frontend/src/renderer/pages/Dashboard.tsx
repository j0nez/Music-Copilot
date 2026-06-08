import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useProject } from "../store/projectContext";
import AiStudio from "../components/AiStudio";
import GeneratePanel from "../components/GeneratePanel";
import MIDIPlayer from "../components/MIDIPlayer";
import ProjectSummary from "../components/ProjectSummary";
import SampleAnalysisPanel from "../components/SampleAnalysisPanel";
import GenerationHub from "../components/GenerationHub";
import LibraryModal from "../components/LibraryModal";
import SearchOverlay from "../components/SearchOverlay";
import ReferencePopover from "../components/ReferencePopover";
import type { Note, GeneratorSettings, ProgressionChord, GenerationHistory, ActivePartsSummary } from "../types";
import { SWING_PRESETS } from "../types";
import { chordGenerator, melodyGenerator, basslineGenerator, exportArrangement, saveArrangement, downloadFromUrl } from "../api";
import { chordNotesToMidi } from "../music/pitch";

const MAX_HISTORY = 5;
const DEFAULT_SETTINGS: GeneratorSettings = {
  key: "Auto", scale: "major", mood: "Auto", genre: "Auto",
  length: 8, complexity: "Auto", pattern: "Auto",
};

function emptyHistory(): GenerationHistory {
  return { chords: [], melody: [], bassline: [] };
}

export default function Dashboard() {
  const { project, createProject, updateProject } = useProject();
  const [showNewProject, setShowNewProject] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);

  const [settings, setSettings] = useState<GeneratorSettings>(DEFAULT_SETTINGS);
  const [chords, setChords] = useState<Note[]>([]);
  const [melody, setMelody] = useState<Note[]>([]);
  const [bassline, setBassline] = useState<Note[]>([]);
  const [swing, setSwing] = useState(0);
  const [_progChords, setProgChords] = useState<ProgressionChord[]>([]);
  const [_vlScore, setVlScore] = useState<number | undefined>(undefined);
  const [vlToast, setVlToast] = useState<number | null>(null);
  const [_history, setHistory] = useState<GenerationHistory>(emptyHistory);
  const historyIndexRef = useRef<{ chords: number; melody: number; bassline: number }>({
    chords: -1, melody: -1, bassline: -1,
  });
  const vlTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const bars = settings.length;
  const hasChords = chords.length > 0;
  const hasMelody = melody.length > 0;
  const hasBassline = bassline.length > 0;

  const activeParts = useMemo((): Record<string, ActivePartsSummary> => {
    const semitoneNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const pitchToName = (p: number) => semitoneNames[p % 12] + Math.floor(p / 12);
    const pitches = (notes: Note[]) => notes.map(n => n.pitch);
    return {
      chords: {
        count: chords.length,
        bars,
        root_notes: [...new Set(chords.map(n => semitoneNames[n.pitch % 12]))],
      },
      melody: {
        count: melody.length,
        bars,
        range: melody.length > 0
          ? `${pitchToName(Math.min(...pitches(melody)))}-${pitchToName(Math.max(...pitches(melody)))}`
          : "",
      },
      bassline: { count: bassline.length, bars },
    };
  }, [chords, melody, bassline, bars]);

  function pushHistory(type: 'chords' | 'melody' | 'bassline', notes: Note[]) {
    setHistory(prev => {
      const key = type as keyof GenerationHistory;
      const arr = [...prev[key], notes];
      if (arr.length > MAX_HISTORY) arr.shift();
      return { ...prev, [key]: arr };
    });
    historyIndexRef.current[type] = _history[type].length;
  }

  function cycleHistory(type: 'chords' | 'melody' | 'bassline', direction: -1 | 1) {
    const arr = _history[type];
    if (arr.length < 2) return;
    let idx = historyIndexRef.current[type];
    if (idx < 0 || idx >= arr.length) idx = arr.length - 1;
    const nextIdx = (idx + direction + arr.length) % arr.length;
    historyIndexRef.current[type] = nextIdx;
    const nextNotes = arr[nextIdx];
    if (type === 'chords') setChords(nextNotes);
    else if (type === 'melody') setMelody(nextNotes);
    else setBassline(nextNotes);
  }

  function showVlToast(score: number) {
    setVlToast(score);
    if (vlTimerRef.current) clearTimeout(vlTimerRef.current);
    vlTimerRef.current = setTimeout(() => setVlToast(null), 4000);
  }

  const handleGenerateChords = useCallback((pchords: ProgressionChord[], notes: Note[], vl?: number) => {
    setProgChords(pchords);
    setVlScore(vl);
    setChords(notes);
    pushHistory('chords', notes);
    if (vl != null) showVlToast(vl);
  }, []);

  const handleGenerateMelody = useCallback((notes: Note[]) => {
    setMelody(notes);
    pushHistory('melody', notes);
  }, []);

  const handleGenerateBassline = useCallback((notes: Note[]) => {
    setBassline(notes);
    pushHistory('bassline', notes);
  }, []);

  const handleToolNotes = useCallback((notes: { melody?: Note[]; bassline?: Note[]; chords?: Note[] }) => {
    if (notes.chords) { setChords(notes.chords); pushHistory('chords', notes.chords); }
    if (notes.melody) { setMelody(notes.melody); pushHistory('melody', notes.melody); }
    if (notes.bassline) { setBassline(notes.bassline); pushHistory('bassline', notes.bassline); }
  }, []);

  const handleAutoGenerate = useCallback(async (s: GeneratorSettings) => {
    const res = await chordGenerator(s.key, s.mood, s.genre, s.length, s.complexity);
    if (res.success && res.data) {
      setProgChords(res.data.chords);
      const vl = res.data.voice_leading?.score;
      setVlScore(vl);
      const notes = chordNotesToMidi(res.data.chords, 1);
      setChords(notes);
      pushHistory('chords', notes);
      if (vl != null) showVlToast(vl);
    }
  }, []);

  const handleClear = useCallback((type: 'chords' | 'melody' | 'bassline') => {
    if (type === 'chords') { setChords([]); setProgChords([]); }
    else if (type === 'melody') setMelody([]);
    else if (type === 'bassline') setBassline([]);
  }, []);

  const handleRegenerate = useCallback(async (type: 'chords' | 'melody' | 'bassline') => {
    const s = settings;
    const resolvedKey = s.key === 'Auto' ? (project?.key ?? 'C') : s.key;
    const resolvedMood = s.mood === 'Auto' ? 'uplifting' : s.mood;
    const resolvedGenre = s.genre === 'Auto' ? 'house' : s.genre;
    const resolvedScale = s.scale === 'Auto' ? (project?.scale?.toLowerCase() ?? 'major') : s.scale;
    const resolvedLength = s.length > 0 ? s.length : 8;
    const resolvedComplexity = s.complexity === 'Auto' ? 'simple' : s.complexity;

    if (type === 'chords') {
      const res = await chordGenerator(resolvedKey, resolvedMood, resolvedGenre, resolvedLength, resolvedComplexity);
      if (res.success && res.data) {
        setProgChords(res.data.chords);
        const vl = res.data.voice_leading?.score;
        setVlScore(vl);
        const notes = chordNotesToMidi(res.data.chords, 1);
        setChords(notes);
        pushHistory('chords', notes);
        if (vl != null) showVlToast(vl);
      }
    } else if (type === 'melody') {
      const res = await melodyGenerator(resolvedKey, resolvedScale, resolvedMood, resolvedGenre, resolvedLength, resolvedComplexity);
      if (res.success && res.data) {
        setMelody(res.data.notes);
        pushHistory('melody', res.data.notes);
      }
    } else if (type === 'bassline') {
      const res = await basslineGenerator(resolvedKey, resolvedScale, resolvedGenre, resolvedLength, settings.pattern);
      if (res.success && res.data) {
        setBassline(res.data.notes);
        pushHistory('bassline', res.data.notes);
      }
    }
  }, [settings, project]);

  const handleExportMidi = useCallback(async () => {
    if (!project) return;
    const res = await exportArrangement(chords, melody, bassline, project.bpm, swing, {
      chords: true, melody: true, bassline: true,
    });
    if (res.success && res.data) {
      await downloadFromUrl(res.data.download_url, res.data.filename);
    }
  }, [chords, melody, bassline, project, swing]);

  const handleSaveArrangement = useCallback(async () => {
    if (!project || saving || !hasChords && !hasMelody && !hasBassline) return;
    setSaving(true);
    const name = `Arrangement - ${project.key} - ${settings.genre} - ${bars} bars`;
    const res = await saveArrangement(chords, melody, bassline, project.key,
      settings.scale,
      settings.mood !== 'Auto' ? settings.mood : null,
      settings.genre !== 'Auto' ? settings.genre : null,
      project.bpm,
      { project_id: project.id, name },
    );
    setSaving(false);
    const msg = res.success ? 'Saved to Library' : (res.error?.message ?? 'Save failed');
    setSaveToast(msg);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaveToast(null), 3000);
  }, [project, chords, melody, bassline, settings, bars, saving]);

  const handleLoadFromLibrary = useCallback((item: { data: ProgressionChord[] | { chords: Note[]; melody: Note[]; bassline: Note[] } | Note[]; _part?: string }) => {
    if (item._part) {
      const arrData = item.data as { chords: Note[]; melody: Note[]; bassline: Note[] };
      const part = item._part as 'chords' | 'melody' | 'bassline';
      const notes = arrData[part] ?? [];
      if (part === 'chords') setChords(notes);
      else if (part === 'melody') setMelody(notes);
      else if (part === 'bassline') setBassline(notes);
      pushHistory(part, notes);
      return;
    }
    if (Array.isArray(item.data)) {
      if (item.data.length > 0 && 'roman' in item.data[0]) {
        const notes = chordNotesToMidi(item.data as ProgressionChord[], 1);
        setProgChords(item.data as ProgressionChord[]);
        setChords(notes);
        pushHistory('chords', notes);
      } else {
        setChords(item.data as Note[]);
        pushHistory('chords', item.data as Note[]);
      }
    } else {
      const arrData = item.data as { chords: Note[]; melody: Note[]; bassline: Note[] };
      if (arrData.chords?.length) {
        setChords(arrData.chords);
        pushHistory('chords', arrData.chords);
      }
      if (arrData.melody?.length) {
        setMelody(arrData.melody);
        pushHistory('melody', arrData.melody);
      }
      if (arrData.bassline?.length) {
        setBassline(arrData.bassline);
        pushHistory('bassline', arrData.bassline);
      }
    }
  }, []);

  const prevGenreRef = useRef(settings.genre);
  useEffect(() => {
    if (settings.genre !== 'Auto' && settings.genre !== prevGenreRef.current) {
      const preset = SWING_PRESETS[settings.genre as keyof typeof SWING_PRESETS];
      if (preset !== undefined) setSwing(preset);
    }
    prevGenreRef.current = settings.genre;
  }, [settings.genre]);

  useEffect(() => {
    return () => {
      if (vlTimerRef.current) clearTimeout(vlTimerRef.current);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault(); setSearchOpen(true); return;
      }
      if (e.key === "Escape") {
        if (hubOpen) { setHubOpen(false); return; }
        if (searchOpen) { setSearchOpen(false); return; }
        if (libraryOpen) { setLibraryOpen(false); return; }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!hasChords) {
          (document.querySelector('[data-gen="chords"]') as HTMLButtonElement)?.click();
        } else if (!hasMelody) {
          (document.querySelector('[data-gen="melody"]') as HTMLButtonElement)?.click();
        } else if (!hasBassline) {
          (document.querySelector('[data-gen="bassline"]') as HTMLButtonElement)?.click();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "M") {
        e.preventDefault(); handleExportMidi();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (hasChords || hasMelody || hasBassline) {
          handleSaveArrangement();
        }
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [hubOpen, searchOpen, libraryOpen, hasChords, hasMelody, hasBassline, handleExportMidi, handleSaveArrangement]);

  return (
    <div className="h-full flex flex-col gap-3 p-3">
      {saveToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-xs font-medium shadow-lg transition-opacity"
          style={{ backgroundColor: saveToast === 'Saved to Library' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)', color: saveToast === 'Saved to Library' ? '#4ade80' : '#f87171' }}
        >
          {saveToast}
        </div>
      )}
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} onSelectIdea={() => setLibraryOpen(true)} />}
      {libraryOpen && <LibraryModal onClose={() => setLibraryOpen(false)} onLoad={handleLoadFromLibrary} />}
      {hubOpen && (
        <GenerationHub
          chords={chords} melody={melody} bassline={bassline}
          bpm={project?.bpm ?? 120} bars={bars}
          swing={swing}
          settings={settings}
          onSettingsChange={setSettings}
          onSetMelody={handleGenerateMelody}
          onSetBassline={handleGenerateBassline}
          projectKey={project?.key ?? 'C'}
          projectScale={project?.scale ?? 'Major'}
          projectId={project?.id}
          open={hubOpen} onClose={() => setHubOpen(false)}
        />
      )}

      <TopBar
        projectName={project?.name ?? null}
        onNewProject={() => setShowNewProject(true)}
        onOpenLibrary={() => setLibraryOpen(true)}
        onSearchOpen={() => setSearchOpen(true)}
        onHubOpen={() => setHubOpen(true)}
        hasAny={hasChords || hasMelody || hasBassline}
      />

      <div className="flex-1 flex flex-col gap-3 min-h-0 lg:flex-row">
        {/* Left column 45% */}
        <div className="w-full lg:w-[45%] flex flex-col gap-3 min-h-0 overflow-y-auto">
          <ProjectAnchor
            project={project}
            showNewProject={showNewProject}
            setShowNewProject={setShowNewProject}
            onCreateProject={createProject}
            updateProject={updateProject}
          />
          {project ? (
            <Panel title="Generate">
              <div className="p-3">
                {vlToast != null && (
                  <div className="mb-2 px-2 py-1 rounded text-xs font-medium text-center transition-opacity"
                    style={{ backgroundColor: vlToast >= 7 ? 'rgba(34,197,94,0.2)' : 'rgba(234,179,8,0.2)', color: vlToast >= 7 ? '#4ade80' : '#facc15' }}
                  >
                    Voice Leading: {vlToast}/10
                  </div>
                )}
                <GeneratePanel
                  settings={settings}
                  onChange={setSettings}
                  onGenerateChords={handleGenerateChords}
                  onGenerateMelody={handleGenerateMelody}
                  onGenerateBassline={handleGenerateBassline}
                  onPushHistory={pushHistory}
                  onAutoGenerate={handleAutoGenerate}
                  project={project ? { key: project.key, scale: project.scale, bpm: project.bpm } : null}
                  disabled={false}
                />
              </div>
            </Panel>
          ) : (
            <Panel title="Generate">
              <div className="flex items-center justify-center h-20 text-gray-600 text-xs">
                Create a project first
              </div>
            </Panel>
          )}
          <Panel title="Sample Analysis">
            <SampleAnalysisPanel />
          </Panel>
        </div>

        {/* Right column 55% — Chat (hero panel) */}
        <div className="w-full lg:w-[55%] min-h-0">
          <Panel title="Chat" className="h-full">
            <AiStudio project={project} activeParts={activeParts} onToolNotes={handleToolNotes} />
          </Panel>
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex flex-col gap-3 shrink-0 lg:flex-row lg:h-48">
        <Panel title="MIDI Player" className="flex-1">
          <MIDIPlayer
            chords={chords} melody={melody} bassline={bassline}
            bpm={project?.bpm ?? 120} bars={bars}
            swing={swing} onSwingChange={setSwing}
            onRegenerate={handleRegenerate}
            onClear={handleClear}
            onSaveToLibrary={handleSaveArrangement}
            historyCounts={{ chords: _history.chords.length, melody: _history.melody.length, bassline: _history.bassline.length }}
            onCycleHistory={cycleHistory}
          />
        </Panel>
        <Panel title="Project Summary" className="flex-1">
          <ProjectSummary
            project={project}
            chords={chords} melody={melody} bassline={bassline}
            solo={{ chords: true, melody: true, bassline: true }}
            swing={swing} onSwingChange={setSwing}
          />
        </Panel>
      </div>
    </div>
  );
}

/* ── TopBar ─────────────────────── */

function TopBar({ projectName, onNewProject, onOpenLibrary, onSearchOpen, onHubOpen, hasAny }: {
  projectName: string | null;
  onNewProject: () => void; onOpenLibrary: () => void; onSearchOpen: () => void;
  onHubOpen: () => void; hasAny: boolean;
}) {
  return (
    <div className="flex items-center gap-2 sm:gap-4 px-2 sm:px-4 py-3 bg-surface-800/50 rounded-xl border border-surface-700/50 shrink-0 flex-wrap">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-accent-400" />
        <span className="font-heading font-bold text-sm tracking-wide text-accent-300">Music Copilot</span>
      </div>
      <span className="text-[10px] sm:text-xs text-gray-600">v0.1.0</span>

      <div className="hidden sm:flex items-center gap-1 ml-2">
        <ReferencePopover type="scale" />
        <ReferencePopover type="chord" />
        <ReferencePopover type="interval" />
      </div>

      <div className="flex-1 min-w-[8px]" />

      {hasAny && (
        <button onClick={onHubOpen} className="text-[10px] sm:text-xs text-gray-400 hover:text-white transition-colors px-1.5 sm:px-2 py-1 rounded border border-surface-700/50">
          Hub
        </button>
      )}
      <button onClick={onSearchOpen} className="text-[10px] sm:text-xs text-gray-500 hover:text-gray-300 transition-colors px-1.5 sm:px-2 py-1 rounded border border-surface-700/50">
        Search
      </button>
      <button onClick={onOpenLibrary} className="text-[10px] sm:text-xs text-gray-400 hover:text-white transition-colors px-1.5 sm:px-3 py-1 rounded border border-surface-700/50 hover:border-surface-600">
        Library
      </button>
      <button onClick={onNewProject} className="text-[10px] sm:text-xs bg-accent-500/20 text-accent-300 px-2 sm:px-3 py-1.5 rounded-lg border border-accent-500/30 hover:bg-accent-500/30 transition-colors whitespace-nowrap">
        {projectName ? "Switch" : "New"}
      </button>
    </div>
  );
}

/* ── Project Anchor ─────────────── */

const NOTES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const SCALE_TYPES = [
  "Major", "Natural Minor", "Harmonic Minor", "Melodic Minor",
  "Dorian", "Phrygian", "Lydian", "Mixolydian", "Locrian",
  "Pentatonic Major", "Pentatonic Minor",
];

const NEW_BPM_DEFAULT = 120;
const NEW_KEY_DEFAULT = "C";
const NEW_SCALE_DEFAULT = "Major";

function NewProjectForm({ onCreate, onCancel }: {
  onCreate: (name: string, bpm: number, key: string, scale: string) => void; onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [bpmStr, setBpmStr] = useState(String(NEW_BPM_DEFAULT));
  const [key, setKey] = useState(NEW_KEY_DEFAULT);
  const [scale, setScale] = useState(NEW_SCALE_DEFAULT);
  const [creating, setCreating] = useState(false);

  const parseBpm = (s: string): number => {
    const n = parseInt(s, 10);
    if (isNaN(n) || n < 20) return 20;
    if (n > 300) return 300;
    return n;
  };

  const handleCreate = async () => {
    if (!name.trim() || creating) return;
    setCreating(true);
    try { await onCreate(name.trim(), parseBpm(bpmStr), key, scale); }
    finally { setCreating(false); }
  };

  return (
    <div className="p-3 space-y-3">
      <input autoFocus placeholder="Project name" value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") onCancel(); }}
        className="w-full rounded bg-surface-900 border border-surface-700 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent-500/50"
      />
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-gray-500 block mb-1">BPM</label>
          <input type="text" inputMode="numeric" placeholder="120" value={bpmStr}
            onChange={e => setBpmStr(e.target.value)} onBlur={() => setBpmStr(String(parseBpm(bpmStr)))}
            className="w-full rounded bg-surface-900 border border-surface-700 px-3 py-2 text-sm font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent-500/50"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Key</label>
          <select value={key} onChange={e => setKey(e.target.value)}
            className="w-full rounded bg-surface-900 border border-surface-700 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent-500/50"
          >{NOTES.map(n => <option key={n}>{n}</option>)}</select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Scale</label>
          <select value={scale} onChange={e => setScale(e.target.value)}
            className="w-full rounded bg-surface-900 border border-surface-700 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent-500/50"
          >{SCALE_TYPES.map(s => <option key={s}>{s}</option>)}</select>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={handleCreate} disabled={!name.trim() || creating}
          className="text-xs bg-accent-500/20 text-accent-300 px-3 py-1.5 rounded border border-accent-500/30 hover:bg-accent-500/30 transition-colors disabled:opacity-50"
        >{creating ? "Creating..." : "Create"}</button>
        <button onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 rounded border border-surface-700/50 transition-colors">Cancel</button>
      </div>
    </div>
  );
}

/* ── Inline edit ── */

function InlineEdit({ value, onSave, renderDisplay, renderInput }: {
  value: string; onSave: (val: string) => void;
  renderDisplay: (val: string, startEdit: () => void) => React.ReactNode;
  renderInput: (val: string, onValChange: (v: string) => void, onCommit: () => void, onCancel: () => void) => React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const startEdit = () => { setDraft(value); setEditing(true); };
  const commit = () => { if (draft.trim() && draft !== value) onSave(draft.trim()); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };
  if (editing) return <>{renderInput(draft, setDraft, commit, cancel)}</>;
  return <>{renderDisplay(value, startEdit)}</>;
}

function EditableName({ name, onSave }: { name: string; onSave: (v: string) => void }) {
  return (
    <InlineEdit value={name} onSave={onSave}
      renderDisplay={(val, startEdit) => (
        <div onClick={startEdit} className="group flex items-center gap-2 cursor-pointer">
          <p className="text-sm font-medium text-gray-200 truncate">{val}</p>
          <span className="text-gray-600 group-hover:text-gray-400 transition-colors text-xs">✎</span>
        </div>
      )}
      renderInput={(val, setVal, commit, cancel) => (
        <input autoFocus value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel(); }}
          onBlur={commit}
          className="w-full rounded bg-surface-900 border border-accent-500/50 px-2 py-1 text-sm text-gray-200 focus:outline-none"
        />
      )}
    />
  );
}

function EditableBpm({ bpm, onSave }: { bpm: number; onSave: (v: string) => void }) {
  return (
    <InlineEdit value={String(bpm)} onSave={onSave}
      renderDisplay={(val, startEdit) => (
        <span onClick={startEdit} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-900/80 border border-surface-700/50 text-xs cursor-pointer hover:border-accent-500/50 transition-colors">
          <span className="text-gray-500">BPM</span>
          <span className="font-mono font-semibold text-accent-300">{val}</span>
          <span className="text-gray-600 text-[10px]">✎</span>
        </span>
      )}
      renderInput={(val, setVal, commit, cancel) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-900/80 border border-accent-500/50 text-xs">
          <span className="text-gray-500">BPM</span>
          <input autoFocus type="number" min={20} max={300} value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel(); }}
            onBlur={commit} className="w-14 bg-transparent font-mono font-semibold text-accent-300 outline-none"
          />
        </span>
      )}
    />
  );
}

function EditableKey({ keyVal, onSave }: { keyVal: string; onSave: (v: string) => void }) {
  return (
    <InlineEdit value={keyVal} onSave={onSave}
      renderDisplay={(val, startEdit) => (
        <span onClick={startEdit} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-900/80 border border-surface-700/50 text-xs cursor-pointer hover:border-accent-500/50 transition-colors">
          <span className="text-gray-500">Key</span>
          <span className="font-mono font-semibold text-accent-300">{val}</span>
          <span className="text-gray-600 text-[10px]">✎</span>
        </span>
      )}
      renderInput={(val, setVal, commit, cancel) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-900/80 border border-accent-500/50 text-xs">
          <span className="text-gray-500">Key</span>
          <select autoFocus value={val} onChange={e => setVal(e.target.value)} onBlur={() => commit()}
            onKeyDown={e => { if (e.key === "Escape") cancel(); if (e.key === "Enter") commit(); }}
            className="bg-surface-800 text-accent-300 font-mono font-semibold outline-none rounded p-1"
          >{NOTES.map(n => <option key={n} value={n}>{n}</option>)}</select>
        </span>
      )}
    />
  );
}

function EditableScale({ scale, onSave }: { scale: string; onSave: (v: string) => void }) {
  return (
    <InlineEdit value={scale} onSave={onSave}
      renderDisplay={(val, startEdit) => (
        <span onClick={startEdit} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-900/80 border border-surface-700/50 text-xs cursor-pointer hover:border-accent-500/50 transition-colors">
          <span className="text-gray-500">Scale</span>
          <span className="font-mono font-semibold text-accent-300">{val}</span>
          <span className="text-gray-600 text-[10px]">✎</span>
        </span>
      )}
      renderInput={(val, setVal, commit, cancel) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-900/80 border border-accent-500/50 text-xs">
          <span className="text-gray-500">Scale</span>
          <select autoFocus value={val} onChange={e => setVal(e.target.value)} onBlur={() => commit()}
            onKeyDown={e => { if (e.key === "Escape") cancel(); if (e.key === "Enter") commit(); }}
            className="bg-surface-800 text-accent-300 font-mono font-semibold outline-none rounded p-1"
          >{SCALE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}</select>
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

function ProjectAnchor({ project, showNewProject, setShowNewProject, onCreateProject, updateProject }: {
  project: { id: number; name: string; bpm: number; key: string; scale: string } | null;
  showNewProject: boolean; setShowNewProject: (v: boolean) => void;
  onCreateProject: (name: string, bpm?: number, key?: string, scale?: string) => Promise<unknown>;
  updateProject: (updates: Partial<{ name: string; bpm: number; key: string; scale: string }>) => Promise<void>;
}) {
  if (showNewProject) {
    return (
      <Panel title="Project">
        <NewProjectForm
          onCreate={async (name, bpm, key, scale) => { await onCreateProject(name, bpm, key, scale); setShowNewProject(false); }}
          onCancel={() => setShowNewProject(false)}
        />
      </Panel>
    );
  }
  if (!project) {
    return (
      <Panel title="Project">
        <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500 py-8">
          <p className="text-sm">No project loaded</p>
          <p className="text-xs text-gray-600">Click <span className="text-accent-400/80">New Project</span> in the top bar</p>
        </div>
      </Panel>
    );
  }
  return (
    <Panel title="Project">
      <div className="p-3 space-y-2">
        <EditableName name={project.name} onSave={v => updateProject({ name: v })} />
        <FlStudioBadge />
        <div className="flex gap-2 flex-wrap items-center">
          <EditableBpm bpm={project.bpm} onSave={v => updateProject({ bpm: parseInt(v, 10) || 120 })} />
          <EditableKey keyVal={project.key} onSave={v => updateProject({ key: v })} />
          <EditableScale scale={project.scale} onSave={v => updateProject({ scale: v })} />
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
