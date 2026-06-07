import { useState, useRef, useEffect, useCallback } from 'react';
import { chordGenerator, melodyGenerator, basslineGenerator } from '../api';
import ReferencePopover from './ReferencePopover';
import { chordNotesToMidi } from '../music/pitch';
import { withAbort } from '../utils/async';
import type { GeneratorSettings, Note, ProgressionChord } from '../types';

interface GeneratePanelProps {
  settings: GeneratorSettings;
  onChange: (s: GeneratorSettings) => void;
  onGenerateChords: (chords: ProgressionChord[], notes: Note[], vl: number | undefined) => void;
  onGenerateMelody: (notes: Note[]) => void;
  onGenerateBassline: (notes: Note[]) => void;
  onPushHistory: (type: 'chords' | 'melody' | 'bassline', notes: Note[]) => void;
  onAutoGenerate: (s: GeneratorSettings) => Promise<void>;
  project: { key: string; scale: string; bpm: number } | null;
  disabled: boolean;
}

const PRESETS = [
  { label: 'Dark Techno', mood: 'dark', genre: 'techno', complexity: 'simple' },
  { label: 'Uplifting Trance', mood: 'uplifting', genre: 'trance', complexity: 'advanced' },
  { label: 'Deep House', mood: 'chill', genre: 'deep house', complexity: 'simple' },
  { label: 'Melodic DnB', mood: 'chill', genre: 'dnb', complexity: 'advanced' },
  { label: 'Surprise Me ✨', mood: 'random', genre: 'random', complexity: 'random' },
];

const randomMood = () => ['dark', 'uplifting', 'happy', 'chill', 'angry', 'sad'][Math.floor(Math.random() * 6)];
const randomGenre = () => ['house', 'techno', 'trance', 'dnb', 'dubstep', 'future_bass'][Math.floor(Math.random() * 6)];
const randomKey = () => ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][Math.floor(Math.random() * 12)];
const randomScale = () => ['major', 'minor'][Math.floor(Math.random() * 2)];
const randomComplexity = () => ['simple', 'advanced'][Math.floor(Math.random() * 2)];
const randomLength = () => [4, 8, 16][Math.floor(Math.random() * 3)];

