import { useRef, useState } from "react";
import { analyzeSample, uploadFile } from "../api";
import { useProject } from "../store/projectContext";
import type { SampleAnalysisResult } from "../types";

const BPM_RANGES = [
  { label: "Auto", min: 0, max: 0 },
  { label: "50–150", min: 50, max: 150 },
  { label: "100–200", min: 100, max: 200 },
  { label: "150–250", min: 150, max: 250 },
];

function confidenceColor(value: number | null): string {
  if (value === null) return "bg-gray-500";
  if (value >= 0.7) return "bg-green-500";
  if (value >= 0.3) return "bg-yellow-500";
  return "bg-red-500";
}

function keyConfidenceColor(level: string | null): string {
  if (level === "high") return "bg-green-500";
  if (level === "medium") return "bg-yellow-500";
  if (level === "low") return "bg-red-500";
  return "bg-gray-500";
}

export default function SampleAnalysisPanel() {
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
        setError(uploadRes.error?.message ?? "Upload failed");
        return;
      }

      const r = BPM_RANGES[rangeIdx];
      const analyzeRes = await analyzeSample(uploadRes.data.file_path, r.min, r.max);
      if (!analyzeRes.success || !analyzeRes.data) {
        setError(analyzeRes.error?.message ?? "Analysis failed");
        return;
      }

      setResult(analyzeRes.data);
      if (analyzeRes.data.warning === "high_noise") {
        setWarning("High noise floor — key detection may be less accurate.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
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
      setError("Failed to apply to project");
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
    <div className="flex flex-col h-full p-2">
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <select
          value={rangeIdx}
          onChange={(e) => setRangeIdx(+e.target.value)}
          className="bg-surface-800 rounded px-1.5 py-1 text-[10px] text-gray-300 outline-none focus:ring-1 focus:ring-accent-500/50"
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
        className="rounded-lg border-2 border-dashed border-surface-700 p-4 text-center cursor-pointer hover:border-accent-500/50 transition-colors shrink-0"
      >
        <input ref={inputRef} type="file" accept=".wav,.mp3,.flac,.ogg,.aiff,.m4a" className="hidden" onChange={onSelect} />
        {file ? (
          <p className="text-xs text-gray-300 truncate">{file.name}</p>
        ) : (
          <>
            <p className="text-xs text-gray-400">Drop audio here</p>
            <p className="text-[10px] text-gray-600">.wav .mp3 .flac</p>
          </>
        )}
      </div>

      {loading && <p className="text-center text-[10px] text-gray-500 animate-pulse mt-2">Analyzing...</p>}

      {error && <p className="text-red-300 text-[10px] mt-2">{error}</p>}

      {warning && (
        <div className="flex items-start gap-1 mt-2 bg-yellow-900/30 border border-yellow-700 rounded px-2 py-1">
          <span className="text-yellow-300 text-[10px] flex-1">{warning}</span>
          <button onClick={() => setWarning(null)} className="text-yellow-400 hover:text-yellow-200 text-[10px]">✕</button>
        </div>
      )}

      {result && (
        <div className="mt-2 flex-1 overflow-y-auto space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <MiniCard label="BPM" value={result.bpm?.toFixed(1) ?? "—"}>
              {result.bpm_confidence !== null && (
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${confidenceColor(result.bpm_confidence)}`} />
                  <span className="text-[10px] text-gray-500">{(result.bpm_confidence * 100).toFixed(0)}%</span>
                </div>
              )}
            </MiniCard>
            <MiniCard label="Key" value={result.key ?? "—"}>
              {result.key_confidence && (
                <span className={`w-1.5 h-1.5 rounded-full ${keyConfidenceColor(result.key_confidence)} inline-block mt-0.5`} />
              )}
            </MiniCard>
            <MiniCard label="Scale" value={result.scale ?? "—"} />
          </div>

          {result.key_algorithms && result.key_algorithms.length > 0 && (
            <details className="text-[10px] text-gray-500 cursor-pointer">
              <summary className="hover:text-gray-300">Algorithms</summary>
              <div className="mt-1 space-y-0.5">
                {result.key_algorithms.map((a, i) => (
                  <div key={i} className="flex gap-1">
                    <span className="w-28 shrink-0 text-gray-400">{a.algorithm}:</span>
                    <span>{a.tonic} {a.mode}</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          {result.bpm_range_applied && (
            <p className="text-[10px] text-yellow-400">BPM range correction applied</p>
          )}

          {project ? (
            <button
              onClick={handleApply}
              disabled={applying || applied}
              className="w-full py-1 rounded bg-accent-500/20 text-accent-300 border border-accent-500/40 text-[10px] hover:bg-accent-500/30 transition-colors disabled:opacity-50"
            >
              {applied ? "Applied ✓" : applying ? "Applying..." : "Apply to Project"}
            </button>
          ) : (
            <p className="text-[10px] text-gray-500 text-center">Create a project to apply values</p>
          )}
        </div>
      )}
    </div>
  );
}

function MiniCard({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="rounded border border-surface-700 bg-surface-800/60 p-2 text-center">
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-gray-100 font-mono">{value}</p>
      {children}
    </div>
  );
}
