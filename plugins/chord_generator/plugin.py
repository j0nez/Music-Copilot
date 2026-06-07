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
from shared.music_theory import (
    NOTE_TO_SEMITONE,
    SEMITONE_TO_NOTE as SHARED_SEMITONE_TO_NOTE,
    CHORD_INTERVALS,
    DIATONIC_QUALITIES_MAJOR,
    DIATONIC_QUALITIES_MINOR,
)

logger = logging.getLogger("music_copilot.chord_generator")

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
        note = SHARED_SEMITONE_TO_NOTE.get(normalized, "C")
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

    def _note_name_to_midi(self, note_name: str, octave: int = 4) -> int:
        raw = note_name.rstrip("0123456789")
        raw = raw.replace("-", "b")
        return self._note_to_semitone(raw) + (octave + 1) * 12

    def _score_voice_leading(self, chords: list[dict]) -> dict:
        from music21 import voiceLeading, note as m21note
        total_score = 0
        max_score = 0
        issues: list[str] = []

        for i in range(1, len(chords)):
            prev = chords[i - 1]
            curr = chords[i]
            prev_notes = sorted(prev.get("notes", []), key=lambda n: self._note_name_to_midi(n, 4))
            curr_notes = sorted(curr.get("notes", []), key=lambda n: self._note_name_to_midi(n, 4))
            pairs = min(len(prev_notes), len(curr_notes))
            if pairs < 2:
                continue
            max_score += 2

            has_parallel_fifth = False
            has_parallel_octave = False
            has_contrary = False

            for v in range(pairs - 1):
                try:
                    vlq = voiceLeading.VoiceLeadingQuartet(
                        m21note.Note(prev_notes[v + 1] + "4"),
                        m21note.Note(curr_notes[v + 1] + "4"),
                        m21note.Note(prev_notes[v] + "3"),
                        m21note.Note(curr_notes[v] + "3"),
                    )
                    if vlq.parallelFifth():
                        has_parallel_fifth = True
                        issues.append(f"{prev.get('roman', '?')}→{curr.get('roman', '?')}: parallel 5th")
                    if vlq.parallelOctave():
                        has_parallel_octave = True
                        issues.append(f"{prev.get('roman', '?')}→{curr.get('roman', '?')}: parallel octave")
                    mt = vlq.motionType()
                    if str(mt) in ("MotionType.contrary", "contrary"):
                        has_contrary = True
                except Exception:
                    continue

            if has_contrary and not has_parallel_fifth and not has_parallel_octave:
                total_score += 2
            elif has_contrary:
                total_score += 1
            if has_parallel_fifth or has_parallel_octave:
                total_score -= 1

        normalized = max(0, min(100, int((total_score / max(1, max_score)) * 100))) if max_score else 50
        return {"score": normalized, "issues": issues}

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

            vl = self._score_voice_leading(chords)
            return PluginResult(
                success=True,
                data={
                    "key": key,
                    "chords": chords,
                    "mood": mood.lower(),
                    "genre": genre,
                    "length": len(chords),
                    "voice_leading": vl,
                },
            )
        except Exception as e:
            logger.error("Chord generator failed: %s", e, exc_info=True)
            return PluginResult(success=False, data={}, error=str(e))
