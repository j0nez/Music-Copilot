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
  key: string;
  mood: string | null;
  genre: string | null;
  chords: ProgressionChord[];
  created_at: string;
}

export interface MidiExportResult {
  file_path: string;
  filename: string;
  bpm: number;
  length_bars: number;
}

export type TheoryResult = TheoryScale | TheoryChord | TheoryInterval | TheoryProgression;
