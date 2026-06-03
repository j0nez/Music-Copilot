import { useState, useRef } from 'react';
import { uploadFile, analyzeSample } from '../api';
import type { SampleAnalysisResult } from '../types';

export default function Samples() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SampleAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
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

      const analyzeRes = await analyzeSample(uploadRes.data.file_path);
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
