import { useState, useRef } from 'react';
import { uploadFile, analyzeSample } from '../api';
import type { SampleAnalysisResult } from '../types';

const BPM_RANGES = [
  { label: 'Auto (no adjustment)', min: 0, max: 0 },
  { label: 'Slow – 50–150 BPM', min: 50, max: 150 },
  { label: 'Medium – 100–200 BPM', min: 100, max: 200 },
  { label: 'Fast – 150–250 BPM', min: 150, max: 250 },
];

export default function Samples() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SampleAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rangeIdx, setRangeIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File) => {
    setFile(f);
    setLoading(true);
    setResult(null);
    setError(null);

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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
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

      {result && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <ResultCard label="BPM" value={result.bpm?.toFixed(1) ?? '—'} />
          <ResultCard label="Key" value={result.key ?? '—'} />
          <ResultCard label="Scale" value={result.scale ?? '—'} />
          <ResultCard label="Duration" value={result.length_seconds ? `${result.length_seconds.toFixed(1)}s` : '—'} />
          <ResultCard label="Format" value={result.format?.toUpperCase() ?? '—'} />
        </div>
      )}
    </div>
  );
}

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-surface-700 bg-surface-800 p-4 text-center">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-xl font-semibold text-gray-100">{value}</p>
    </div>
  );
}
