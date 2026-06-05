export interface SampleAnalysisResult {
  bpm: number | null;
  key: string | null;
  scale: string | null;
  length_seconds: number | null;
  format: string | null;
}

export interface UploadResult {
  file_path: string;
  original_name: string;
  size_bytes: number;
  format: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: { code: string; message: string } | null;
}

export interface TheoryScale {
  key: string;
  scale: string;
  notes: string[];
  intervals: string[];
}

export interface TheoryChord {
  root: string;
  quality: string;
  notes: string[];
  function: string | null;
}

export interface TheoryInterval {
  note1: string;
  note2: string;
  interval: string;
  semitones: number;
}

export interface ProgressionChord {
  roman: string;
  name: string;
  notes: string[];
  quality: string;
}

export interface TheoryProgression {
  key: string;
  chords: ProgressionChord[];
  mood: string;
  genre: string;
}

export interface SavedProgression {
  id: number;
  project_id: number | null;
  type: string;
  name: string;
  data: ProgressionChord[];  // same as old `chords`
  key: string;
  mood: string | null;
  genre: string | null;
  bpm: number | null;
  created_at: string;
}

export interface Idea {
  id: number;
  project_id: number | null;
  type: 'progression' | 'melody' | 'bassline' | 'drum_pattern' | 'arpeggio' | 'phrase';
  name: string;
  data: ProgressionChord[];
  key: string | null;
  mood: string | null;
  genre: string | null;
  bpm: number | null;
  created_at: string;
}

export interface MidiExportResult {
  file_path: string;
  filename: string;
  bpm: number;
  length_bars: number;
}

export interface Project {
  id: number;
  name: string;
  bpm: number;
  key: string;
  scale: string;
  created_at: string;
  updated_at: string;
}

export type TheoryResult = TheoryScale | TheoryChord | TheoryInterval | TheoryProgression;
