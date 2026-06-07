import type {
  ActivePartsSummary,
  ApiResponse,
  ArrangementExportResult,
  ChatMessage,
  ChatResult,
  MidiExportResult,
  Note,
  ProgressionChord,
  Project,
  ProviderInfo,
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

async function get<T>(path: string, params?: Record<string, string>, signal?: AbortSignal): Promise<ApiResponse<T>> {
  const qs = params ? `?${new URLSearchParams(params)}` : '';
  return fetchJson<T>(`${BASE}${path}${qs}`, signal ? { signal } : undefined);
}

async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<ApiResponse<T>> {
  return fetchJson<T>(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...(signal ? { signal } : {}),
  });
}

async function put<T>(path: string, body: unknown, signal?: AbortSignal): Promise<ApiResponse<T>> {
  return fetchJson<T>(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...(signal ? { signal } : {}),
  });
}

async function del<T>(path: string, signal?: AbortSignal): Promise<ApiResponse<T>> {
  return fetchJson<T>(`${BASE}${path}`, {
    method: 'DELETE',
    ...(signal ? { signal } : {}),
  });
}

export async function uploadFile(file: File, signal?: AbortSignal): Promise<ApiResponse<UploadResult>> {
  const form = new FormData();
  form.append('file', file);
  return fetchJson<UploadResult>(`${BASE}/upload/`, { method: 'POST', body: form, signal });
}

export async function analyzeSample(
  filePath: string,
  minBpm = 0,
  maxBpm = 0,
  signal?: AbortSignal,
): Promise<ApiResponse<SampleAnalysisResult>> {
  return post<SampleAnalysisResult>('/plugins/sample_analyzer/execute', {
    file_path: filePath,
    min_bpm: minBpm,
    max_bpm: maxBpm,
  }, signal);
}

export async function theoryEngine(
  mode: string,
  params: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<ApiResponse<TheoryResult>> {
  return post<TheoryResult>('/plugins/theory_engine/execute', {
    mode,
    ...params,
  }, signal);
}

export async function saveProgression(
  key: string,
  mood: string | null,
  genre: string | null,
  chords: ProgressionChord[],
  opts?: { project_id?: number; name?: string },
  signal?: AbortSignal,
): Promise<ApiResponse<{ id: number }>> {
  return post<{ id: number }>('/progressions/', { key, mood, genre, chords, ...opts }, signal);
}

export async function listProgressions(
  sortBy = 'created_at',
  sortOrder = 'DESC',
  type: string | null = null,
  signal?: AbortSignal,
): Promise<ApiResponse<{ progressions: SavedProgression[] }>> {
  const params: Record<string, string> = { sort_by: sortBy, sort_order: sortOrder };
  if (type !== null) params.type = type;
  return get<{ progressions: SavedProgression[] }>('/progressions/', params, signal);
}

export async function deleteProgression(id: number, signal?: AbortSignal): Promise<ApiResponse<{ deleted: boolean }>> {
  return del<{ deleted: boolean }>(`/progressions/${id}`, signal);
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
  signal?: AbortSignal,
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
  }, signal);
}

export function downloadMidiUrl(progressionId: number, bpm = 120): string {
  return `${BASE}/progressions/${progressionId}/midi?bpm=${bpm}`;
}

export async function createProject(
  name: string,
  bpm = 120,
  key = 'C',
  scale = 'Major',
  signal?: AbortSignal,
): Promise<ApiResponse<{ id: number }>> {
  return post<{ id: number }>('/projects/', { name, bpm, key, scale }, signal);
}

export async function listProjects(signal?: AbortSignal): Promise<ApiResponse<{ projects: Project[] }>> {
  return get<{ projects: Project[] }>('/projects/', undefined, signal);
}

export async function getProject(id: number, signal?: AbortSignal): Promise<ApiResponse<{ project: Project }>> {
  return get<{ project: Project }>(`/projects/${id}`, undefined, signal);
}

export async function getLastProject(signal?: AbortSignal): Promise<ApiResponse<{ project: Project | null }>> {
  return get<{ project: Project | null }>('/projects/last', undefined, signal);
}

export async function updateProject(
  id: number,
  updates: Partial<Pick<Project, 'name' | 'bpm' | 'key' | 'scale'>>,
  signal?: AbortSignal,
): Promise<ApiResponse<{ project: Project }>> {
  return put<{ project: Project }>(`/projects/${id}`, updates, signal);
}

export async function deleteProject(id: number, signal?: AbortSignal): Promise<ApiResponse<{ deleted: boolean }>> {
  return del<{ deleted: boolean }>(`/projects/${id}`, signal);
}

export async function searchAll(
  q: string,
  limit = 20,
  signal?: AbortSignal,
): Promise<ApiResponse<{ results: SearchResult[] }>> {
  return get<{ results: SearchResult[] }>('/search/', { q, limit: String(limit) }, signal);
}

