import { useState } from "react";
import { chordGenerator as apiChordGenerator, exportMidi as apiExportMidi, saveProgression as apiSaveProgression, theoryEngine } from "../api";
import type { TheoryChord, TheoryInterval, TheoryProgression, ProgressionChord, TheoryScale } from "../types";

const tabs = ["Scale Generator", "Chord Builder", "Interval Analyzer", "Progressions"] as const;
type Tab = (typeof tabs)[number];

const NOTES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

const SCALE_TYPES = [
  "Major", "Natural Minor", "Harmonic Minor", "Melodic Minor",
  "Dorian", "Phrygian", "Lydian", "Mixolydian", "Locrian",
  "Pentatonic Major", "Pentatonic Minor",
];

const CHORD_QUALITIES = [
  "Major", "Minor", "Diminished", "Augmented",
  "Major 7th", "Minor 7th", "Dominant 7th", "Sus2", "Sus4",
];

export default function MusicTheoryPanel({
  onProgressionGenerated,
}: {
  onProgressionGenerated?: (progression: { key: string; chords: ProgressionChord[]; mood: string; genre: string }) => void;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("Scale Generator");

  return (
    <div className="flex flex-col h-full">
      <nav className="flex gap-1 px-3 pt-2 pb-1 border-b border-surface-700/30 shrink-0 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-2 py-1 text-xs font-medium rounded-t transition-colors ${
              activeTab === tab
                ? "text-accent-300 bg-surface-800/60 border border-surface-700/50 border-b-transparent"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === "Scale Generator" && <ScaleGenerator />}
        {activeTab === "Chord Builder" && <ChordBuilder />}
        {activeTab === "Interval Analyzer" && <IntervalAnalyzer />}
        {activeTab === "Progressions" && (
          <Progressions onGenerated={onProgressionGenerated} />
        )}
      </div>
    </div>
  );
}

/* ── Tab: Scale Generator ──────── */

