import { downloadFromUrl, exportArrangement } from '../api';
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
  const hasAny = chords.length > 0 || melody.length > 0 || bassline.length > 0;

  async function handleDownloadAll() {
    if (!hasAny) return;
    const bpm = project?.bpm ?? 120;
    const res = await exportArrangement(chords, melody, bassline, bpm, swing, {
      chords: solo.chords, melody: solo.melody, bassline: solo.bassline,
    });
    if (res.success && res.data) {
      await downloadFromUrl(res.data.download_url, res.data.filename);
    }
  }

  const partBadges = [
    { label: 'Chords', count: chords.length, color: 'text-purple-400' },
    { label: 'Melody', count: melody.length, color: 'text-green-400' },
    { label: 'Bassline', count: bassline.length, color: 'text-blue-400' },
  ];

  return (
    <div className="h-full flex items-center gap-3 px-3 py-2 text-xs overflow-x-auto">
      {project && (
        <div className="flex items-center gap-2 shrink-0 text-gray-400">
          <span className="font-mono text-accent-300">{project.key}</span>
          <span className="text-gray-600">|</span>
          <span className="font-mono text-accent-300">{project.bpm}</span>
          <span className="text-gray-600">|</span>
          <span className="text-accent-300">{project.scale}</span>
        </div>
      )}

      <div className="w-px h-6 bg-surface-700/50 shrink-0" />

      <div className="flex items-center gap-2 shrink-0">
        {partBadges.map(p => (
          <span key={p.label} className={`${p.count > 0 ? p.color : 'text-gray-600'}`}>
            {p.label}: {p.count > 0 ? `${p.count} notes` : '—'}
          </span>
        ))}
      </div>

      <div className="w-px h-6 bg-surface-700/50 shrink-0" />

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-gray-500">Swing: {Math.round(swing * 100)}%</span>
        <input
          type="range" min={0} max={100}
          value={Math.round(swing * 100)}
          onChange={e => onSwingChange(Number(e.target.value) / 100)}
          className="w-16 h-1 accent-green-400"
        />
      </div>

      <div className="flex-1" />

      <button onClick={handleDownloadAll} disabled={!hasAny}
        className="shrink-0 px-2 py-1 rounded text-[10px] font-medium bg-green-700 hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 transition-colors"
      >Download MIDI</button>
    </div>
  );
}
