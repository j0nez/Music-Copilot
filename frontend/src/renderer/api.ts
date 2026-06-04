import type { ApiResponse, SampleAnalysisResult, UploadResult } from './types';

const BASE = 'http://localhost:8000/api';

async function post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function uploadFile(file: File): Promise<ApiResponse<UploadResult>> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/upload/`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function analyzeSample(
  filePath: string,
  minBpm = 0,
  maxBpm = 0,
): Promise<ApiResponse<SampleAnalysisResult>> {
  return post<SampleAnalysisResult>('/plugins/sample_analyzer/execute', {
    file_path: filePath,
    min_bpm: minBpm,
    max_bpm: maxBpm,
  });
}
