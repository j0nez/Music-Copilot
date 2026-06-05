import { useState } from 'react';
import { chordGenerator as apiChordGenerator, exportMidi as apiExportMidi, saveProgression as apiSaveProgression, theoryEngine } from '../api';
import type { TheoryChord, TheoryInterval, TheoryProgression, ProgressionChord, TheoryScale } from '../types';

const tabs = ['Scale Generator', 'Chord Builder', 'Interval Analyzer', 'Chord Progressions', 'Chord Generator'] as const;
type Tab = (typeof tabs)[number];

const NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

const SCALE_TYPES = [
  'Major', 'Natural Minor', 'Harmonic Minor', 'Melodic Minor',
  'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Locrian',
  'Pentatonic Major', 'Pentatonic Minor',
];

const CHORD_QUALITIES = [
  'Major', 'Minor', 'Diminished', 'Augmented',
  'Major 7th', 'Minor 7th', 'Dominant 7th', 'Sus2', 'Sus4',
];

const PROGRESSION_KEYS = [
  'C Minor', 'F Minor', 'G Minor', 'A Minor',
  'C Major', 'G Major', 'D Major',
];

const MOODS = ['Emotional', 'Dark', 'Uplifting', 'Melancholic', 'Energetic'];
const GENRES = ['Melodic Techno', 'House', 'Trance', 'Techno', 'Deep House', 'Progressive House'];

export default function MusicTheory() {
  const [activeTab, setActiveTab] = useState<Tab>('Scale Generator');

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Music Theory</h2>
      <div className="border-b border-surface-700 mb-4">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'Scale Generator' && <ScaleGenerator />}
      {activeTab === 'Chord Builder' && <ChordBuilder />}
      {activeTab === 'Interval Analyzer' && <IntervalAnalyzer />}
      {activeTab === 'Chord Progressions' && <ChordProgressions />}
      {activeTab === 'Chord Generator' && <ChordGenerator />}
    </div>
  );
}

