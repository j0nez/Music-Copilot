import type {
  ApiResponse,
  ProgressionChord,
  SampleAnalysisResult,
  SavedProgression,
  TheoryResult,
  UploadResult,
} from './types';

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

export async function theoryEngine(
  mode: string,
  params: Record<string, unknown>,
): Promise<ApiResponse<TheoryResult>> {
  return post<TheoryResult>('/plugins/theory_engine/execute', {
    mode,
    ...params,
  });
}

export async function saveProgression(
  key: string,
  mood: string | null,
  genre: string | null,
  chords: ProgressionChord[],
): Promise<ApiResponse<{ id: number }>> {
  return post<{ id: number }>('/progressions/', { key, mood, genre, chords });
}

export async function listProgressions(
  sortBy = 'created_at',
  sortOrder = 'DESC',
): Promise<ApiResponse<{ progressions: SavedProgression[] }>> {
  const res = await fetch(`http://localhost:8000/api/progressions/?sort_by=${sortBy}&sort_order=${sortOrder}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteProgression(id: number): Promise<ApiResponse<{ deleted: boolean }>> {
  const res = await fetch(`http://localhost:8000/api/progressions/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