function ScaleGenerator() {
  const [key, setKey] = useState("C");
  const [scaleType, setScaleType] = useState("Major");
  const [result, setResult] = useState<TheoryScale | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await theoryEngine("scale", { key, scale_type: scaleType });
      if (res.success && res.data) {
        setResult(res.data as TheoryScale);
      } else {
        setError(res.error?.message ?? "Failed to generate scale");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Generate scales by key and type.</p>
      <div className="grid grid-cols-2 gap-3 max-w-sm">
        <select value={key} onChange={(e) => setKey(e.target.value)}
          className="bg-surface-800 rounded px-2 py-1.5 text-xs text-gray-200 outline-none focus:ring-1 focus:ring-accent-500/50">
          {NOTES.map((n) => <option key={n}>{n}</option>)}
        </select>
        <select value={scaleType} onChange={(e) => setScaleType(e.target.value)}
          className="bg-surface-800 rounded px-2 py-1.5 text-xs text-gray-200 outline-none focus:ring-1 focus:ring-accent-500/50">
          {SCALE_TYPES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <button onClick={handleGenerate} disabled={loading}
        className="px-3 py-1.5 bg-accent-500/20 text-accent-300 rounded text-xs border border-accent-500/30 hover:bg-accent-500/30 transition-colors disabled:opacity-50">
        {loading ? "Generating..." : "Generate"}
      </button>

      {error && <p className="text-red-300 text-xs">{error}</p>}

      {result && (
        <div>
          <p className="text-sm font-semibold text-gray-200 mb-2">{result.key} {result.scale} Scale</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {result.notes.map((note, i) => (
              <span key={i} className="px-2 py-1 rounded bg-accent-500/15 border border-accent-500/30 text-accent-200 text-xs font-medium">
                {note}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {result.intervals.map((iv, i) => (
              <span key={i} className="text-xs text-gray-500">{iv}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Tab: Chord Builder ────────── */

function ChordBuilder() {
  const [root, setRoot] = useState("C");
  const [quality, setQuality] = useState("Major");
  const [result, setResult] = useState<TheoryChord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBuild = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await theoryEngine("chord", { root, chord_quality: quality });
      if (res.success && res.data) {
        setResult(res.data as TheoryChord);
      } else {
        setError(res.error?.message ?? "Failed to build chord");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Build chords by root and quality.</p>
      <div className="grid grid-cols-2 gap-3 max-w-sm">
        <select value={root} onChange={(e) => setRoot(e.target.value)}
          className="bg-surface-800 rounded px-2 py-1.5 text-xs text-gray-200 outline-none focus:ring-1 focus:ring-accent-500/50">
          {NOTES.map((n) => <option key={n}>{n}</option>)}
        </select>
        <select value={quality} onChange={(e) => setQuality(e.target.value)}
          className="bg-surface-800 rounded px-2 py-1.5 text-xs text-gray-200 outline-none focus:ring-1 focus:ring-accent-500/50">
          {CHORD_QUALITIES.map((q) => <option key={q}>{q}</option>)}
        </select>
      </div>
      <button onClick={handleBuild} disabled={loading}
        className="px-3 py-1.5 bg-accent-500/20 text-accent-300 rounded text-xs border border-accent-500/30 hover:bg-accent-500/30 transition-colors disabled:opacity-50">
        {loading ? "Building..." : "Build"}
      </button>

      {error && <p className="text-red-300 text-xs">{error}</p>}

      {result && (
        <div>
          <p className="text-sm font-semibold text-gray-200 mb-1">{result.root} {result.quality}</p>
          <div className="flex flex-wrap gap-1.5 mb-1">
            {result.notes.map((note, i) => (
              <span key={i} className="px-2 py-1 rounded bg-green-800/40 border border-green-700/50 text-green-200 text-xs font-medium">
                {note}
              </span>
            ))}
          </div>
          {result.function && <p className="text-xs text-gray-500">Function: {result.function}</p>}
        </div>
      )}
    </div>
  );
}

/* ── Tab: Interval Analyzer ────── */

function IntervalAnalyzer() {
  const [note1, setNote1] = useState("C");
  const [note2, setNote2] = useState("E");
  const [result, setResult] = useState<TheoryInterval | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await theoryEngine("interval", { note1, note2 });
      if (res.success && res.data) {
        setResult(res.data as TheoryInterval);
      } else {
        setError(res.error?.message ?? "Failed to analyze interval");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Find the interval between two notes.</p>
      <div className="flex items-end gap-3 max-w-sm">
        <select value={note1} onChange={(e) => setNote1(e.target.value)}
          className="bg-surface-800 rounded px-2 py-1.5 text-xs text-gray-200 outline-none focus:ring-1 focus:ring-accent-500/50">
          {NOTES.map((n) => <option key={n}>{n}</option>)}
        </select>
        <select value={note2} onChange={(e) => setNote2(e.target.value)}
          className="bg-surface-800 rounded px-2 py-1.5 text-xs text-gray-200 outline-none focus:ring-1 focus:ring-accent-500/50">
          {NOTES.map((n) => <option key={n}>{n}</option>)}
        </select>
        <button onClick={handleAnalyze} disabled={loading}
          className="px-3 py-1.5 bg-accent-500/20 text-accent-300 rounded text-xs border border-accent-500/30 hover:bg-accent-500/30 transition-colors disabled:opacity-50">
          {loading ? "..." : "Analyze"}
        </button>
      </div>

      {error && <p className="text-red-300 text-xs">{error}</p>}

      {result && (
        <div>
          <p className="text-sm font-semibold text-gray-200">{result.note1} → {result.note2}</p>
          <p className="text-xs text-accent-300 mt-0.5">{result.interval}</p>
          <p className="text-xs text-gray-500">{result.semitones} semitone{result.semitones !== 1 ? "s" : ""}</p>
        </div>
      )}
    </div>
  );
}

/* ── Tab: Progressions ─────────── */

const GENERATOR_KEYS = [
  "C Minor", "C# Minor", "D Minor", "Eb Minor", "E Minor", "F Minor",
  "F# Minor", "G Minor", "G# Minor", "A Minor", "Bb Minor", "B Minor",
  "C Major", "C# Major", "D Major", "Eb Major", "E Major", "F Major",
  "F# Major", "G Major", "Ab Major", "A Major", "Bb Major", "B Major",
];

const GENERATOR_MOODS = ["Dark", "Uplifting", "Emotional", "Melancholic", "Energetic", "Dreamy", "Aggressive"];
const GENERATOR_GENRES = ["Techno", "House", "Trance", "Deep House", "Progressive House", "Melodic Techno"];

function Progressions({ onGenerated }: {
  onGenerated?: (progression: { key: string; chords: ProgressionChord[]; mood: string; genre: string }) => void;
}) {
  const [key, setKey] = useState("A Minor");
  const [mood, setMood] = useState("Dark");
  const [genre, setGenre] = useState("Techno");
  const [length, setLength] = useState(4);
  const [complexity, setComplexity] = useState("Simple");
  const [result, setResult] = useState<TheoryProgression | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [midiStyle, setMidiStyle] = useState("block");
  const [midiVoicing, setMidiVoicing] = useState("close");

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    setSavedMsg(null);
    setError(null);
    try {
      const res = await apiChordGenerator(key, mood, genre, length, complexity.toLowerCase());
      if (res.success && res.data) {
        const p = res.data as TheoryProgression;
        setResult(p);
        onGenerated?.({ key: p.key, chords: p.chords, mood: p.mood, genre: p.genre });
      } else {
        setError(res.error?.message ?? "Failed to generate progression");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    setSavedMsg(null);
    setError(null);
    try {
      const res = await apiSaveProgression(result.key, result.mood, result.genre, result.chords);
      if (res.success) {
        setSavedMsg("Saved to Library");
      } else {
        setError(res.error?.message ?? "Failed to save");
      }
    } catch {
      setError("Failed to connect to backend");
    } finally {
      setSaving(false);
    }
  };

  const handleExportMidi = async () => {
    if (!result) return;
    setExporting(true);
    setError(null);
    try {
      const res = await apiExportMidi(result.key, result.chords, {
        style: midiStyle, voicing: midiVoicing, genre: genre.toLowerCase(), mood: mood.toLowerCase(),
      });
      if (res.success && res.data) {
        const a = document.createElement("a");
        a.href = `http://localhost:8000/api/exports/${res.data.filename}`;
        a.download = res.data.filename;
        a.click();
      } else {
        setError(res.error?.message ?? "Failed to export MIDI");
      }
    } catch {
      setError("Failed to connect to backend");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Generate progressions by key, mood, genre, length, and complexity.</p>
      <div className="grid grid-cols-5 gap-2 max-w-xl">
        <select value={key} onChange={(e) => setKey(e.target.value)}
          className="bg-surface-800 rounded px-2 py-1.5 text-xs text-gray-200 outline-none focus:ring-1 focus:ring-accent-500/50">
          {GENERATOR_KEYS.map((k) => <option key={k}>{k}</option>)}
        </select>
        <select value={mood} onChange={(e) => setMood(e.target.value)}
          className="bg-surface-800 rounded px-2 py-1.5 text-xs text-gray-200 outline-none focus:ring-1 focus:ring-accent-500/50">
          {GENERATOR_MOODS.map((m) => <option key={m}>{m}</option>)}
        </select>
        <select value={genre} onChange={(e) => setGenre(e.target.value)}
          className="bg-surface-800 rounded px-2 py-1.5 text-xs text-gray-200 outline-none focus:ring-1 focus:ring-accent-500/50">
          {GENERATOR_GENRES.map((g) => <option key={g}>{g}</option>)}
        </select>
        <select value={length} onChange={(e) => setLength(Number(e.target.value))}
          className="bg-surface-800 rounded px-2 py-1.5 text-xs text-gray-200 outline-none focus:ring-1 focus:ring-accent-500/50">
          <option value={4}>4 bars</option>
          <option value={8}>8 bars</option>
          <option value={16}>16 bars</option>
        </select>
        <select value={complexity} onChange={(e) => setComplexity(e.target.value)}
          className="bg-surface-800 rounded px-2 py-1.5 text-xs text-gray-200 outline-none focus:ring-1 focus:ring-accent-500/50">
          <option value="Simple">Simple</option>
          <option value="Advanced">Advanced</option>
        </select>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={handleGenerate} disabled={loading}
          className="px-3 py-1.5 bg-accent-500/20 text-accent-300 rounded text-xs border border-accent-500/30 hover:bg-accent-500/30 transition-colors disabled:opacity-50">
          {loading ? "Generating..." : "Generate"}
        </button>
        <button onClick={handleSave} disabled={saving || !result}
          className="px-3 py-1.5 bg-surface-700 rounded text-xs text-gray-300 hover:bg-surface-600 transition-colors disabled:opacity-50">
          {saving ? "Saving..." : "Save"}
        </button>
        <button onClick={handleExportMidi} disabled={exporting || !result}
          className="px-3 py-1.5 bg-blue-900/40 text-blue-300 rounded text-xs hover:bg-blue-900/60 transition-colors disabled:opacity-50">
          {exporting ? "Exporting..." : "MIDI"}
        </button>
      </div>

      {savedMsg && <p className="text-green-300 text-xs">{savedMsg}</p>}
      {error && <p className="text-red-300 text-xs">{error}</p>}

      {result && (
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-200">{result.key} — {result.mood}</p>
            <span className="text-xs text-gray-500">{result.chords.length} chords</span>
            <span className="text-xs text-gray-500">MIDI:</span>
            <select value={midiStyle} onChange={(e) => setMidiStyle(e.target.value)}
              className="bg-surface-800 rounded px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-accent-500/50">
              <option value="block">Block</option>
              <option value="arpeggio">Arpeggio</option>
              <option value="full">Full</option>
            </select>
            <select value={midiVoicing} onChange={(e) => setMidiVoicing(e.target.value)}
              className="bg-surface-800 rounded px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-accent-500/50">
              <option value="close">Close</option>
              <option value="open">Open</option>
              <option value="drop2">Drop 2</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.chords.map((chord: ProgressionChord, i: number) => (
              <div key={i} className="px-3 py-2 rounded-lg bg-purple-800/30 border border-purple-700/40 text-center min-w-[68px]">
                <p className="text-sm font-bold text-purple-200">{chord.roman}</p>
                <p className="text-[10px] text-gray-400">{chord.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
