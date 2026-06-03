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
