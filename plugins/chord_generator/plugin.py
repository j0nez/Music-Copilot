import logging
import random
from typing import Literal

from pydantic import BaseModel

from plugins.base import Plugin, PluginResult
from plugins.chord_generator.substitutions import (
    apply_substitution,
    maybe_add_secondary_dominant,
    maybe_deceptive_cadence,
)
from plugins.chord_generator.templates import get_fallback, get_templates

logger = logging.getLogger("music_copilot.chord_generator")

NOTE_TO_SEMITONE = {
    "C": 0, "C#": 1, "Db": 1,
    "D": 2, "D#": 3, "Eb": 3,
    "E": 4, "Fb": 4,
    "F": 5, "F#": 6, "Gb": 6,
    "G": 7, "G#": 8, "Ab": 8,
    "A": 9, "A#": 10, "Bb": 10,
    "B": 11, "Cb": 11,
}

SEMITONE_TO_NOTE = {v: k for k, v in NOTE_TO_SEMITONE.items()}

CHORD_INTERVALS = {
    "major": [0, 4, 7],
    "minor": [0, 3, 7],
    "diminished": [0, 3, 6],
    "augmented": [0, 4, 8],
    "major 7th": [0, 4, 7, 11],
    "minor 7th": [0, 3, 7, 10],
    "dominant 7th": [0, 4, 7, 10],
    "sus2": [0, 2, 7],
    "sus4": [0, 5, 7],
}

DIATONIC_QUALITIES_MAJOR = ["major", "minor", "minor", "major", "major", "minor", "diminished"]
DIATONIC_QUALITIES_MINOR = ["minor", "diminished", "major", "minor", "minor", "major", "major"]

ROMAN_SCALE = ["i", "ii", "iii", "iv", "v", "vi", "vii"]

# Keys with their accidentals for enharmonic correctness
# Format: (note, semitone) for each scale degree
MAJOR_SCALE_SEMITONES = [0, 2, 4, 5, 7, 9, 11]
NATURAL_MINOR_SEMITONES = [0, 2, 3, 5, 7, 8, 10]

ACCIDENTAL_PREFERENCES: dict[str, str] = {
    "C": "C", "G": "G", "D": "D", "A": "A", "E": "E", "B": "B",
    "F#": "F#", "C#": "C#",
    "F": "F", "Bb": "Bb", "Eb": "Eb", "Ab": "Ab", "Db": "Db", "Gb": "Gb",
    "Cb": "Cb",
}


class ChordGeneratorInput(BaseModel):
    key: str = "C Major"
    mood: str = "uplifting"
    genre: str = "house"
    length: int = 4
    complexity: str = "simple"


