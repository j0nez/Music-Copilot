export interface KeyAlgorithmResult {
  algorithm: string;
  tonic: string;
  mode: string;
}

export interface SampleAnalysisResult {
  bpm: number | null;
  key: string | null;
  scale: string | null;
  length_seconds: number | null;
  format: string | null;
  bpm_confidence: number | null;
  bpm_range_applied: boolean | null;
  key_confidence: string | null;
  key_algorithms: KeyAlgorithmResult[] | null;
  warning: string | null;
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

export interface VoiceLeading {
  score: number;
  issues: string[];
}

export interface TheoryProgression {
  key: string;
  chords: ProgressionChord[];
  mood: string;
  genre: string;
  voice_leading?: VoiceLeading;
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

export interface SearchResult {
  id: number;
  source_type: 'idea' | 'sample' | 'project';
  subtype: string;
  name: string;
  key: string | null;
  mood: string | null;
  genre: string | null;
  created_at: string;
}

export interface Note {
  pitch: number;
  velocity: number;
  start_beat: number;
  duration_in_beats: number;
}

export interface PlayerPart {
  type: 'chords' | 'melody' | 'bassline';
  label: string;
  notes: Note[];
  color: 'purple' | 'green' | 'blue';
  solo: boolean;
}

export interface PlayerState {
  chords: Note[];
  melody: Note[];
  bassline: Note[];
  solo: { chords: boolean; melody: boolean; bassline: boolean };
  bpm: number;
}

export interface GeneratorSettings {
  key: string;
  scale: string;
  mood: string;
  genre: string;
  length: number;
  complexity: string;
}

export interface GenerationHistory {
  chords: Note[][];
  melody: Note[][];
  bassline: Note[][];
}

export interface ArrangementExportResult {
  download_url: string;
  filename: string;
}

export const SWING_PRESETS: Record<string, number> = {
  house: 0.30,
  techno: 0.20,
  dnb: 0.40,
  'drum & bass': 0.40,
  'deep house': 0.35,
  trance: 0.15,
  'melodic techno': 0.25,
};
