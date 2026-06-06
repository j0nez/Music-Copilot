import logging
from collections import Counter
from pathlib import Path

import librosa
import numpy as np
from deeprhythm import DeepRhythmPredictor
from music21 import note, stream
from music21.analysis.discrete import (
    AardenEssen,
    BellmanBudge,
    KrumhanslSchmuckler,
    SimpleWeights,
    TemperleyKostkaPayne,
)
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

KEY_ALGORITHMS = [
    ("Krumhansl-Schmuckler", KrumhanslSchmuckler),
    ("Aarden-Essen", AardenEssen),
    ("Bellman-Budge", BellmanBudge),
    ("Temperley-Kostka-Payne", TemperleyKostkaPayne),
    ("Simple-Weights", SimpleWeights),
]

SILENCE_RMS_THRESHOLD = 0.01
SHORT_AUDIO_THRESHOLD = 0.5
NOISE_FLATNESS_THRESHOLD = 0.8


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

            if duration < SHORT_AUDIO_THRESHOLD:
                return PluginResult(
                    success=False,
                    data={},
                    error=f"Audio too short to analyze ({duration:.2f}s < {SHORT_AUDIO_THRESHOLD}s)",
                )

            rms = float(np.sqrt(np.mean(y ** 2)))
            if rms < SILENCE_RMS_THRESHOLD:
                return PluginResult(
                    success=False,
                    data={},
                    error="Audio appears to be silent (very low energy)",
                )

            spectral_flatness = float(np.mean(librosa.feature.spectral_flatness(y=y)))
            warning = "high_noise" if spectral_flatness > NOISE_FLATNESS_THRESHOLD else None

            bpm_result = self._detect_bpm(y, sr, min_bpm=min_bpm, max_bpm=max_bpm)

            key_name, scale_type, key_results, key_confidence = self._detect_key(y, sr)
            scale = f"{key_name} {scale_type}" if key_name and scale_type else None

            result = {
                "bpm": round(bpm_result["bpm"], 1) if bpm_result["bpm"] else None,
                "key": key_name,
                "scale": scale,
                "length_seconds": round(duration, 2),
                "format": path.suffix.lstrip("."),
                "bpm_confidence": bpm_result["confidence"],
                "bpm_range_applied": bpm_result["range_applied"],
                "key_confidence": key_confidence,
                "key_algorithms": key_results,
                "warning": warning,
            }

            await event_bus.emit("sample.analyzed", **result)

            return PluginResult(success=True, data=result)

        except Exception as e:
            logger.error("Analysis failed for %s: %s", file_path, e, exc_info=True)
            return PluginResult(success=False, data={}, error=str(e))

    def _detect_bpm(
        self, y: np.ndarray, sr: int, min_bpm: int = 0, max_bpm: int = 0
    ) -> dict:
        try:
            clip_samples = sr * 8
            if len(y) < clip_samples:
                repeats = int(np.ceil(clip_samples / len(y)))
                y = np.tile(y, repeats)[:clip_samples]

            tempo, confidence = _bpm_model.predict_from_audio(
                y, sr, include_confidence=True,
            )
            bpm_val = float(tempo)

            range_applied = False
            if min_bpm > 0 and max_bpm > 0:
                if bpm_val < min_bpm and min_bpm <= bpm_val * 2 <= max_bpm:
                    logger.debug("BPM %s < %s, doubled to %s", bpm_val, min_bpm, bpm_val * 2)
                    bpm_val = bpm_val * 2
                    range_applied = True
                elif bpm_val > max_bpm and min_bpm <= bpm_val / 2 <= max_bpm:
                    logger.debug("BPM %s > %s, halved to %s", bpm_val, max_bpm, bpm_val / 2)
                    bpm_val = bpm_val / 2
                    range_applied = True

            if confidence < 0.5:
                logger.warning(
                    "DeepRhythm low confidence (%.2f), falling back to librosa", confidence,
                )
                bpm = librosa.feature.rhythm.tempo(
                    y=y, sr=sr, start_bpm=120.0, std_bpm=2.0,
                )
                return {
                    "bpm": round(float(np.atleast_1d(bpm)[0]), 1),
                    "confidence": round(float(confidence), 2),
                    "range_applied": range_applied,
                }

            return {
                "bpm": round(bpm_val, 1),
                "confidence": round(float(confidence), 2),
                "range_applied": range_applied,
            }
        except Exception as e:
            logger.warning("BPM detection failed: %s", e)
            return {"bpm": None, "confidence": 0.0, "range_applied": False}

    def _detect_key(
        self, y: np.ndarray, sr: int
    ) -> tuple[str | None, str | None, list[dict], str]:
        try:
            chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
            chroma_mean = np.mean(chroma, axis=1)
            if chroma_mean.max() < 0.01:
                return None, None, [], "none"

            s = stream.Stream()
            for i, intensity in enumerate(chroma_mean):
                count = max(1, int(round(intensity * 20)))
                for _ in range(count):
                    n = note.Note(PITCH_CLASSES[i] + "4")
                    n.quarterLength = 0.25
                    s.append(n)

            results = []
            for algo_name, algo_cls in KEY_ALGORITHMS:
                try:
                    algo = algo_cls()
                    k = algo.getSolution(s)
                    if k is not None:
                        results.append({
                            "algorithm": algo_name,
                            "tonic": str(k.tonic),
                            "mode": k.mode,
                        })
                except Exception as e:
                    logger.debug("%s algorithm failed: %s", algo_name, e)

            if not results:
                return None, None, [], "none"

            key_votes = Counter((r["tonic"], r["mode"]) for r in results)
            winner, agreement = key_votes.most_common(1)[0]

            if agreement >= 4:
                confidence = "high"
            elif agreement >= 3:
                confidence = "medium"
            else:
                confidence = "low"

            return winner[0], winner[1], results, confidence

        except Exception as e:
            logger.warning("Key detection failed: %s", e)
            return None, None, [], "none"
