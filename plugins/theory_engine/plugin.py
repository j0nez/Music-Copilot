import logging
from typing import Literal

from music21 import interval, pitch, scale as m21_scale
from pydantic import BaseModel

from plugins.base import Plugin, PluginResult

logger = logging.getLogger("music_copilot.theory_engine")

NOTE_TO_SEMITONE = {
    "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3,
    "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8,
    "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11,
}
SEMITONE_TO_NOTE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

INTERVAL_NAMES = {
    0: "Root",
    1: "Minor 2nd",
    2: "Major 2nd",
    3: "Minor 3rd",
    4: "Major 3rd",
    5: "Perfect 4th",
    6: "Tritone",
    7: "Perfect 5th",
    8: "Minor 6th",
    9: "Major 6th",
    10: "Minor 7th",
    11: "Major 7th",
}

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

SCALE_CLASSES = {
    "major": m21_scale.MajorScale,
    "natural minor": m21_scale.MinorScale,
    "harmonic minor": m21_scale.HarmonicMinorScale,
    "melodic minor": m21_scale.MelodicMinorScale,
    "dorian": m21_scale.DorianScale,
    "phrygian": m21_scale.PhrygianScale,
    "lydian": m21_scale.LydianScale,
    "mixolydian": m21_scale.MixolydianScale,
    "locrian": m21_scale.LocrianScale,
}

MANUAL_SCALES = {
    "pentatonic major": [0, 2, 4, 7, 9],
    "pentatonic minor": [0, 3, 5, 7, 10],
}

DIATONIC_QUALITIES_MAJOR = ["major", "minor", "minor", "major", "major", "minor", "diminished"]
DIATONIC_QUALITIES_MINOR = ["minor", "diminished", "major", "minor", "minor", "major", "major"]

PROGRESSIONS = {
    ("major", "uplifting"): ["I", "V", "vi", "IV"],
    ("major", "emotional"): ["vi", "IV", "I", "V"],
    ("major", "energetic"): ["I", "IV", "V", "IV"],
    ("major", "melancholic"): ["I", "iii", "IV", "V"],
    ("major", "dark"): ["i", "VII", "VI", "VII"],
    ("minor", "dark"): ["i", "VII", "VI", "VII"],
    ("minor", "melancholic"): ["i", "iv", "VII", "i"],
    ("minor", "uplifting"): ["i", "VI", "VII", "i"],
    ("minor", "energetic"): ["i", "VII", "VI", "VII"],
    ("minor", "emotional"): ["i", "VI", "III", "VII"],
}

ROMAN_SCALE = ["i", "ii", "iii", "iv", "v", "vi", "vii"]


class TheoryEngineInput(BaseModel):
    mode: Literal["scale", "chord", "interval", "progression"]
    key: str = "C"
    scale_type: str = "major"
    root: str = "C"
    chord_quality: str = "major"
    note1: str = "C"
    note2: str = "E"
    mood: str = "uplifting"
    genre: str = "house"


