import { useState, useRef } from 'react';
import { uploadFile, analyzeSample } from '../api';
import { useProject } from '../store/projectContext';
import type { SampleAnalysisResult } from '../types';

const BPM_RANGES = [
  { label: 'Auto (no adjustment)', min: 0, max: 0 },
  { label: 'Slow – 50–150 BPM', min: 50, max: 150 },
  { label: 'Medium – 100–200 BPM', min: 100, max: 200 },
  { label: 'Fast – 150–250 BPM', min: 150, max: 250 },
];

function confidenceColor(value: number | null, inverted = false): string {
  if (value === null) return 'bg-gray-500';
  if (inverted) {
    if (value < 0.3) return 'bg-red-500';
    if (value < 0.7) return 'bg-yellow-500';
    return 'bg-green-500';
  }
  if (value >= 0.7) return 'bg-green-500';
  if (value >= 0.3) return 'bg-yellow-500';
  return 'bg-red-500';
}

function keyConfidenceColor(level: string | null): string {
  if (level === 'high') return 'bg-green-500';
  if (level === 'medium') return 'bg-yellow-500';
  if (level === 'low') return 'bg-red-500';
  return 'bg-gray-500';
}

export default function Samples() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SampleAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [rangeIdx, setRangeIdx] = useState(0);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { project, updateProject } = useProject();

  const handleFile = async (f: File) => {
    setFile(f);
    setLoading(true);
    setResult(null);
    setError(null);
    setWarning(null);
    setApplied(false);

    try {
      const uploadRes = await uploadFile(f);
      if (!uploadRes.success || !uploadRes.data) {
        setError(uploadRes.error?.message ?? 'Upload failed');
        return;
      }

      const r = BPM_RANGES[rangeIdx];
      const analyzeRes = await analyzeSample(uploadRes.data.file_path, r.min, r.max);
      if (!analyzeRes.success || !analyzeRes.data) {
        setError(analyzeRes.error?.message ?? 'Analysis failed');
        return;
      }

      setResult(analyzeRes.data);
      if (analyzeRes.data.warning === 'high_noise') {
        setWarning('High noise floor detected — key detection may be less accurate.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!result || !project) return;
    setApplying(true);
    const updates: Record<string, unknown> = {};
    if (result.bpm) updates.bpm = Math.round(result.bpm);
    if (result.key) updates.key = result.key;
    if (result.scale) updates.scale = result.scale;
    try {
      await updateProject(updates as any);
      setApplied(true);
    } catch {
      setError('Failed to apply to project');
    } finally {
      setApplying(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Samples</h2>

      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm text-gray-400">BPM range:</label>
        <select
          value={rangeIdx}
          onChange={(e) => setRangeIdx(+e.target.value)}
          className="rounded border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
        >
          {BPM_RANGES.map((r, i) => (
            <option key={i} value={i}>{r.label}</option>
          ))}
        </select>
      </div>

      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="rounded-lg border-2 border-dashed border-surface-700 p-12 text-center cursor-pointer hover:border-blue-500 transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".wav,.mp3,.flac,.ogg,.aiff,.m4a"
          className="hidden"
          onChange={onSelect}
        />
        {file ? (
          <p className="text-md text-gray-300">{file.name}</p>
        ) : (
          <>
            <p className="text-lg mb-2">Drop an audio file here</p>
            <p className="text-sm text-gray-500">
              Supports .wav, .mp3, .flac, .ogg, .aiff, .m4a
            </p>
          </>
        )}
      </div>

      {loading && (
        <div className="mt-6 text-center text-gray-400 animate-pulse">
          Analyzing...
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-lg bg-red-900/30 border border-red-700 p-4">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {warning && (
        <div className="mt-6 rounded-lg bg-yellow-900/30 border border-yellow-700 p-4 flex items-start gap-2">
          <span className="text-yellow-300 text-sm flex-1">{warning}</span>
          <button
            onClick={() => setWarning(null)}
            className="text-yellow-400 hover:text-yellow-200 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {result && (
        <div className="mt-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <ResultCard label="BPM" value={result.bpm?.toFixed(1) ?? '—'}>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className={`w-2 h-2 rounded-full ${confidenceColor(result.bpm_confidence)}`} />
                <span className="text-xs text-gray-500">
                  {result.bpm_confidence !== null ? `${(result.bpm_confidence * 100).toFixed(0)}%` : '—'}
                </span>
              </div>
            </ResultCard>
            <ResultCard label="Key" value={result.key ?? '—'}>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className={`w-2 h-2 rounded-full ${keyConfidenceColor(result.key_confidence)}`} />
                <span className="text-xs text-gray-500 capitalize">{result.key_confidence ?? '—'}</span>
              </div>
            </ResultCard>
            <ResultCard label="Scale" value={result.scale ?? '—'} />
            <ResultCard label="Duration" value={result.length_seconds ? `${result.length_seconds.toFixed(1)}s` : '—'} />
            <ResultCard label="Format" value={result.format?.toUpperCase() ?? '—'} />
          </div>

          {result.bpm_range_applied && (
            <p className="mt-2 text-xs text-yellow-400 text-center">
              BPM range correction applied (match your selected BPM range)
            </p>
          )}

          {result.key_algorithms && result.key_algorithms.length > 0 && (
            <details className="mt-3 text-xs text-gray-500 cursor-pointer">
              <summary className="hover:text-gray-300">Key algorithm details</summary>
              <div className="mt-2 space-y-1">
                {result.key_algorithms.map((a, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="w-36 shrink-0 text-gray-400">{a.algorithm}:</span>
                    <span>{a.tonic} {a.mode}</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          {project && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={handleApply}
                disabled={applying || applied}
                className="px-5 py-2 rounded bg-accent-500/20 text-accent-300 border border-accent-500/40 text-sm hover:bg-accent-500/30 transition-colors disabled:opacity-50"
              >
                {applied ? 'Applied ✓' : applying ? 'Applying...' : 'Apply to Project'}
              </button>
            </div>
          )}

          {!project && (
            <p className="mt-4 text-xs text-gray-500 text-center">
              Create a project to apply sample values
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ResultCard({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 text-center">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-xl font-semibold text-gray-100">{value}</p>
      {children}
    </div>
  );
}
