import { useState, useRef } from 'react';
import NoteGrid from './NoteGrid';
import type { Note } from '../types';

interface GenerationHubProps {
  chords: Note[];
  melody: Note[];
  bassline: Note[];
  bpm: number;
  bars: number;
  open: boolean;
  onClose: () => void;
}

export default function GenerationHub({ chords, melody, bassline, bpm, bars, open, onClose }: GenerationHubProps) {
  const [peek, setPeek] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  const hasAny = chords.length > 0 || melody.length > 0 || bassline.length > 0;

  return (
    <div
      ref={overlayRef}
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

      <div className="flex flex-col items-center justify-center h-full px-8">
        <h2 className="text-lg font-semibold text-gray-200 mb-4">Generation Hub</h2>

        {hasAny ? (
          <div className="w-full max-w-3xl">
            <NoteGrid
              chords={chords}
              melody={melody}
              bassline={bassline}
              bpm={bpm}
              bars={bars}
            />
          </div>
        ) : (
          <p className="text-gray-500">Nothing yet — generate something above</p>
        )}
      </div>
    </div>
  );
}