function ScaleGenerator() {
  const [key, setKey] = useState('C');
  const [scaleType, setScaleType] = useState('Major');
  const [result, setResult] = useState<TheoryScale | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await theoryEngine('scale', { key, scale_type: scaleType });
      if (res.success && res.data) {
        setResult(res.data as TheoryScale);
      } else {
        setError(res.error?.message ?? 'Failed to generate scale');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-surface-700 p-4">
      <p className="text-sm text-gray-500 mb-4">
        Generate scales by key and type. Results display note names and interval patterns.
      </p>
      <div className="grid grid-cols-2 gap-4 mb-4 max-w-md">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Key</label>
          <select value={key} onChange={(e) => setKey(e.target.value)}
            className="w-full bg-surface-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500">
            {NOTES.map((n) => <option key={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Scale</label>
          <select value={scaleType} onChange={(e) => setScaleType(e.target.value)}
            className="w-full bg-surface-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500">
            {SCALE_TYPES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <button onClick={handleGenerate} disabled={loading}
        className="px-4 py-2 bg-primary-700 rounded-lg text-sm hover:bg-primary-600 transition-colors disabled:opacity-50">
        {loading ? 'Generating...' : 'Generate'}
      </button>

      {error && <p className="mt-4 text-red-300 text-sm">{error}</p>}

      {result && (
        <div className="mt-6">
          <p className="text-md font-semibold text-gray-200 mb-3">
            {result.key} {result.scale} Scale
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {result.notes.map((note, i) => (
              <span key={i}
                className="px-3 py-1.5 rounded-lg bg-primary-800/40 border border-primary-700/50 text-primary-200 text-sm font-medium">
                {note}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {result.intervals.map((iv, i) => (
              <span key={i} className="text-xs text-gray-500">{iv}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChordBuilder() {
  const [root, setRoot] = useState('C');
  const [quality, setQuality] = useState('Major');
  const [result, setResult] = useState<TheoryChord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBuild = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await theoryEngine('chord', { root, chord_quality: quality });
      if (res.success && res.data) {
        setResult(res.data as TheoryChord);
      } else {
        setError(res.error?.message ?? 'Failed to build chord');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-surface-700 p-4">
      <p className="text-sm text-gray-500 mb-4">
        Build chords by root note and quality. Shows notes and harmonic function.
      </p>
      <div className="grid grid-cols-2 gap-4 mb-4 max-w-md">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Root</label>
          <select value={root} onChange={(e) => setRoot(e.target.value)}
            className="w-full bg-surface-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500">
            {NOTES.map((n) => <option key={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Quality</label>
          <select value={quality} onChange={(e) => setQuality(e.target.value)}
            className="w-full bg-surface-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500">
            {CHORD_QUALITIES.map((q) => <option key={q}>{q}</option>)}
          </select>
        </div>
      </div>
      <button onClick={handleBuild} disabled={loading}
        className="px-4 py-2 bg-primary-700 rounded-lg text-sm hover:bg-primary-600 transition-colors disabled:opacity-50">
        {loading ? 'Building...' : 'Build'}
      </button>

      {error && <p className="mt-4 text-red-300 text-sm">{error}</p>}

      {result && (
        <div className="mt-6">
          <p className="text-md font-semibold text-gray-200 mb-2">
            {result.root} {result.quality}
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            {result.notes.map((note, i) => (
              <span key={i}
                className="px-3 py-1.5 rounded-lg bg-green-800/40 border border-green-700/50 text-green-200 text-sm font-medium">
                {note}
              </span>
            ))}
          </div>
          {result.function && (
            <p className="text-xs text-gray-500">Function: {result.function}</p>
          )}
        </div>
      )}
    </div>
  );
}

function IntervalAnalyzer() {
  const [note1, setNote1] = useState('C');
  const [note2, setNote2] = useState('E');
  const [result, setResult] = useState<TheoryInterval | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await theoryEngine('interval', { note1, note2 });
      if (res.success && res.data) {
        setResult(res.data as TheoryInterval);
      } else {
        setError(res.error?.message ?? 'Failed to analyze interval');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-surface-700 p-4">
      <p className="text-sm text-gray-500 mb-4">
        Enter two notes to find the interval between them.
      </p>
      <div className="flex items-end gap-4 mb-4 max-w-md">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Note 1</label>
          <select value={note1} onChange={(e) => setNote1(e.target.value)}
            className="w-full bg-surface-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500">
            {NOTES.map((n) => <option key={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Note 2</label>
          <select value={note2} onChange={(e) => setNote2(e.target.value)}
            className="w-full bg-surface-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500">
            {NOTES.map((n) => <option key={n}>{n}</option>)}
          </select>
        </div>
        <button onClick={handleAnalyze} disabled={loading}
          className="px-4 py-2 bg-primary-700 rounded-lg text-sm hover:bg-primary-600 transition-colors disabled:opacity-50">
          {loading ? '...' : 'Analyze'}
        </button>
      </div>

      {error && <p className="mt-4 text-red-300 text-sm">{error}</p>}

      {result && (
        <div className="mt-4">
          <p className="text-lg font-semibold text-gray-200">
            {result.note1} → {result.note2}
          </p>
          <p className="text-sm text-primary-300 mt-1">{result.interval}</p>
          <p className="text-xs text-gray-500">{result.semitones} semitone{result.semitones !== 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  );
}

function ChordProgressions() {
  const [key, setKey] = useState('A Minor');
  const [mood, setMood] = useState('Dark');
  const [genre, setGenre] = useState('Techno');
  const [result, setResult] = useState<TheoryProgression | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [midiStyle, setMidiStyle] = useState('block');
  const [midiVoicing, setMidiVoicing] = useState('close');

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    setSavedMsg(null);
    setError(null);
    try {
      const res = await theoryEngine('progression', { key, mood: mood.toLowerCase(), genre });
      if (res.success && res.data) {
        setResult(res.data as TheoryProgression);
      } else {
        setError(res.error?.message ?? 'Failed to generate progression');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
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
        setSavedMsg('Saved to Library');
      } else {
        setError(res.error?.message ?? 'Failed to save');
      }
    } catch {
      setError('Failed to connect to backend');
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
        style: midiStyle,
        voicing: midiVoicing,
        genre: genre.toLowerCase(),
        mood: mood.toLowerCase(),
      });
      if (res.success && res.data) {
        const a = document.createElement('a');
        a.href = `http://localhost:8000/api/exports/${res.data.filename}`;
        a.download = res.data.filename;
        a.click();
      } else {
        setError(res.error?.message ?? 'Failed to export MIDI');
      }
    } catch {
      setError('Failed to connect to backend');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="rounded-lg border border-surface-700 p-4">
      <p className="text-sm text-gray-500 mb-4">
        Generate chord progressions by key, mood, and genre. Export to MIDI.
      </p>
      <div className="grid grid-cols-3 gap-4 mb-4 max-w-lg">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Key</label>
          <select value={key} onChange={(e) => setKey(e.target.value)}
            className="w-full bg-surface-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500">
            {PROGRESSION_KEYS.map((k) => <option key={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Mood</label>
          <select value={mood} onChange={(e) => setMood(e.target.value)}
            className="w-full bg-surface-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500">
            {MOODS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Genre</label>
          <select value={genre} onChange={(e) => setGenre(e.target.value)}
            className="w-full bg-surface-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500">
            {GENRES.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={handleGenerate} disabled={loading}
          className="px-4 py-2 bg-primary-700 rounded-lg text-sm hover:bg-primary-600 transition-colors disabled:opacity-50">
          {loading ? 'Generating...' : 'Generate'}
        </button>
        <button onClick={handleSave} disabled={saving || !result}
          className="px-4 py-2 bg-surface-700 rounded-lg text-sm hover:bg-surface-600 transition-colors disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button onClick={handleExportMidi} disabled={exporting || !result}
          className="px-4 py-2 bg-blue-900/40 rounded-lg text-sm hover:bg-blue-900/60 transition-colors disabled:opacity-50">
          {exporting ? 'Exporting...' : 'Export MIDI'}
        </button>
      </div>

      {savedMsg && <p className="mt-4 text-green-300 text-sm">{savedMsg}</p>}

      {error && <p className="mt-4 text-red-300 text-sm">{error}</p>}

      {result && (
        <div className="mt-6">
          <div className="flex items-center gap-4 mb-3">
            <p className="text-md font-semibold text-gray-200">{result.key} — {result.mood}</p>
            <span className="text-xs text-gray-500">MIDI: </span>
            <select value={midiStyle} onChange={(e) => setMidiStyle(e.target.value)}
              className="bg-surface-800 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary-500">
              <option value="block">Block</option>
              <option value="arpeggio">Arpeggio</option>
              <option value="full">Full (Bass+Chords)</option>
            </select>
            <select value={midiVoicing} onChange={(e) => setMidiVoicing(e.target.value)}
              className="bg-surface-800 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary-500">
              <option value="close">Close</option>
              <option value="open">Open</option>
              <option value="drop2">Drop 2</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-3">
            {result.chords.map((chord: ProgressionChord, i: number) => (
              <div key={i}
                className="px-4 py-3 rounded-lg bg-purple-800/30 border border-purple-700/40 text-center min-w-[80px]">
                <p className="text-lg font-bold text-purple-200">{chord.roman}</p>
                <p className="text-xs text-gray-400 mt-0.5">{chord.name}</p>
                <p className="text-xs text-gray-500 mt-1">{chord.notes.join('–')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const GENERATOR_KEYS = [
  'C Minor', 'C# Minor', 'D Minor', 'Eb Minor', 'E Minor', 'F Minor',
  'F# Minor', 'G Minor', 'G# Minor', 'A Minor', 'Bb Minor', 'B Minor',
  'C Major', 'C# Major', 'D Major', 'Eb Major', 'E Major', 'F Major',
  'F# Major', 'G Major', 'Ab Major', 'A Major', 'Bb Major', 'B Major',
];

const GENERATOR_MOODS = ['Dark', 'Uplifting', 'Emotional', 'Melancholic', 'Energetic', 'Dreamy', 'Aggressive'];
const GENERATOR_GENRES = ['Techno', 'House', 'Trance', 'Deep House', 'Progressive House', 'Melodic Techno'];
const COMPLEXITY_OPTIONS = ['Simple', 'Advanced'];
const LENGTH_OPTIONS = [4, 8, 16];

function ChordGenerator() {
  const [key, setKey] = useState('A Minor');
  const [mood, setMood] = useState('Dark');
  const [genre, setGenre] = useState('Techno');
  const [length, setLength] = useState(4);
  const [complexity, setComplexity] = useState('Simple');
  const [result, setResult] = useState<TheoryProgression | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [midiStyle, setMidiStyle] = useState('block');
  const [midiVoicing, setMidiVoicing] = useState('close');

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    setSavedMsg(null);
    setError(null);
    try {
      const res = await apiChordGenerator(key, mood, genre, length, complexity.toLowerCase());
      if (res.success && res.data) {
        setResult(res.data as TheoryProgression);
      } else {
        setError(res.error?.message ?? 'Failed to generate progression');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
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
        setSavedMsg('Saved to Library');
      } else {
        setError(res.error?.message ?? 'Failed to save');
      }
    } catch {
      setError('Failed to connect to backend');
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
        style: midiStyle,
        voicing: midiVoicing,
        genre: genre.toLowerCase(),
        mood: mood.toLowerCase(),
      });
      if (res.success && res.data) {
        const a = document.createElement('a');
        a.href = `http://localhost:8000/api/exports/${res.data.filename}`;
        a.download = res.data.filename;
        a.click();
      } else {
        setError(res.error?.message ?? 'Failed to export MIDI');
      }
    } catch {
      setError('Failed to connect to backend');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="rounded-lg border border-surface-700 p-4">
      <p className="text-sm text-gray-500 mb-4">
        Generate chord progressions with advanced music theory rules. Supports all keys, multiple moods, and configurable length.
      </p>
      <div className="grid grid-cols-5 gap-4 mb-4 max-w-2xl">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Key</label>
          <select value={key} onChange={(e) => setKey(e.target.value)}
            className="w-full bg-surface-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500">
            {GENERATOR_KEYS.map((k) => <option key={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Mood</label>
          <select value={mood} onChange={(e) => setMood(e.target.value)}
            className="w-full bg-surface-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500">
            {GENERATOR_MOODS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Genre</label>
          <select value={genre} onChange={(e) => setGenre(e.target.value)}
            className="w-full bg-surface-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500">
            {GENERATOR_GENRES.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Bars</label>
          <select value={length} onChange={(e) => setLength(Number(e.target.value))}
            className="w-full bg-surface-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500">
            {LENGTH_OPTIONS.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Complexity</label>
          <select value={complexity} onChange={(e) => setComplexity(e.target.value)}
            className="w-full bg-surface-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500">
            {COMPLEXITY_OPTIONS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={handleGenerate} disabled={loading}
          className="px-4 py-2 bg-primary-700 rounded-lg text-sm hover:bg-primary-600 transition-colors disabled:opacity-50">
          {loading ? 'Generating...' : 'Generate'}
        </button>
        <button onClick={handleSave} disabled={saving || !result}
          className="px-4 py-2 bg-surface-700 rounded-lg text-sm hover:bg-surface-600 transition-colors disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button onClick={handleExportMidi} disabled={exporting || !result}
          className="px-4 py-2 bg-blue-900/40 rounded-lg text-sm hover:bg-blue-900/60 transition-colors disabled:opacity-50">
          {exporting ? 'Exporting...' : 'Export MIDI'}
        </button>
      </div>

      {savedMsg && <p className="mt-4 text-green-300 text-sm">{savedMsg}</p>}

      {error && <p className="mt-4 text-red-300 text-sm">{error}</p>}

      {result && (
        <div className="mt-6">
          <div className="flex items-center gap-4 mb-3">
            <p className="text-md font-semibold text-gray-200">{result.key} — {result.mood}</p>
            <span className="text-xs text-gray-500">MIDI: </span>
            <select value={midiStyle} onChange={(e) => setMidiStyle(e.target.value)}
              className="bg-surface-800 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary-500">
              <option value="block">Block</option>
              <option value="arpeggio">Arpeggio</option>
              <option value="full">Full (Bass+Chords)</option>
            </select>
            <select value={midiVoicing} onChange={(e) => setMidiVoicing(e.target.value)}
              className="bg-surface-800 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary-500">
              <option value="close">Close</option>
              <option value="open">Open</option>
              <option value="drop2">Drop 2</option>
            </select>
          </div>
          <p className="text-xs text-gray-500 mb-3">{result.chords.length} chords</p>
          <div className="flex flex-wrap gap-3">
            {result.chords.map((chord: ProgressionChord, i: number) => (
              <div key={i}
                className="px-4 py-3 rounded-lg bg-purple-800/30 border border-purple-700/40 text-center min-w-[80px]">
                <p className="text-lg font-bold text-purple-200">{chord.roman}</p>
                <p className="text-xs text-gray-400 mt-0.5">{chord.name}</p>
                <p className="text-xs text-gray-500 mt-1">{chord.notes.join('–')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