class TheoryEnginePlugin(Plugin):
    name = "theory_engine"
    description = "Music theory tools: scales, chords, intervals, and chord progressions"
    version = "0.1.0"
    input_schema = TheoryEngineInput

    async def execute(self, **kwargs) -> PluginResult:
        try:
            mode = kwargs.get("mode")
            if mode == "scale":
                return self._generate_scale(
                    kwargs.get("key", "C"),
                    kwargs.get("scale_type", "major"),
                )
            elif mode == "chord":
                return self._build_chord(
                    kwargs.get("root", "C"),
                    kwargs.get("chord_quality", "major"),
                )
            elif mode == "interval":
                return self._analyze_interval(
                    kwargs.get("note1", "C"),
                    kwargs.get("note2", "E"),
                )
            elif mode == "progression":
                return self._generate_progression(
                    kwargs.get("key", "C"),
                    kwargs.get("mood", "uplifting"),
                    kwargs.get("genre", "house"),
                )
            return PluginResult(success=False, data={}, error=f"Unknown mode: {mode}")
        except Exception as e:
            logger.error("Theory engine failed: %s", e, exc_info=True)
            return PluginResult(success=False, data={}, error=str(e))

    def _normalize_note(self, name: str) -> str:
        return name.replace("-", "b").rstrip("0123456789")

    def _note_to_semitone(self, note: str) -> int:
        return NOTE_TO_SEMITONE.get(note, 0)

    def _semitone_to_note(self, semitone: int) -> str:
        return SEMITONE_TO_NOTE[semitone % 12]

    def _parse_key(self, key_str: str) -> tuple[str, str]:
        parts = key_str.strip().split()
        if len(parts) >= 2 and parts[-1].lower() in ("major", "minor"):
            return " ".join(parts[:-1]), parts[-1].lower()
        return parts[0], "major"

    def _generate_scale(self, key: str, scale_type: str) -> PluginResult:
        scale_type_lower = scale_type.lower()

        manual = MANUAL_SCALES.get(scale_type_lower)
        if manual is not None:
            root_idx = self._note_to_semitone(key)
            note_names = [self._semitone_to_note(root_idx + i) for i in manual]
            interval_labels = [INTERVAL_NAMES[i] for i in manual]
            return PluginResult(
                success=True,
                data={
                    "key": key,
                    "scale": scale_type,
                    "notes": note_names,
                    "intervals": interval_labels,
                },
            )

        scale_cls = SCALE_CLASSES.get(scale_type_lower)
        if scale_cls is None:
            return PluginResult(
                success=False, data={}, error=f"Unknown scale type: {scale_type}"
            )

        try:
            s = scale_cls(key)
            pitches = s.pitches
            note_names = [self._normalize_note(str(p)) for p in pitches][:-1]

            root_semitone = pitch.Pitch(key).ps % 12
            intervals = []
            for note_name in note_names:
                n = pitch.Pitch(note_name)
                diff = int(round((n.ps % 12 - root_semitone) % 12))
                intervals.append(INTERVAL_NAMES.get(diff, f"?{diff}"))

            return PluginResult(
                success=True,
                data={
                    "key": key,
                    "scale": scale_type,
                    "notes": note_names,
                    "intervals": intervals,
                },
            )
        except Exception as e:
            return PluginResult(success=False, data={}, error=str(e))

    def _build_chord(self, root: str, quality: str) -> PluginResult:
        q = quality.lower()
        if q not in CHORD_INTERVALS:
            return PluginResult(
                success=False, data={}, error=f"Unknown chord quality: {quality}"
            )

        root_idx = self._note_to_semitone(root)
        chord_notes = []
        for interval in CHORD_INTERVALS[q]:
            chord_notes.append(self._semitone_to_note(root_idx + interval))

        return PluginResult(
            success=True,
            data={
                "root": root,
                "quality": quality,
                "notes": chord_notes,
                "function": None,
            },
        )

    def _analyze_interval(self, note1: str, note2: str) -> PluginResult:
        try:
            p1 = pitch.Pitch(note1)
            p2 = pitch.Pitch(note2)
            iv = interval.Interval(p1, p2)
            return PluginResult(
                success=True,
                data={
                    "note1": note1,
                    "note2": note2,
                    "interval": iv.name,
                    "semitones": iv.semitones,
                },
            )
        except Exception as e:
            return PluginResult(success=False, data={}, error=str(e))

    def _generate_progression(self, key: str, mood: str, genre: str) -> PluginResult:
        root, mode = self._parse_key(key)
        is_minor = mode == "minor"

        prog_key = (mode, mood.lower())
        roman_list = PROGRESSIONS.get(prog_key)
        if roman_list is None:
            roman_list = PROGRESSIONS.get(("minor" if is_minor else "major", "uplifting"))

        scale_cls = SCALE_CLASSES.get("natural minor" if is_minor else "major")
        try:
            s = scale_cls(root)
            pitches = s.pitches
            scale_notes = [self._normalize_note(str(p)) for p in pitches][:-1]
        except Exception:
            scale_intervals = [0, 2, 3, 5, 7, 8, 10] if is_minor else [0, 2, 4, 5, 7, 9, 11]
            root_idx = self._note_to_semitone(root)
            scale_notes = [self._semitone_to_note(root_idx + i) for i in scale_intervals]

        qualities = DIATONIC_QUALITIES_MINOR if is_minor else DIATONIC_QUALITIES_MAJOR

        chords = []
        for roman in roman_list:
            lower = roman.lower().strip("°")
            if lower in ROMAN_SCALE:
                degree = ROMAN_SCALE.index(lower)
                chord_root = scale_notes[degree]
                quality = qualities[degree]
                root_idx = self._note_to_semitone(chord_root)
                chord_notes = []
                for i in CHORD_INTERVALS[quality]:
                    chord_notes.append(self._semitone_to_note(root_idx + i))
                chords.append({
                    "roman": roman,
                    "name": chord_root,
                    "notes": chord_notes,
                    "quality": quality,
                })
            else:
                chords.append({"roman": roman, "name": "?", "notes": [], "quality": ""})

        return PluginResult(
            success=True,
            data={
                "key": f"{root} {mode}",
                "chords": chords,
                "mood": mood,
                "genre": genre,
            },
        )
