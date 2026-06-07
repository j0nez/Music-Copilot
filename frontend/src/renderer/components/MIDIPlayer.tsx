import { useState, useRef, useEffect, useCallback } from 'react';
import NoteGrid, { HEADER_WIDTH, BEAT_WIDTH, type NoteGridHandle } from './NoteGrid';
import type { Note } from '../types';
import { exportSinglePart, downloadFromUrl } from '../api';

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

interface MIDIPlayerProps {
  chords: Note[];
  melody: Note[];
  bassline: Note[];
  bpm: number;
  bars: number;
  swing: number;
  onSwingChange: (v: number) => void;
  onRegenerate: (type: 'chords' | 'melody' | 'bassline') => void;
  onClear: (type: 'chords' | 'melody' | 'bassline') => void;
  onSaveToLibrary?: () => void;
  historyCounts?: { chords: number; melody: number; bassline: number };
  onCycleHistory?: (type: 'chords' | 'melody' | 'bassline', direction: -1 | 1) => void;
}

const PART_CONFIG = [
  { type: 'chords' as const, label: 'Chords', color: 'text-purple-400' as const },
  { type: 'melody' as const, label: 'Melody', color: 'text-green-400' as const },
  { type: 'bassline' as const, label: 'Bassline', color: 'text-blue-400' as const },
];

export default function MIDIPlayer({ chords, melody, bassline, bpm, bars, swing, onSwingChange, onRegenerate, onClear, onSaveToLibrary, historyCounts, onCycleHistory }: MIDIPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [mutes, setMutes] = useState({ chords: false, melody: false, bassline: false });
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const scheduledRef = useRef<{ stop: () => void }[]>([]);
  const [loading, setLoading] = useState<'none' | 'chords' | 'melody' | 'bassline'>('none');
  const noteGridRef = useRef<NoteGridHandle>(null);

  const parts = [
    { type: 'chords' as const, notes: chords },
    { type: 'melody' as const, notes: melody },
    { type: 'bassline' as const, notes: bassline },
  ];
  const hasAny = chords.length > 0 || melody.length > 0 || bassline.length > 0;

  const totalBeats = bars * 4;

  const stop = useCallback(() => {
    setPlaying(false);
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (noteGridRef.current) noteGridRef.current.hidePlayhead();
    scheduledRef.current.forEach(s => s.stop());
    scheduledRef.current = [];
  }, []);

  const play = useCallback(() => {
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
      !mutes.chords ? applySwing(chords, swing) : [],
      !mutes.melody ? applySwing(melody, swing) : [],
      !mutes.bassline ? applySwing(bassline, swing) : [],
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

    startTimeRef.current = performance.now();
    if (noteGridRef.current) noteGridRef.current.showPlayhead(HEADER_WIDTH + 0 * BEAT_WIDTH);
    setPlaying(true);
  }, [chords, melody, bassline, bpm, swing, mutes]);

  useEffect(() => {
    if (!playing) return;
    const bps = bpm / 60;
    function tick() {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      const beat = 1 + elapsed * bps;
      if (beat > totalBeats) {
        stop();
        return;
      }
      if (noteGridRef.current) {
        noteGridRef.current.setPlayheadPosition(HEADER_WIDTH + (beat - 1) * BEAT_WIDTH);
      }
      animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [playing, bpm, totalBeats, stop]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        if (playing) stop(); else if (hasAny) play();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [playing, hasAny, play, stop]);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      scheduledRef.current.forEach(s => s.stop());
      scheduledRef.current = [];
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  async function handleRegenerate(type: 'chords' | 'melody' | 'bassline') {
    setLoading(type);
    await onRegenerate(type);
    setLoading('none');
  }

  async function handleExportPart(type: 'chords' | 'melody' | 'bassline') {
    const notes = type === 'chords' ? chords : type === 'melody' ? melody : bassline;
    if (notes.length === 0) return;
    const res = await exportSinglePart(type, notes, bpm);
    if (res.success && res.data) {
      await downloadFromUrl(res.data.download_url, res.data.filename);
    }
  }

  function clearAll() {
    onClear('chords');
    onClear('melody');
    onClear('bassline');
  }

  if (!hasAny) {
    return (
      <div className="p-3 text-xs text-gray-500 flex flex-col items-center justify-center h-full gap-1">
        <p className="text-gray-400">MIDI Player</p>
        <p>Generate chords, melody, or bassline to get started</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full text-xs text-gray-300">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-200">
            {parts.find(p => p.notes.length > 0)?.type ?? ''} — {bars} bars
          </span>
          {PART_CONFIG.map(p => {
            const hasNotes = p.type === 'chords' ? chords.length > 0 : p.type === 'melody' ? melody.length > 0 : bassline.length > 0;
            if (!hasNotes) return null;
            return (
              <button
                key={p.type}
                onClick={() => setMutes(prev => ({ ...prev, [p.type]: !prev[p.type] }))}
                className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                  mutes[p.type]
                    ? 'bg-red-900/30 border-red-700/50 text-red-400'
                    : 'bg-gray-700/50 border-gray-600/50 text-gray-400 hover:text-white'
                }`}
                title={mutes[p.type] ? `Unmute ${p.label}` : `Mute ${p.label}`}
              >
                {mutes[p.type] ? `\u2715 ${p.label}` : p.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-[10px]">Swing: {Math.round(swing * 100)}%</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(swing * 100)}
            onChange={e => onSwingChange(Number(e.target.value) / 100)}
            className="w-16 h-1 accent-green-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        <NoteGrid
          ref={noteGridRef}
          chords={chords}
          melody={melody}
          bassline={bassline}
          bpm={bpm}
          bars={bars}
        />
      </div>

      <div className="flex items-center gap-1.5 px-3 py-1.5 border-t border-gray-700">
        <button
          onClick={() => { if (playing) stop(); else play(); }}
          disabled={!hasAny}
          className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-xs"
        >
          {playing ? '\u23F8 Stop' : '\u25B6 Play'}
        </button>
        {PART_CONFIG.map(p => {
          const isLoading = loading === p.type;
          const count = historyCounts?.[p.type] ?? 0;
          return (
            <div key={p.type} className="flex items-center gap-0.5">
              <button
                onClick={() => handleRegenerate(p.type)}
                disabled={isLoading}
                className={`text-xs ${p.color} hover:text-white disabled:opacity-40`}
                title={`Regenerate ${p.label}`}
              >
                {isLoading ? '\u27F3' : `\u21BB ${p.label}`}
              </button>
              {count > 1 && onCycleHistory && (
                <span className="flex gap-0.5 ml-0.5">
                  <button
                    onClick={() => onCycleHistory(p.type, -1)}
                    className="text-gray-500 hover:text-white text-[10px] leading-none px-0.5"
                    title="Previous"
                  >{'\u25B2'}</button>
                  <button
                    onClick={() => onCycleHistory(p.type, 1)}
                    className="text-gray-500 hover:text-white text-[10px] leading-none px-0.5"
                    title="Next"
                  >{'\u25BC'}</button>
                </span>
              )}
              <button
                onClick={() => handleExportPart(p.type)}
                className="text-gray-500 hover:text-white text-[10px] leading-none px-1"
                title={`Download ${p.label} MIDI`}
              >MIDI</button>
            </div>
          );
        })}
        {onSaveToLibrary && (
          <button onClick={onSaveToLibrary} className="text-xs text-green-400 hover:text-green-300">
            Save to Library
          </button>
        )}
        <button onClick={clearAll} className="text-xs text-red-400 hover:text-red-300">
          Clear All
        </button>
      </div>
    </div>
  );
}
