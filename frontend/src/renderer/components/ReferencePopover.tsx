import { useState, useRef, useEffect } from 'react';

interface ToolProps {
  type: 'scale' | 'chord' | 'interval';
}

const SCALE_NOTES: Record<string, number[]> = {
  'C': [0, 2, 4, 5, 7, 9, 11],
  'D': [2, 4, 6, 7, 9, 11, 1],
  'E': [4, 6, 8, 9, 11, 1, 3],
  'F': [5, 7, 9, 10, 0, 2, 4],
  'G': [7, 9, 11, 0, 2, 4, 6],
  'A': [9, 11, 1, 2, 4, 6, 8],
  'B': [11, 1, 3, 4, 6, 8, 10],
};
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export default function ReferencePopover({ type }: ToolProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const icon = type === 'scale' ? '\uD83C\uDFBC' : type === 'chord' ? '\uD83C\uDFB8' : '\uD83D\uDCCF';
  const label = type === 'scale' ? 'Scale' : type === 'chord' ? 'Chord' : 'Interval';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs px-1.5 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
        title={label}
      >
        {icon}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded p-2 shadow-lg z-50 w-48 text-xs text-gray-300">
          {type === 'scale' && <ScaleTool />}
          {type === 'chord' && <ChordTool />}
          {type === 'interval' && <IntervalTool />}
        </div>
      )}
    </div>
  );
}

function ChordTool() {
  const CHORDS = [
    { name: 'Major', intervals: 'R-3-5' },
    { name: 'Minor', intervals: 'R-b3-5' },
    { name: 'Dim', intervals: 'R-b3-b5' },
    { name: 'Aug', intervals: 'R-3-#5' },
    { name: 'Maj7', intervals: 'R-3-5-7' },
    { name: 'Min7', intervals: 'R-b3-5-b7' },
    { name: 'Dom7', intervals: 'R-3-5-b7' },
    { name: 'Sus2', intervals: 'R-2-5' },
    { name: 'Sus4', intervals: 'R-4-5' },
  ];
  return (
    <div>
      <p className="text-gray-400 mb-1 font-semibold">Chord Qualities</p>
      {CHORDS.map(c => (
        <div key={c.name} className="flex gap-2 text-[10px] mb-0.5">
          <span className="w-10 text-gray-200">{c.name}</span>
          <span className="text-gray-500">{c.intervals}</span>
        </div>
      ))}
    </div>
  );
}

function IntervalTool() {
  const INTERVALS = [
    { name: 'Minor 2nd', semitones: 1 },
    { name: 'Major 2nd', semitones: 2 },
    { name: 'Minor 3rd', semitones: 3 },
    { name: 'Major 3rd', semitones: 4 },
    { name: 'Perfect 4th', semitones: 5 },
    { name: 'Tritone', semitones: 6 },
    { name: 'Perfect 5th', semitones: 7 },
    { name: 'Minor 6th', semitones: 8 },
    { name: 'Major 6th', semitones: 9 },
    { name: 'Minor 7th', semitones: 10 },
    { name: 'Major 7th', semitones: 11 },
    { name: 'Octave', semitones: 12 },
  ];
  return (
    <div>
      <p className="text-gray-400 mb-1 font-semibold">Intervals</p>
      {INTERVALS.map(iv => (
        <div key={iv.name} className="flex gap-2 text-[10px] mb-0.5">
          <span className="w-20 text-gray-200">{iv.name}</span>
          <span className="text-gray-500">{iv.semitones} st</span>
        </div>
      ))}
    </div>
  );
}

function ScaleTool() {
  return (
    <div>
      <p className="text-gray-400 mb-1 font-semibold">Major Scale Notes</p>
      {Object.entries(SCALE_NOTES).map(([key, semitones]) => (
        <div key={key} className="flex gap-0.5 mb-0.5">
          <span className="w-3 font-bold">{key}</span>
          <span className="text-gray-500">
            {semitones.map(s => NOTE_NAMES[s]).join(' ')}
          </span>
        </div>
      ))}
    </div>
  );
}
