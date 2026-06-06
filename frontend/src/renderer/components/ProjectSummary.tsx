import { exportArrangement } from '../api';
import type { Note, Project } from '../types';

interface ProjectSummaryProps {
  project: Project | null;
  chords: Note[];
  melody: Note[];
  bassline: Note[];
  solo: { chords: boolean; melody: boolean; bassline: boolean };
  swing: number;
  onSwingChange: (v: number) => void;
}

export default function ProjectSummary({ project, chords, melody, bassline, solo, swing, onSwingChange }: ProjectSummaryProps) {
  const partCounts = [
    { label: 'Chords', count: chords.length, color: 'text-purple-400' },
    { label: 'Melody', count: melody.length, color: 'text-green-400' },
    { label: 'Bassline', count: bassline.length, color: 'text-blue-400' },
  ];
  const totalParts = [chords, melody, bassline].filter(n => n.length > 0).length;
  const hasAny = chords.length > 0 || melody.length > 0 || bassline.length > 0;

  async function handleDownloadAll() {
    if (!hasAny) return;
    const bpm = project?.bpm ?? 120;
    const res = await exportArrangement(chords, melody, bassline, bpm, {
      chords: solo.chords,
      melody: solo.melody,
      bassline: solo.bassline,
    });
    if (res.success && res.data) {
      window.open(res.data.download_url, '_blank');
    }
  }

  return (
    <div className="h-full flex flex-col p-3 gap-3 text-xs text-gray-300 overflow-y-auto">
      <h2 className="text-sm font-semibold text-gray-200">Project Summary</h2>

      {project && (
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500">Key</span>
            <span className="font-mono">{project.key}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">BPM</span>
            <span className="font-mono">{project.bpm}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Scale</span>
            <span className="font-mono">{project.scale}</span>
          </div>
        </div>
      )}

      <div className="border-t border-gray-700" />

      <div>
        <p className="text-gray-500 mb-1">Parts ({totalParts})</p>
        {partCounts.map(p => (
          <div key={p.label} className={`flex justify-between ${p.count > 0 ? p.color : 'text-gray-600'}`}>
            <span>{p.label}</span>
            <span className="font-mono">{p.count > 0 ? `${p.count} notes` : '—'}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-700" />

      <div>
        <p className="text-gray-500 mb-1">Swing: {Math.round(swing * 100)}%</p>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(swing * 100)}
          onChange={e => onSwingChange(Number(e.target.value) / 100)}
          className="w-full h-1 accent-green-400"
        />
      </div>

      <div className="border-t border-gray-700" />

      <button
        onClick={handleDownloadAll}
        disabled={!hasAny}
        className="px-3 py-1.5 rounded bg-green-700 hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 text-xs font-medium transition-colors"
      >
        Download All MIDI
      </button>

      <div className="mt-auto pt-2 text-gray-600 text-[10px]">
        {hasAny ? `${totalParts} part(s) ready` : 'Generate something to get started'}
      </div>
    </div>
  );
}
