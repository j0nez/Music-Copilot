import itertools
import logging

from isobar import PDegree, PMarkov, PRandomWalk, Scale
from pydantic import BaseModel

from plugins.base import Plugin, PluginResult
from shared.music_theory import resolve_phrase_multiplier, resolve_gate_length, _SCALE_NAMES

logger = logging.getLogger("music_copilot.melody_generator")


class MelodyGeneratorInput(BaseModel):
    key: str = "A Minor"
    scale: str = "Natural Minor"
    mood: str = "dark"
    genre: str = "techno"
    length: int = 8
    complexity: str = "simple"
    articulation: str = "auto"


_MOOD_RANGE: dict[str, tuple[int, int]] = {
    "dark": (48, 72),
    "melancholic": (53, 77),
    "neutral": (60, 84),
    "uplifting": (67, 91),
    "energetic": (72, 96),
}

_NOTES_PER_BAR: dict[str, int] = {
    "techno": 8,
    "house": 8,
    "deep house": 10,
    "trance": 12,
    "dnb": 16,
    "drum & bass": 16,
    "melodic techno": 8,
}


class MelodyGeneratorPlugin(Plugin):
    name = "melody_generator"
    description = "Generate melodies per key, mood, and genre using isobar patterns"
    version = "0.3.0"
    input_schema = MelodyGeneratorInput

    async def execute(
        self,
        key: str = "A Minor",
        scale: str = "Natural Minor",
        mood: str = "dark",
        genre: str = "techno",
        length: int = 8,
        complexity: str = "simple",
        articulation: str = "auto",
        **kwargs,
    ) -> PluginResult:
        try:
            isobar_scale = _SCALE_NAMES.get(scale, Scale.minor)
            pitch_range = _MOOD_RANGE.get(mood, (60, 84))
            notes_per_bar = _NOTES_PER_BAR.get(genre, 8)
            total_notes = length * notes_per_bar

            if complexity == "simple":
                values = [0, 1, 2, 3, 4, 5, 6, 7]
                degree_pattern = PRandomWalk(values, min=0, max=7)
            else:
                degree_pattern = PMarkov(list(range(8)))

            degree_iter = itertools.islice(PDegree(degree_pattern, isobar_scale), total_notes)
            pitches = list(degree_iter)

            while len(pitches) < total_notes:
                fallback = [0, 2, 4, 5, 7, 9, 11]
                pitches.extend([fallback[i % 7] for i in range(total_notes - len(pitches))])
            pitches = pitches[:total_notes]

            pitches = [p + 60 for p in pitches]
            pitches = _map_range(pitches, pitch_range, genre, mood)

            durations = _duration_sequence(total_notes, genre)
            gate = resolve_gate_length(genre, articulation)
            velocities = _velocity_sequence(total_notes, notes_per_bar, mood, complexity, genre)

            notes_out = []
            current_beat = 1.0
            for i in range(total_notes):
                notes_out.append({
                    "pitch": pitches[i],
                    "velocity": velocities[i],
                    "start_beat": round(current_beat, 3),
                    "duration_in_beats": round(durations[i] * gate, 3),
                })
                current_beat += durations[i]

            return PluginResult(success=True, data={
                "notes": notes_out,
                "length_bars": length,
            })

        except Exception as e:
            logger.error("Melody generation failed: %s", e, exc_info=True)
            return PluginResult(success=False, data={}, error=str(e))


def _map_range(pitches: list[int], pitch_range: tuple[int, int], genre: str, mood: str) -> list[int]:
    lo, hi = pitch_range
    if not pitches:
        return []
    p_min = min(pitches)
    p_max = max(pitches)
    p_center = (p_min + p_max) / 2
    range_center = (lo + hi) / 2
    octave_adjust = 0
    if genre in ("dnb", "drum & bass"):
        octave_adjust += 1
    if mood in ("dark", "melancholic"):
        octave_adjust -= 1
    shift = round(range_center - p_center) + octave_adjust * 12
    mapped = []
    for p in pitches:
        note = p + shift
        note = max(lo, min(hi, note))
        mapped.append(int(note))
    return mapped


def _duration_sequence(total: int, genre: str) -> list[float]:
    if genre in ("dnb", "drum & bass"):
        return [0.25] * total
    if genre == "trance":
        return [0.125 if i % 3 == 0 else 0.25 for i in range(total)]
    if genre in ("house", "deep house"):
        return [0.5 if i % 4 == 0 else 0.25 for i in range(total)]
    return [0.5] * total


def _velocity_sequence(total: int, notes_per_bar: int, mood: str, complexity: str, genre: str = "house") -> list[int]:
    result = []
    for i in range(total):
        beat = (i % notes_per_bar) + 1
        if beat <= 2:
            base = 95 if mood in ("dark", "melancholic") else 105
        elif beat <= 4:
            base = 82 if mood in ("dark", "melancholic") else 92
        else:
            base = 78 if complexity == "simple" else 85
        result.append(max(30, min(127, base)))
    total_bars = total / max(1, notes_per_bar)
    for i, vel in enumerate(result):
        bar_idx = int(i / notes_per_bar)
        mult = resolve_phrase_multiplier(bar_idx, round(total_bars), genre)
        result[i] = max(30, min(127, round(vel * mult)))
    return result
