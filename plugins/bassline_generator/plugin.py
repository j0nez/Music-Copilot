import itertools
import logging

from isobar import PDegree, PRandomWalk, PSequence, Scale
from pydantic import BaseModel

from backend.app.services.midi.theory import _resolve_phrase_multiplier, resolve_gate_length
from plugins.base import Plugin, PluginResult

logger = logging.getLogger("music_copilot.bassline_generator")

GENRE_PATTERNS: dict[str, str] = {
    "techno": "root_fifth",
    "house": "walking",
    "trance": "octave_jump",
    "deep house": "walking",
    "dnb": "syncopated",
    "drum & bass": "syncopated",
    "melodic techno": "root_fifth",
}


class BasslineGeneratorInput(BaseModel):
    key: str = "A Minor"
    scale: str = "Natural Minor"
    genre: str = "techno"
    length: int = 8
    pattern: str = "auto"
    articulation: str = "auto"


_SCALE_NAMES: dict[str, Scale] = {
    "Natural Minor": Scale.minor,
    "Harmonic Minor": Scale([0, 2, 3, 5, 7, 8, 11]),
    "Melodic Minor": Scale([0, 2, 3, 5, 7, 9, 11]),
    "Major": Scale.major,
    "Dorian": Scale.dorian,
    "Phrygian": Scale.phrygian,
    "Lydian": Scale.lydian,
    "Mixolydian": Scale.mixolydian,
    "Locrian": Scale.locrian,
    "Pentatonic Major": Scale.majorPenta,
    "Pentatonic Minor": Scale.minorPenta,
}

_OCTAVE_FOR_GENRE: dict[str, int] = {
    "techno": 2,
    "dnb": 2,
    "drum & bass": 2,
    "trance": 2,
    "house": 3,
    "deep house": 3,
    "melodic techno": 2,
}


class BasslineGeneratorPlugin(Plugin):
    name = "bassline_generator"
    description = "Generate basslines per genre using isobar patterns"
    version = "0.2.0"
    input_schema = BasslineGeneratorInput

    async def execute(
        self,
        key: str = "A Minor",
        scale: str = "Natural Minor",
        genre: str = "techno",
        length: int = 8,
        pattern: str = "auto",
        articulation: str = "auto",
        **kwargs,
    ) -> PluginResult:
        try:
            isobar_scale = _SCALE_NAMES.get(scale, Scale.minor)
            octave = _OCTAVE_FOR_GENRE.get(genre, 2)

            pattern_type = pattern if pattern != "auto" else GENRE_PATTERNS.get(genre, "root_fifth")
            notes_per_bar = _notes_per_bar(genre)
            total_notes = length * notes_per_bar

            deg_values = _build_degree_pattern(pattern_type, total_notes)
            degree_iter = itertools.islice(PDegree(deg_values, isobar_scale), total_notes)
            pitches = list(degree_iter)

            while len(pitches) < total_notes:
                pitches.append(pitches[-1] if pitches else 24)
            pitches = pitches[:total_notes]

            pitches = [p + octave * 12 for p in pitches]
            pitches = [max(24, min(72, int(p))) for p in pitches]

            durations = _duration_sequence(total_notes, genre)
            gate = resolve_gate_length(genre, articulation)

            notes_out = []
            current_beat = 1.0
            for i in range(total_notes):
                velocity = _bass_velocity(i, notes_per_bar, genre, total_notes, length)
                notes_out.append({
                    "pitch": pitches[i],
                    "velocity": velocity,
                    "start_beat": round(current_beat, 3),
                    "duration_in_beats": round(durations[i] * gate, 3),
                })
                current_beat += durations[i]

            return PluginResult(success=True, data={
                "notes": notes_out,
                "length_bars": length,
            })

        except Exception as e:
            logger.error("Bassline generation failed: %s", e, exc_info=True)
            return PluginResult(success=False, data={}, error=str(e))


def _build_degree_pattern(pattern_type: str, total: int):
    if pattern_type == "walking":
        return PRandomWalk([0, 1, 2, 3, 4, 5, 6, 7], min=0, max=7)
    elif pattern_type == "octave_jump":
        return PSequence([0, 7], repeats=-1)
    elif pattern_type == "syncopated":
        return PRandomWalk([0, 2, 4, 5, 7], min=0, max=7)
    else:
        return PRandomWalk([0, 0, 4, 4], min=0, max=7)


def _notes_per_bar(genre: str) -> int:
    if genre in ("dnb", "drum & bass"):
        return 4
    if genre in ("house", "deep house"):
        return 4
    return 2


def _duration_sequence(total: int, genre: str) -> list[float]:
    if genre in ("house", "deep house", "dnb", "drum & bass"):
        return [1.0] * total
    if genre == "trance":
        return [0.5] * total
    return [2.0] * total


def _bass_velocity(index: int, notes_per_bar: int, genre: str, total_notes: int, total_bars: int) -> int:
    beat = (index % notes_per_bar) + 1
    if beat == 1:
        base = 105
    elif beat == 3:
        base = 95 if genre in ("house", "deep house") else 100
    elif genre in ("dnb", "drum & bass"):
        base = 80
    else:
        base = 85
    bar_idx = int(index / max(1, notes_per_bar))
    mult = _resolve_phrase_multiplier(bar_idx, total_bars, genre)
    return max(30, min(127, round(base * mult)))
