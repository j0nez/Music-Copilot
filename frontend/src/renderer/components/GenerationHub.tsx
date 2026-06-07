import { useState, useRef, useEffect, useCallback } from 'react';
import NoteGrid from './NoteGrid';
import { melodyGenerator, basslineGenerator, exportArrangement, saveArrangement } from '../api';
import type { Note, GeneratorSettings } from '../types';

function midiToFreq(pitch: number): number {
  return 440 * Math.pow(2, (pitch - 69) / 12);
}

function applySwing(notes: Note[], amount: number): Note[] {
  if (amount <= 0) return notes;
  return notes.map(n => {
    const beatPos = n.start_beat % 1.0;
    const sixteenthIndex = Math.round(beatPos * 4);
    if (sixteenthIndex === 1 || sixteenthIndex === 3) {
      return { ...n, start_beat: n.start_beat + amount * 0.25 };
    }
    return n;
  });
}

interface GenerationHubProps {
  chords: Note[];
  melody: Note[];
  bassline: Note[];
  bpm: number;
  bars: number;
  swing: number;
  settings: GeneratorSettings;
  onSettingsChange: (s: GeneratorSettings) => void;
  onSetMelody: (notes: Note[]) => void;
  onSetBassline: (notes: Note[]) => void;
  projectKey: string;
  projectScale: string;
  projectId: number | undefined;
  open: boolean;
  onClose: () => void;
}

const KEYS = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
const MOODS = ['uplifting','dark','happy','chill','angry','sad'];
const GENRES = ['house','techno','trance','dnb','dubstep','future_bass'];
const LENGTHS = [4, 8, 16];
const PATTERNS = ['auto', 'root_fifth', 'walking', 'octave_jump', 'syncopated'];

