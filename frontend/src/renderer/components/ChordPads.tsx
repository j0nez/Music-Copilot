import { useCallback, useRef, useState } from "react";
import { exportMidi as apiExportMidi, saveProgression as apiSaveProgression } from "../api";
import type { ProgressionChord } from "../types";

/* ── Note → frequency mapping ─── */

const NOTE_FREQ: Record<string, number> = {
  "C": 261.63, "C#": 277.18, "Db": 277.18, "D": 293.66,
  "D#": 311.13, "Eb": 311.13, "E": 329.63, "F": 349.23,
  "F#": 369.99, "Gb": 369.99, "G": 392.00, "G#": 415.30,
  "Ab": 415.30, "A": 440.00, "A#": 466.16, "Bb": 466.16, "B": 493.88,
};

function noteToFreq(note: string): number {
  const match = note.match(/^([A-G][b#]?)(\d+)?$/);
  if (!match) return 440;
  const base = NOTE_FREQ[match[1] ?? "A"];
  const oct = match[2] ? parseInt(match[2], 10) : 4;
  return base * Math.pow(2, oct - 4);
}

/* ── Web Audio helpers ─────────── */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

let activeOscillators: OscillatorNode[] = [];

function stopAll() {
  activeOscillators.forEach((o) => {
    try { o.stop(); } catch { /* already stopped */ }
  });
  activeOscillators = [];
}

function playNotes(notes: string[], duration = 1.2) {
  stopAll();
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  notes.forEach((note) => {
    const freq = noteToFreq(note);
    if (freq <= 0) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.1);

    activeOscillators.push(osc);
  });
}

/* ── ChordPads component ──────── */

export default function ChordPads({
  progression,
  onReorder,
  onClear,
}: {
  progression: ProgressionChord[];
  onReorder: (chords: ProgressionChord[]) => void;
  onClear: () => void;
}) {
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const dragIdx = useRef<number | null>(null);

  const handlePlay = useCallback((idx: number, notes: string[]) => {
    setPlayingIdx(idx);
    playNotes(notes);
    setTimeout(() => setPlayingIdx(null), 1200);
  }, []);

  const handlePlayAll = useCallback(() => {
    if (progression.length === 0) return;
    stopAll();
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const gap = 0.8;
    const duration = 1.2;

    progression.forEach((chord, i) => {
      const offset = i * gap;
      chord.notes.forEach((note) => {
        const freq = noteToFreq(note);
        if (freq <= 0) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + offset);
        gain.gain.setValueAtTime(0, now + offset);
        gain.gain.linearRampToValueAtTime(0.15, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, now + offset + duration);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + duration + 0.1);
        activeOscillators.push(osc);
      });
    });

    setPlayingIdx(0);
    progression.forEach((_, i) => {
      setTimeout(() => setPlayingIdx(i), i * gap * 1000);
    });
    setTimeout(() => setPlayingIdx(null), progression.length * gap * 1000 + 200);
  }, [progression]);

  const handleStop = useCallback(() => {
    stopAll();
    setPlayingIdx(null);
  }, []);

  const handleExportMidi = async () => {
    try {
      const res = await apiExportMidi("Unknown", progression, { bpm: 120 });
      if (res.success && res.data) {
        const a = document.createElement("a");
        a.href = `http://localhost:8000/api/exports/${res.data.filename}`;
        a.download = res.data.filename;
        a.click();
      }
    } catch {
      // silently fail
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedMsg(null);
    try {
      const res = await apiSaveProgression("Unknown", null, null, progression);
      if (res.success) setSavedMsg("Saved ✓");
    } catch {
      setSavedMsg("Save failed");
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMsg(null), 2000);
    }
  };

  /* ── Drag reorder via pointer events ── */

  const handlePointerDown = (idx: number) => {
    dragIdx.current = idx;
  };

  const handlePointerUp = (idx: number) => {
    if (dragIdx.current === null || dragIdx.current === idx) {
      dragIdx.current = null;
      return;
    }
    const from = dragIdx.current;
    const to = idx;
    const reordered = [...progression];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    onReorder(reordered);
    dragIdx.current = null;
  };

  if (progression.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
        <p className="text-xs">No progression loaded</p>
        <p className="text-[10px] text-gray-600">Generate one in Music Theory above</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-2">
        <div className="flex flex-wrap gap-2">
          {progression.map((chord, i) => (
            <button
              key={i}
              onPointerDown={() => handlePointerDown(i)}
              onPointerUp={() => handlePointerUp(i)}
              onClick={() => handlePlay(i, chord.notes)}
              className={`px-3 py-2 rounded-lg border text-center min-w-[64px] cursor-pointer transition-all select-none ${
                playingIdx === i
                  ? "bg-accent-500/30 border-accent-500/60 text-accent-200 scale-105"
                  : "bg-purple-800/25 border-purple-700/35 text-purple-200 hover:bg-purple-800/40"
              }`}
              title={`${chord.notes.join(" ")}`}
            >
              <p className="text-xs font-bold">{chord.roman}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{chord.name}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 border-t border-surface-700/30 shrink-0">
        <button onClick={handlePlayAll}
          className="px-2.5 py-1 rounded bg-accent-500/20 text-accent-300 text-[10px] border border-accent-500/30 hover:bg-accent-500/30 transition-colors">
          ▶ All
        </button>
        <button onClick={handleStop}
          className="px-2.5 py-1 rounded bg-surface-700 text-gray-400 text-[10px] hover:bg-surface-600 transition-colors">
          ■ Stop
        </button>
        <div className="flex-1" />
        <button onClick={handleSave} disabled={saving}
          className="px-2.5 py-1 rounded bg-surface-700 text-gray-400 text-[10px] hover:bg-surface-600 transition-colors disabled:opacity-50">
          {saving ? "..." : "Save"}
        </button>
        <button onClick={handleExportMidi}
          className="px-2.5 py-1 rounded bg-blue-900/40 text-blue-300 text-[10px] hover:bg-blue-900/60 transition-colors">
          MIDI
        </button>
        <button onClick={onClear}
          className="px-2.5 py-1 rounded bg-red-900/30 text-red-300 text-[10px] hover:bg-red-900/50 transition-colors">
          Clear
        </button>
        {savedMsg && <span className="text-[10px] text-green-400">{savedMsg}</span>}
        <span className="text-[10px] text-gray-600">{progression.length} chords</span>
      </div>
    </div>
  );
}
