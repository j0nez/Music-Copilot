import { useRef, forwardRef, useImperativeHandle } from 'react';
import type { Note } from '../types';

export const HEADER_WIDTH = 32;
export const BEAT_WIDTH = 20;

export interface NoteGridHandle {
  setPlayheadPosition(x: number): void;
  showPlayhead(x: number): void;
  hidePlayhead(): void;
}

interface NoteGridProps {
  chords: Note[];
  melody: Note[];
  bassline: Note[];
  bpm: number;
  bars: number;
  compact?: boolean;
}

const BEATS_PER_BAR = 4;
const ROW_HEIGHT = 24;

function noteToLabel(pitch: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return `${names[pitch % 12]}${Math.floor(pitch / 12) - 1}`;
}

const NoteGrid = forwardRef<NoteGridHandle, NoteGridProps>(function NoteGrid({ chords, melody, bassline, bars, compact }, ref) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<SVGLineElement>(null);
  const totalBeats = bars * BEATS_PER_BAR;
  const width = totalBeats * BEAT_WIDTH + HEADER_WIDTH;
  const height = compact ? ROW_HEIGHT * 3 + 4 : ROW_HEIGHT * 6 + 8;

  useImperativeHandle(ref, () => ({
    setPlayheadPosition(x: number) {
      if (playheadRef.current) {
        playheadRef.current.setAttribute('x1', String(x));
        playheadRef.current.setAttribute('x2', String(x));
      }
    },
    showPlayhead(x: number) {
      if (playheadRef.current) {
        playheadRef.current.setAttribute('visibility', 'visible');
        playheadRef.current.setAttribute('x1', String(x));
        playheadRef.current.setAttribute('x2', String(x));
      }
    },
    hidePlayhead() {
      if (playheadRef.current) {
        playheadRef.current.setAttribute('visibility', 'hidden');
      }
    },
  }));

  const hasAny = chords.length > 0 || melody.length > 0 || bassline.length > 0;
  if (!hasAny) {
    return (
      <div className="flex items-center justify-center h-24 text-gray-500 text-xs">
        Nothing yet — generate something above
      </div>
    );
  }

  const rows: { label: string; notes: Note[]; color: string }[] = [
    { label: 'Ch', notes: chords, color: 'bg-purple-500/40' },
    { label: 'Mel', notes: melody, color: 'bg-green-500/40' },
    { label: 'Bas', notes: bassline, color: 'bg-blue-500/40' },
  ];

  const beatLines: number[] = [];
  for (let b = 0; b <= totalBeats; b++) {
    beatLines.push(b);
  }

  return (
    <div
      ref={scrollRef}
      className="overflow-x-auto overflow-y-hidden select-none"
      style={{ maxHeight: height, minHeight: compact ? height : undefined }}
    >
      <svg width={width} height={height} className="block">
        {beatLines.map((beat) => {
          const x = HEADER_WIDTH + beat * BEAT_WIDTH;
          const isBar = beat % BEAT_WIDTH === 0;
          return (
            <line
              key={beat}
              x1={x}
              y1={0}
              x2={x}
              y2={height}
              stroke={isBar ? '#4a5568' : '#2d3748'}
              strokeWidth={isBar ? 1 : 0.5}
            />
          );
        })}

        {rows.map((row, ri) => {
          const y = ri * ROW_HEIGHT;
          return (
            <g key={row.label}>
              <text
                x={4}
                y={y + ROW_HEIGHT / 2 + 4}
                fill="#a0aec0"
                fontSize={compact ? 9 : 10}
                fontFamily="monospace"
              >
                {row.label}
              </text>
              {row.notes.map((note, ni) => {
                const nx = HEADER_WIDTH + (note.start_beat - 1) * BEAT_WIDTH;
                const nw = Math.max(2, note.duration_in_beats * BEAT_WIDTH);
                const ny = y + 2;
                const nh = ROW_HEIGHT - 4;
                const velHeight = Math.max(4, (note.velocity / 127) * nh);
                return (
                  <g key={ni}>
                    <rect
                      x={nx}
                      y={ny + nh - velHeight}
                      width={nw}
                      height={velHeight}
                      rx={2}
                      className={row.color}
                      fill="currentColor"
                    />
                    {!compact && nw > 20 && (
                      <text
                        x={nx + 2}
                        y={ny + nh / 2 + 3}
                        fill="#e2e8f0"
                        fontSize={8}
                        fontFamily="monospace"
                      >
                        {noteToLabel(note.pitch)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}

        <line
          ref={playheadRef}
          visibility="hidden"
          x1={0}
          y1={0}
          x2={0}
          y2={height}
          stroke="#ef4444"
          strokeWidth={2}
          className="pointer-events-none"
        />
      </svg>
    </div>
  );
});

export default NoteGrid;
