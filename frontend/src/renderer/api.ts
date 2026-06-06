import type {
  ApiResponse,
  MidiExportResult,
  ProgressionChord,
  Project,
  SampleAnalysisResult,
  SavedProgression,
  SearchResult,
  TheoryProgression,
  TheoryResult,
  UploadResult,
} from './types';

const BASE = 'http://localhost:8000/api';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, init);
    const body = await res.json();
    if (!res.ok && !body.success) {
      return { success: false, data: null, error: body.error ?? { code: 'HTTP_ERROR', message: `Status ${res.status}` } };
    }
    return body as ApiResponse<T>;
  } catch (e) {
    return { success: false, data: null, error: { code: 'NETWORK_ERROR', message: e instanceof Error ? e.message : 'Network request failed' } };
  }
}

async function get<T>(path: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
  const qs = params ? `?${new URLSearchParams(params)}` : '';
  return fetchJson<T>(`${BASE}${path}${qs}`);
}

async function post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  return fetchJson<T>(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function put<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  return fetchJson<T>(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function del<T>(path: string): Promise<ApiResponse<T>> {
  return fetchJson<T>(`${BASE}${path}`, { method: 'DELETE' });
}

export async function uploadFile(file: File): Promise<ApiResponse<UploadResult>> {
  const form = new FormData();
  form.append('file', file);
  return fetchJson<UploadResult>(`${BASE}/upload/`, { method: 'POST', body: form });
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
  opts?: { project_id?: number; name?: string },
): Promise<ApiResponse<{ id: number }>> {
  return post<{ id: number }>('/progressions/', { key, mood, genre, chords, ...opts });
}

export async function listProgressions(
  sortBy = 'created_at',
  sortOrder = 'DESC',
  type: string | null = null,
): Promise<ApiResponse<{ progressions: SavedProgression[] }>> {
  const params: Record<string, string> = { sort_by: sortBy, sort_order: sortOrder };
  if (type !== null) params.type = type;
  return get<{ progressions: SavedProgression[] }>('/progressions/', params);
}

export async function deleteProgression(id: number): Promise<ApiResponse<{ deleted: boolean }>> {
  return del<{ deleted: boolean }>(`/progressions/${id}`);
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
  return `${BASE}/progressions/${progressionId}/midi?bpm=${bpm}`;
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
  return get<{ projects: Project[] }>('/projects/');
}

export async function getProject(id: number): Promise<ApiResponse<{ project: Project }>> {
  return get<{ project: Project }>(`/projects/${id}`);
}

export async function getLastProject(): Promise<ApiResponse<{ project: Project | null }>> {
  return get<{ project: Project | null }>('/projects/last');
}

export async function updateProject(
  id: number,
  updates: Partial<Pick<Project, 'name' | 'bpm' | 'key' | 'scale'>>,
): Promise<ApiResponse<{ project: Project }>> {
  return put<{ project: Project }>(`/projects/${id}`, updates);
}

export async function deleteProject(id: number): Promise<ApiResponse<{ deleted: boolean }>> {
  return del<{ deleted: boolean }>(`/projects/${id}`);
}

export async function searchAll(
  q: string,
  limit = 20,
): Promise<ApiResponse<{ results: SearchResult[] }>> {
  return get<{ results: SearchResult[] }>('/search/', { q, limit: String(limit) });
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

export async function melodyGenerator(
  key: string,
  scale: string,
  mood: string,
  genre: string,
  length = 8,
  complexity = 'simple',
): Promise<ApiResponse<{ notes: import('./types').Note[]; length_bars: number }>> {
  return post('/plugins/melody_generator/execute', {
    key, scale, mood, genre, length, complexity,
  });
}

export async function basslineGenerator(
  key: string,
  scale: string,
  genre: string,
  length = 8,
  pattern = 'auto',
): Promise<ApiResponse<{ notes: import('./types').Note[]; length_bars: number }>> {
  return post('/plugins/bassline_generator/execute', {
    key, scale, genre, length, pattern,
  });
}

export async function exportArrangement(
  chords: import('./types').Note[],
  melody: import('./types').Note[],
  bassline: import('./types').Note[],
  bpm = 120,
  solo = { chords: true, melody: true, bassline: true },
): Promise<ApiResponse<import('./types').ArrangementExportResult>> {
  return post<import('./types').ArrangementExportResult>('/arrangement/export', {
    chords, melody, bassline, bpm, solo,
  });
}
