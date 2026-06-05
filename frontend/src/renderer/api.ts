import type {
  ApiResponse,
  MidiExportResult,
  ProgressionChord,
  Project,
  SampleAnalysisResult,
  SavedProgression,
  TheoryProgression,
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

export async function exportMidi(
  key: string,
  chords: ProgressionChord[],
  opts?: {
    bpm?: number;
    style?: string;
    voicing?: string;
    genre?: string;
    mood?: string;
    arpeggio_pattern?: string;
    articulation?: string;
    base_velocity?: number;
  },
): Promise<ApiResponse<MidiExportResult>> {
  return post<MidiExportResult>('/plugins/midi_export/execute', {
    key,
    chords,
    bpm: opts?.bpm ?? 120,
    style: opts?.style ?? 'block',
    voicing: opts?.voicing ?? 'close',
    genre: opts?.genre ?? 'house',
    mood: opts?.mood ?? 'uplifting',
    arpeggio_pattern: opts?.arpeggio_pattern ?? 'up',
    articulation: opts?.articulation ?? 'auto',
    base_velocity: opts?.base_velocity ?? 100,
  });
}

export function downloadMidiUrl(progressionId: number, bpm = 120): string {
  return `http://localhost:8000/api/progressions/${progressionId}/midi?bpm=${bpm}`;
}

export async function createProject(
  name: string,
  bpm = 120,
  key = 'C',
  scale = 'Major',
): Promise<ApiResponse<{ id: number }>> {
  return post<{ id: number }>('/projects/', { name, bpm, key, scale });
}

export async function listProjects(): Promise<ApiResponse<{ projects: Project[] }>> {
  const res = await fetch('http://localhost:8000/api/projects/');
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getProject(id: number): Promise<ApiResponse<{ project: Project }>> {
  const res = await fetch(`http://localhost:8000/api/projects/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getLastProject(): Promise<ApiResponse<{ project: Project | null }>> {
  const res = await fetch('http://localhost:8000/api/projects/last');
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateProject(
  id: number,
  updates: Partial<Pick<Project, 'name' | 'bpm' | 'key' | 'scale'>>,
): Promise<ApiResponse<{ project: Project }>> {
  return post<{ project: Project }>(`/projects/${id}`, updates);
}

export async function deleteProject(id: number): Promise<ApiResponse<{ deleted: boolean }>> {
  const res = await fetch(`http://localhost:8000/api/projects/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function chordGenerator(
  key: string,
  mood: string,
  genre: string,
  length = 4,
  complexity = 'simple',
): Promise<ApiResponse<TheoryProgression>> {
  return post<TheoryProgression>('/plugins/chord_generator/execute', {
    key, mood: mood.toLowerCase(), genre, length, complexity,
  });
}