export default function GenerationHub({
  chords, melody, bassline, bpm, bars, swing,
  settings, onSettingsChange, onSetMelody, onSetBassline,
  projectKey, projectScale, projectId,
  open, onClose,
}: GenerationHubProps) {
  const [peek, setPeek] = useState(false);
  const [loading, setLoading] = useState<'none' | 'melody' | 'bassline'>('none');
  const [playing, setPlaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const scheduledRef = useRef<{ stop: () => void }[]>([]);
  const overlayRef = useRef<HTMLDivElement>(null);
  const saveNameRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const hasAny = chords.length > 0 || melody.length > 0 || bassline.length > 0;

  function resolveKey() {
    return settings.key === 'Auto' ? projectKey : settings.key;
  }
  function resolveScale() {
    return settings.scale === 'Auto' ? projectScale.toLowerCase() : settings.scale;
  }
  function resolveMood() {
    return settings.mood === 'Auto' ? 'uplifting' : settings.mood;
  }
  function resolveGenre() {
    return settings.genre === 'Auto' ? 'house' : settings.genre;
  }

  async function handleGenerateMelody() {
    setLoading('melody');
    const res = await melodyGenerator(resolveKey(), resolveScale(), resolveMood(), resolveGenre(), settings.length, settings.complexity);
    if (res.success && res.data) {
      onSetMelody(res.data.notes);
    }
    setLoading('none');
  }

  async function handleGenerateBassline() {
    setLoading('bassline');
    const res = await basslineGenerator(resolveKey(), resolveScale(), resolveGenre(), settings.length, settings.pattern);
    if (res.success && res.data) {
      onSetBassline(res.data.notes);
    }
    setLoading('none');
  }

  function handlePlay() {
    scheduledRef.current.forEach(s => s.stop());
    scheduledRef.current = [];

    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext();
    } else if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    const ctx = audioCtxRef.current;
    const beatDuration = 60 / bpm;

    const allParts = [
      applySwing(chords, swing),
      applySwing(melody, swing),
      applySwing(bassline, swing),
    ];

    for (const partNotes of allParts) {
      for (const note of partNotes) {
        const startTime = ctx.currentTime + (note.start_beat - 1) * beatDuration;
        const noteDur = note.duration_in_beats * beatDuration;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.value = midiToFreq(note.pitch);

        const vel = (note.velocity / 127) * 0.25;

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vel, startTime + 0.008);
        gain.gain.setValueAtTime(vel, startTime + noteDur - 0.008);
        gain.gain.linearRampToValueAtTime(0, startTime + noteDur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + noteDur);

        scheduledRef.current.push({
          stop: () => {
            try { osc.stop(); } catch { /* already stopped */ }
            try { osc.disconnect(); } catch { /* already disconnected */ }
            try { gain.disconnect(); } catch { /* already disconnected */ }
          },
        });
      }
    }

    setPlaying(true);
  }

  function handleStop() {
    setPlaying(false);
    scheduledRef.current.forEach(s => s.stop());
    scheduledRef.current = [];
  }

  async function handleExportMidi() {
    const res = await exportArrangement(chords, melody, bassline, bpm, swing, {
      chords: true, melody: true, bassline: true,
    });
    if (res.success && res.data) {
      window.open(res.data.download_url, '_blank');
    }
  }

  async function handleSave() {
    setSaving(true);
    const name = saveNameRef.current?.value?.trim() ||
      `Arrangement - ${resolveKey()} - ${resolveGenre()} - ${bars} bars`;
    await saveArrangement(chords, melody, bassline, resolveKey(), resolveMood(), resolveGenre(), {
      project_id: projectId,
      name,
    });
    setSaving(false);
  }

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  }, [onClose]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    return () => {
      scheduledRef.current.forEach(s => s.stop());
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  function Select({ label, value, onChange, options }: {
    label: string; value: string | number; onChange: (v: string) => void;
    options: { value: string | number; label: string }[];
  }) {
    return (
      <div className="space-y-0.5">
        <label className="text-gray-500 text-[10px]">{label}</label>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-1.5 py-1 rounded bg-gray-700 text-gray-200 text-xs"
        >
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className={`fixed inset-0 z-40 transition-opacity duration-200 ${peek ? 'opacity-20' : 'opacity-100'}`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
    >
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => setPeek(!peek)}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${peek ? 'bg-green-700 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          title={peek ? 'Show overlay' : 'Peek behind'}
        >
          {peek ? 'Show' : 'Peek'}
        </button>
        <button
          onClick={onClose}
          className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-xs text-gray-300"
        >
          Close
        </button>
      </div>

      <div className="flex flex-col h-full px-8 py-12 overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-200 mb-6 text-center">Generation Hub</h2>

        <div className="w-full max-w-3xl mx-auto space-y-6">
          {/* Melody Section */}
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-300">Melody</h3>
            <div className="grid grid-cols-3 gap-2">
              <Select label="Key" value={settings.key} onChange={v => onSettingsChange({ ...settings, key: v })}
                options={[{ value: 'Auto', label: 'Auto' }, ...KEYS.map(k => ({ value: k, label: k }))]} />
              <Select label="Scale" value={settings.scale} onChange={v => onSettingsChange({ ...settings, scale: v })}
                options={[{ value: 'Auto', label: 'Auto' }, { value: 'major', label: 'Major' }, { value: 'minor', label: 'Minor' }]} />
              <Select label="Mood" value={settings.mood} onChange={v => onSettingsChange({ ...settings, mood: v })}
                options={[{ value: 'Auto', label: 'Auto' }, ...MOODS.map(m => ({ value: m, label: m }))]} />
              <Select label="Genre" value={settings.genre} onChange={v => onSettingsChange({ ...settings, genre: v })}
                options={[{ value: 'Auto', label: 'Auto' }, ...GENRES.map(g => ({ value: g, label: g }))]} />
              <Select label="Length" value={settings.length} onChange={v => onSettingsChange({ ...settings, length: Number(v) })}
                options={LENGTHS.map(l => ({ value: l, label: `${l} bars` }))} />
              <Select label="Complexity" value={settings.complexity} onChange={v => onSettingsChange({ ...settings, complexity: v })}
                options={[{ value: 'simple', label: 'Simple' }, { value: 'advanced', label: 'Advanced' }]} />
            </div>
            <button
              onClick={handleGenerateMelody}
              disabled={loading !== 'none'}
              className="px-3 py-1.5 rounded bg-green-700 hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 text-xs font-medium transition-colors"
            >
              {loading === 'melody' ? '\u27F3' : 'Generate Melody'}
            </button>
          </div>

          {/* Bassline Section */}
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-300">Bassline</h3>
            <div className="grid grid-cols-3 gap-2">
              <Select label="Genre" value={settings.genre} onChange={v => onSettingsChange({ ...settings, genre: v })}
                options={[{ value: 'Auto', label: 'Auto' }, ...GENRES.map(g => ({ value: g, label: g }))]} />
              <Select label="Pattern" value={settings.pattern} onChange={v => onSettingsChange({ ...settings, pattern: v })}
                options={PATTERNS.map(p => ({ value: p, label: p.replace('_', ' ') }))} />
              <Select label="Length" value={settings.length} onChange={v => onSettingsChange({ ...settings, length: Number(v) })}
                options={LENGTHS.map(l => ({ value: l, label: `${l} bars` }))} />
            </div>
            <button
              onClick={handleGenerateBassline}
              disabled={loading !== 'none'}
              className="px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-xs font-medium transition-colors"
            >
              {loading === 'bassline' ? '\u27F3' : 'Generate Bassline'}
            </button>
          </div>

          {/* Preview Section */}
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-300">Preview</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { if (playing) handleStop(); else handlePlay(); }}
                  disabled={!hasAny}
                  className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-xs"
                >
                  {playing ? '\u23F8 Stop' : '\u25B6 Play'}
                </button>
              </div>
            </div>
            {hasAny ? (
              <NoteGrid chords={chords} melody={melody} bassline={bassline} bpm={bpm} bars={bars} compact />
            ) : (
              <p className="text-gray-500 text-xs text-center py-8">Nothing yet — generate something above</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportMidi}
              disabled={!hasAny}
              className="px-3 py-1.5 rounded bg-green-700 hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 text-xs font-medium transition-colors"
            >
              MIDI All
            </button>
            <div className="flex items-center gap-1 ml-2">
              <span className="text-gray-500 text-[10px]">Save:</span>
              <input
                ref={saveNameRef}
                type="text"
                placeholder={`Arrangement - ${resolveKey()} - ${resolveGenre()} - ${bars} bars`}
                className="w-48 px-2 py-1 rounded bg-gray-700 text-gray-200 text-xs placeholder-gray-500 outline-none"
              />
              <button
                onClick={handleSave}
                disabled={saving || !hasAny}
                className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-xs transition-colors"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}