export default function GeneratePanel({
  settings, onChange, onGenerateChords, onGenerateMelody, onGenerateBassline,
  onPushHistory, onAutoGenerate, project, disabled,
}: GeneratePanelProps) {
  const [loading, setLoading] = useState<'none' | 'chords' | 'melody' | 'bassline'>('none');
  const [error, setError] = useState<string | null>(null);
  const refTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allAuto = settings.key === 'Auto' || settings.mood === 'Auto' || settings.genre === 'Auto';

  function applyPreset(p: typeof PRESETS[number]) {
    const randomize = p.label === 'Surprise Me ✨';
    const projectKey = project?.key ?? 'C';
    const s: GeneratorSettings = {
      key: randomize ? randomKey() : settings.key === 'Auto' ? projectKey : settings.key,
      scale: randomize ? randomScale() : 'major',
      mood: p.mood === 'random' ? randomMood() : p.mood,
      genre: p.genre === 'random' ? randomGenre() : p.genre,
      length: randomize ? randomLength() : settings.length > 0 ? settings.length : 8,
      complexity: p.complexity === 'random' ? randomComplexity() : p.complexity,
      pattern: 'Auto',
    };
    onChange(s);
    onAutoGenerate(s);
  }

  const handleError = useCallback((msg: string) => {
    setError(msg);
    if (refTimerRef.current) clearTimeout(refTimerRef.current);
    refTimerRef.current = setTimeout(() => setError(null), 4000);
  }, []);

  function resolveSettings(): GeneratorSettings {
    if (!allAuto) return settings;
    return {
      key: settings.key === 'Auto' ? (project?.key ?? 'C') : settings.key,
      scale: settings.scale === 'Auto' ? (project?.scale.toLowerCase() ?? 'major') : settings.scale,
      mood: settings.mood === 'Auto' ? 'uplifting' : settings.mood,
      genre: settings.genre === 'Auto' ? 'house' : settings.genre,
      length: settings.length > 0 ? settings.length : 8,
      complexity: settings.complexity === 'Auto' ? 'simple' : settings.complexity,
      pattern: 'Auto',
    };
  }

  async function handleGenerateChords() {
    setLoading('chords');
    setError(null);
    const s = resolveSettings();
    const res = await withAbort(signal => chordGenerator(s.key, s.mood, s.genre, s.length, s.complexity, signal));
    if (res.success && res.data) {
      const notes = chordNotesToMidi(res.data.chords, 1);
      onPushHistory('chords', notes);
      onGenerateChords(res.data.chords, notes, res.data.voice_leading?.score);
    } else {
      handleError(res.error?.message ?? 'Failed to generate chords');
    }
    setLoading('none');
  }

  async function handleGenerateMelody() {
    setLoading('melody');
    setError(null);
    const s = resolveSettings();
    const res = await withAbort(signal => melodyGenerator(s.key, s.scale, s.mood, s.genre, s.length, s.complexity, signal));
    if (res.success && res.data) {
      onPushHistory('melody', res.data.notes);
      onGenerateMelody(res.data.notes);
    } else {
      handleError(res.error?.message ?? 'Failed to generate melody');
    }
    setLoading('none');
  }

  async function handleGenerateBassline() {
    setLoading('bassline');
    setError(null);
    const s = resolveSettings();
    const res = await withAbort(signal => basslineGenerator(s.key, s.scale, s.genre, s.length, 'auto', signal));
    if (res.success && res.data) {
      onPushHistory('bassline', res.data.notes);
      onGenerateBassline(res.data.notes);
    } else {
      handleError(res.error?.message ?? 'Failed to generate bassline');
    }
    setLoading('none');
  }

  useEffect(() => {
    return () => { if (refTimerRef.current) clearTimeout(refTimerRef.current); };
  }, []);

  return (
    <div className="flex flex-col gap-3 text-xs text-gray-300">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-200">Generate</h2>
        <div className="flex gap-1">
          <ReferencePopover type="scale" />
          <ReferencePopover type="chord" />
          <ReferencePopover type="interval" />
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => applyPreset(p)}
            disabled={disabled}
            className="px-2 py-0.5 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-[10px] font-medium transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="px-2 py-1 rounded bg-red-900/50 border border-red-700 text-red-300 text-[10px]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-gray-500">Key</label>
          <select
            value={settings.key}
            onChange={e => onChange({ ...settings, key: e.target.value })}
            className="w-full px-1.5 py-1 rounded bg-gray-700 text-gray-200 text-xs"
          >
            <option>Auto</option>
            {['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'].map(k => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-gray-500">Scale</label>
          <select
            value={settings.scale}
            onChange={e => onChange({ ...settings, scale: e.target.value })}
            className="w-full px-1.5 py-1 rounded bg-gray-700 text-gray-200 text-xs"
          >
            <option>Auto</option>
            <option>major</option>
            <option>minor</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-gray-500">Mood</label>
          <select
            value={settings.mood}
            onChange={e => onChange({ ...settings, mood: e.target.value })}
            className="w-full px-1.5 py-1 rounded bg-gray-700 text-gray-200 text-xs"
          >
            <option>Auto</option>
            {['uplifting','dark','happy','chill','angry','sad'].map(m => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-gray-500">Genre</label>
          <select
            value={settings.genre}
            onChange={e => onChange({ ...settings, genre: e.target.value })}
            className="w-full px-1.5 py-1 rounded bg-gray-700 text-gray-200 text-xs"
          >
            <option>Auto</option>
            {['house','techno','trance','dnb','dubstep','future_bass','deep house'].map(g => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-gray-500">Length (bars)</label>
          <select
            value={settings.length}
            onChange={e => onChange({ ...settings, length: Number(e.target.value) })}
            className="w-full px-1.5 py-1 rounded bg-gray-700 text-gray-200 text-xs"
          >
            {[4, 8, 16].map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-gray-500">Complexity</label>
          <select
            value={settings.complexity}
            onChange={e => onChange({ ...settings, complexity: e.target.value })}
            className="w-full px-1.5 py-1 rounded bg-gray-700 text-gray-200 text-xs"
          >
            <option>Auto</option>
            <option>simple</option>
            <option>advanced</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleGenerateChords}
          disabled={loading !== 'none' || disabled}
          data-gen="chords"
          className="flex-1 px-2 py-1.5 rounded bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 disabled:text-gray-500 text-xs font-medium transition-colors"
        >
          {loading === 'chords' ? '\u27F3' : 'Chords'}
        </button>
        <button
          onClick={handleGenerateMelody}
          disabled={loading !== 'none' || disabled}
          data-gen="melody"
          className="flex-1 px-2 py-1.5 rounded bg-green-700 hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 text-xs font-medium transition-colors"
        >
          {loading === 'melody' ? '\u27F3' : 'Melody'}
        </button>
        <button
          onClick={handleGenerateBassline}
          disabled={loading !== 'none' || disabled}
          data-gen="bassline"
          className="flex-1 px-2 py-1.5 rounded bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-xs font-medium transition-colors"
        >
          {loading === 'bassline' ? '\u27F3' : 'Bass'}
        </button>
      </div>
    </div>
  );
}