class ChordGeneratorPlugin(Plugin):
    name = "chord_generator"
    description = "Generate chord progressions by key, mood, and genre using music theory rules"
    version = "0.1.0"
    input_schema = ChordGeneratorInput

    def _parse_key(self, raw: str) -> tuple[str, str]:
        parts = raw.strip().split()
        if len(parts) == 1:
            return parts[0], "major"
        if len(parts) == 2:
            root = parts[0]
            mode = parts[1].lower()
            return root, mode
        if parts[-1].lower() in ("major", "minor"):
            root = " ".join(parts[:-1])
            mode = parts[-1].lower()
            return root, mode
        return parts[0], "major"

    def _note_to_semitone(self, note: str) -> int:
        return NOTE_TO_SEMITONE.get(note, 0)

    def _semitone_to_note(self, semitone: int, prefer: str = "C") -> str:
        normalized = semitone % 12
        note = SEMITONE_TO_NOTE.get(normalized, "C")
        if normalized in ACCIDENTAL_PREFERENCES.values():
            for pref_key, pref_val in ACCIDENTAL_PREFERENCES.items():
                if pref_val == note:
                    return pref_key
        return note

    def _normalize_note(self, note: str) -> str:
        raw = note.rstrip("0123456789")
        raw = raw.replace("-", "b")
        return raw

    def _get_mode_from_key_name(self, key: str) -> str:
        _, mode = self._parse_key(key)
        return mode

    async def execute(self, **kwargs) -> PluginResult:
        try:
            key = kwargs.get("key", "C Major")
            mood = kwargs.get("mood", "uplifting").lower()
            genre = kwargs.get("genre", "house")
            length = kwargs.get("length", 4)
            complexity = kwargs.get("complexity", "simple")

            if length not in (4, 8, 16):
                length = 4
            if complexity not in ("simple", "advanced"):
                complexity = "simple"

            root, mode = self._parse_key(key)
            is_minor = mode == "minor"
            scale_semitones = NATURAL_MINOR_SEMITONES if is_minor else MAJOR_SCALE_SEMITONES

            root_idx = self._note_to_semitone(root)
            scale_notes = []
            for interval in scale_semitones:
                note = self._semitone_to_note(root_idx + interval, root)
                scale_notes.append(note)

            templates = get_templates(mode, mood)
            if not templates:
                templates = [get_fallback(mode)]

            template = random.choice(templates)
            roman_list = list(template)

            if length > len(roman_list):
                repeats = (length // len(roman_list)) + 1
                roman_list = (roman_list * repeats)[:length]
            elif length < len(roman_list):
                roman_list = roman_list[:length]

            if complexity == "advanced":
                roman_list = maybe_add_secondary_dominant(roman_list)
                roman_list = maybe_deceptive_cadence(roman_list)
                roman_list = [apply_substitution(r, complexity) for r in roman_list]

            qualities = DIATONIC_QUALITIES_MINOR if is_minor else DIATONIC_QUALITIES_MAJOR

            chords = []
            for roman in roman_list:
                lower = roman.lower().strip("°")
                alt = lower.replace("b", "").replace("#", "")
                if alt in ROMAN_SCALE:
                    degree = ROMAN_SCALE.index(alt)
                    chord_root = scale_notes[degree]
                    quality = qualities[degree]
                    root_semi = self._note_to_semitone(chord_root)
                    chord_notes = []
                    for interval in CHORD_INTERVALS[quality]:
                        chord_notes.append(self._semitone_to_note(root_semi + interval, chord_root))
                    chords.append({
                        "roman": roman,
                        "name": chord_root,
                        "notes": chord_notes,
                        "quality": quality,
                    })
                elif roman.startswith("b") or roman.startswith("#"):
                    alt_root = roman[0] + roman[1:].lower().strip("°")
                    alt_clean = alt_root.replace("b", "").replace("#", "")
                    if alt_clean in ROMAN_SCALE:
                        degree = ROMAN_SCALE.index(alt_clean)
                        base_note = scale_notes[degree]
                        base_semi = self._note_to_semitone(base_note)
                        if roman.startswith("b"):
                            adjusted_semi = base_semi - 1
                        else:
                            adjusted_semi = base_semi + 1
                        chord_root = self._semitone_to_note(adjusted_semi, base_note)
                        quality = qualities[degree]
                        root_semi = self._note_to_semitone(chord_root)
                        chord_notes = []
                        for interval in CHORD_INTERVALS[quality]:
                            chord_notes.append(self._semitone_to_note(root_semi + interval, chord_root))
                        chords.append({
                            "roman": roman,
                            "name": chord_root,
                            "notes": chord_notes,
                            "quality": quality,
                        })
                elif "/" in roman:
                    base_roman = roman.split("/")[0]
                    lower_base = base_roman.lower().strip("°")
                    alt = lower_base.replace("b", "").replace("#", "")
                    if alt in ROMAN_SCALE:
                        degree = ROMAN_SCALE.index(alt)
                        chord_root = scale_notes[degree]
                        quality = qualities[degree]
                        root_semi = self._note_to_semitone(chord_root)
                        chord_notes = []
                        for interval in CHORD_INTERVALS[quality]:
                            chord_notes.append(self._semitone_to_note(root_semi + interval, chord_root))
                        chords.append({
                            "roman": roman,
                            "name": chord_root,
                            "notes": chord_notes,
                            "quality": quality,
                        })
                    else:
                        chords.append({"roman": roman, "name": "?", "notes": [], "quality": ""})
                else:
                    chords.append({"roman": roman, "name": "?", "notes": [], "quality": ""})

            return PluginResult(
                success=True,
                data={
                    "key": key,
                    "chords": chords,
                    "mood": mood.lower(),
                    "genre": genre,
                    "length": len(chords),
                },
            )
        except Exception as e:
            logger.error("Chord generator failed: %s", e, exc_info=True)
            return PluginResult(success=False, data={}, error=str(e))
