import logging
from pathlib import Path

import librosa.feature.rhythm
import numpy as np
from deeprhythm import DeepRhythmPredictor
from music21 import note, stream
from pydantic import BaseModel

from plugins.base import Plugin, PluginResult
from plugins.events import event_bus

logger = logging.getLogger("music_copilot.sample_analyzer")

_bpm_model = DeepRhythmPredictor()


class SampleAnalyzerInput(BaseModel):
    file_path: str
    min_bpm: int = 0
    max_bpm: int = 0


PITCH_CLASSES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


class SampleAnalyzerPlugin(Plugin):
    name = "sample_analyzer"
    description = "Analyzes audio files for BPM, key, scale, and duration"
    version = "0.1.0"
    input_schema = SampleAnalyzerInput

    async def execute(self, file_path: str, min_bpm: int = 0, max_bpm: int = 0, **kwargs) -> PluginResult:
        path = Path(file_path)
        if not path.exists():
            return PluginResult(
                success=False, data={}, error=f"File not found: {file_path}"
            )

        try:
            y, sr = librosa.load(str(path))

            duration = float(librosa.get_duration(y=y, sr=sr))
            bpm = self._detect_bpm(y, sr, min_bpm=min_bpm, max_bpm=max_bpm)
            key_name, scale_type = self._detect_key(y, sr)
            scale = f"{key_name} {scale_type}" if key_name and scale_type else None

            result = {
                "bpm": round(bpm, 1) if bpm else None,
                "key": key_name,
                "scale": scale,
                "length_seconds": round(duration, 2),
                "format": path.suffix.lstrip("."),
            }

            await event_bus.emit("sample.analyzed", **result)

            return PluginResult(success=True, data=result)

        except Exception as e:
            logger.error("Analysis failed for %s: %s", file_path, e, exc_info=True)
            return PluginResult(success=False, data={}, error=str(e))

    def _detect_bpm(self, y: np.ndarray, sr: int, min_bpm: int = 0, max_bpm: int = 0) -> float | None:
        try:
            clip_samples = sr * 8
            if len(y) < clip_samples:
                repeats = int(np.ceil(clip_samples / len(y)))
                y = np.tile(y, repeats)[:clip_samples]

            tempo, confidence = _bpm_model.predict_from_audio(
                y, sr, include_confidence=True,
            )
            bpm_val = float(tempo)

            if min_bpm > 0 and max_bpm > 0:
                if bpm_val < min_bpm and min_bpm <= bpm_val * 2 <= max_bpm:
                    logger.debug("BPM %s < %s, doubled to %s", bpm_val, min_bpm, bpm_val * 2)
                    bpm_val = bpm_val * 2
                elif bpm_val > max_bpm and min_bpm <= bpm_val / 2 <= max_bpm:
                    logger.debug("BPM %s > %s, halved to %s", bpm_val, max_bpm, bpm_val / 2)
                    bpm_val = bpm_val / 2

            if confidence < 0.5:
                logger.warning(
                    "DeepRhythm low confidence (%.2f), falling back to librosa", confidence,
                )
                bpm = librosa.feature.rhythm.tempo(
                    y=y, sr=sr,
                    start_bpm=120.0,
                    std_bpm=2.0,
                )
                return round(float(np.atleast_1d(bpm)[0]), 1)

            return round(bpm_val, 1)
        except Exception as e:
            logger.warning("BPM detection failed: %s", e)
            return None

    def _detect_key(
        self, y: np.ndarray, sr: int
    ) -> tuple[str | None, str | None]:
        try:
            chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
            chroma_mean = np.mean(chroma, axis=1)
            if chroma_mean.max() < 0.01:
                return None, None

            s = stream.Stream()
            for i, intensity in enumerate(chroma_mean):
                count = max(1, int(round(intensity * 20)))
                for _ in range(count):
                    n = note.Note(PITCH_CLASSES[i] + "4")
                    n.quarterLength = 0.25
                    s.append(n)

            key_obj = s.analyze("key")
            if key_obj is None:
                return None, None

            return str(key_obj.tonic), key_obj.mode

        except Exception as e:
            logger.warning("Key detection failed: %s", e)
            return None, None