export async function chordGenerator(
  key: string,
  mood: string,
  genre: string,
  length = 4,
  complexity = 'simple',
  signal?: AbortSignal,
): Promise<ApiResponse<TheoryProgression>> {
  return post<TheoryProgression>('/plugins/chord_generator/execute', {
    key, mood: mood.toLowerCase(), genre, length, complexity,
  }, signal);
}

export async function melodyGenerator(
  key: string,
  scale: string,
  mood: string,
  genre: string,
  length = 8,
  complexity = 'simple',
  signal?: AbortSignal,
): Promise<ApiResponse<{ notes: Note[]; length_bars: number }>> {
  return post<{ notes: Note[]; length_bars: number }>('/plugins/melody_generator/execute', {
    key, scale, mood, genre, length, complexity,
  }, signal);
}

export async function basslineGenerator(
  key: string,
  scale: string,
  genre: string,
  length = 8,
  pattern = 'auto',
  signal?: AbortSignal,
): Promise<ApiResponse<{ notes: Note[]; length_bars: number }>> {
  return post<{ notes: Note[]; length_bars: number }>('/plugins/bassline_generator/execute', {
    key, scale, genre, length, pattern,
  }, signal);
}

export async function saveArrangement(
  chords: Note[],
  melody: Note[],
  bassline: Note[],
  key: string,
  scale: string | null,
  mood: string | null,
  genre: string | null,
  bpm: number | null,
  opts?: { project_id?: number; name?: string },
  signal?: AbortSignal,
): Promise<ApiResponse<{ id: number }>> {
  return post<{ id: number }>('/arrangement/save', {
    chords, melody, bassline, key, scale, mood, genre, bpm, ...opts,
  }, signal);
}

export async function exportArrangement(
  chords: Note[],
  melody: Note[],
  bassline: Note[],
  bpm = 120,
  swing = 0,
  solo = { chords: true, melody: true, bassline: true },
  signal?: AbortSignal,
): Promise<ApiResponse<ArrangementExportResult>> {
  return post<ArrangementExportResult>('/arrangement/export', {
    chords, melody, bassline, bpm, swing, solo,
  }, signal);
}

export async function exportSinglePart(
  part: 'chords' | 'melody' | 'bassline',
  notes: Note[],
  bpm = 120,
  signal?: AbortSignal,
): Promise<ApiResponse<ArrangementExportResult>> {
  return post<ArrangementExportResult>('/arrangement/per-part', { part, notes, bpm }, signal);
}

export async function downloadFromUrl(downloadUrl: string, filename: string, signal?: AbortSignal): Promise<void> {
  const fullUrl = `${BASE.replace('/api', '')}${downloadUrl}`;
  const res = await fetch(fullUrl, { credentials: 'include', signal });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

/* ── Chat ──────────────────────────── */

export async function sendChat(
  message: string,
  activeParts: Record<string, ActivePartsSummary>,
  project: { key: string; scale: string; bpm: number; mood?: string; genre?: string } | null,
  signal?: AbortSignal,
): Promise<ApiResponse<ChatResult>> {
  return post<ChatResult>('/chat/', {
    message,
    project_context: project ? {
      key: project.key,
      scale: project.scale,
      bpm: project.bpm,
      mood: project.mood ?? '',
      genre: project.genre ?? '',
      active_parts: activeParts,
    } : null,
  }, signal);
}

export async function getChatHistory(limit = 20, signal?: AbortSignal): Promise<ApiResponse<{ history: ChatMessage[] }>> {
  return get<{ history: ChatMessage[] }>('/chat/history', { limit: String(limit) }, signal);
}

export async function clearChatHistory(signal?: AbortSignal): Promise<ApiResponse<{ cleared: boolean }>> {
  return del<{ cleared: boolean }>('/chat/history', signal);
}

/* ── Provider Config ───────────────── */

export async function listProviders(signal?: AbortSignal): Promise<ApiResponse<{ providers: ProviderInfo[]; priority: string[] }>> {
  return get<{ providers: ProviderInfo[]; priority: string[] }>('/providers/', undefined, signal);
}

export async function configureProvider(
  name: string,
  apiKey: string,
  model?: string,
  signal?: AbortSignal,
): Promise<ApiResponse<{ configured: boolean }>> {
  return post<{ configured: boolean }>('/providers/configure', { name, api_key: apiKey, model }, signal);
}

export async function setProviderPriority(priority: string[], signal?: AbortSignal): Promise<ApiResponse<{ priority: string[] }>> {
  return post<{ priority: string[] }>('/providers/priority', { priority }, signal);
}

export async function testProvider(name: string, signal?: AbortSignal): Promise<ApiResponse<{ healthy: boolean; latency_ms: number }>> {
  return post<{ healthy: boolean; latency_ms: number }>('/providers/test', { name }, signal);
}
