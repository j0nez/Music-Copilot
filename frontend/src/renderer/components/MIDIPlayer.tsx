import { useState, useRef, useEffect, useCallback } from 'react';
import NoteGrid from './NoteGrid';
import type { Note } from '../types';

interface MIDIPlayerProps {
  chords: Note[];
  melody: Note[];
  bassline: Note[];
  bpm: number;
  bars: number;
  onRegenerate: (type: 'chords' | 'melody' | 'bassline') => void;
}

const PART_CONFIG = [
  { type: 'chords' as const, label: 'Chords', color: 'text-purple-400' as const },
  { type: 'melody' as const, label: 'Melody', color: 'text-green-400' as const },
  { type: 'bassline' as const, label: 'Bassline', color: 'text-blue-400' as const },
];

export default function MIDIPlayer({ chords, melody, bassline, bpm, bars, onRegenerate }: MIDIPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [playheadBeat, setPlayheadBeat] = useState<number | null>(null);
  const [swing, setSwing] = useState(0);
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const [loading, setLoading] = useState<'none' | 'chords' | 'melody' | 'bassline'>('none');

  const parts = [
    { type: 'chords' as const, notes: chords },
    { type: 'melody' as const, notes: melody },
    { type: 'bassline' as const, notes: bassline },
  ];
  const hasAny = chords.length > 0 || melody.length > 0 || bassline.length > 0;

  const totalBeats = bars * 4;

  const play = useCallback(() => {
    startTimeRef.current = performance.now();
    setPlayheadBeat(1);
    setPlaying(true);
  }, []);

  const stop = useCallback(() => {
    setPlaying(false);
    setPlayheadBeat(null);
    if (animRef.current) cancelAnimationFrame(animRef.current);
  }, []);

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
      setPlayheadBeat(beat);
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

  async function handleRegenerate(type: 'chords' | 'melody' | 'bassline') {
    setLoading(type);
    await onRegenerate(type);
    setLoading('none');
  }

  function clearAll() {
    onRegenerate('chords');
    onRegenerate('melody');
    onRegenerate('bassline');
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
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-[10px]">Swing: {Math.round(swing * 100)}%</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(swing * 100)}
            onChange={e => setSwing(Number(e.target.value) / 100)}
            className="w-16 h-1 accent-green-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        <NoteGrid
          chords={chords}
          melody={melody}
          bassline={bassline}
          bpm={bpm}
          bars={bars}
          playheadBeat={playheadBeat}
        />
      </div>

      <div className="flex items-center gap-2 px-3 py-1.5 border-t border-gray-700">
        <button
          onClick={() => { if (playing) stop(); else play(); }}
          disabled={!hasAny}
          className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-xs"
        >
          {playing ? '\u23F8 Stop' : '\u25B6 Play'}
        </button>
        {PART_CONFIG.map(p => {
          const isLoading = loading === p.type;
          return (
            <button
              key={p.type}
              onClick={() => handleRegenerate(p.type)}
              disabled={isLoading}
              className={`text-xs ${p.color} hover:text-white disabled:opacity-40`}
              title={`Regenerate ${p.label}`}
            >
              {isLoading ? '\u27F3' : `\u21BB ${p.label}`}
            </button>
          );
        })}
        <button onClick={clearAll} className="ml-auto text-xs text-red-400 hover:text-red-300">
          Clear All
        </button>
      </div>
    </div>
  );
}
