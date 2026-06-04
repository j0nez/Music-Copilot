import logging
import uuid
from pathlib import Path

import pretty_midi

from backend.app.core.config import settings

logger = logging.getLogger("music_copilot.midi")

NOTE_TO_SEMITONE = {
    "C": 0, "C#": 1, "Db": 1,
    "D": 2, "D#": 3, "Eb": 3,
    "E": 4, "Fb": 4,
    "F": 5, "F#": 6, "Gb": 6,
    "G": 7, "G#": 8, "Ab": 8,
    "A": 9, "A#": 10, "Bb": 10,
    "B": 11, "Cb": 11,
}


def _note_name_to_midi(note: str, octave: int = 4) -> int:
    raw = note.rstrip("0123456789")
    semitone = NOTE_TO_SEMITONE.get(raw)
    if semitone is None:
        semitone = 0
    return 12 * (octave + 1) + semitone


def generate_midi(
    key: str,
    chords: list[dict],
    bpm: int = 120,
    bars_per_chord: int = 1,
    root_octave: int = 4,
) -> Path:
    midi = pretty_midi.PrettyMIDI(initial_tempo=float(bpm))
    piano = pretty_midi.Instrument(program=0)

    beats_per_bar = 4
    seconds_per_beat = 60.0 / bpm
    seconds_per_chord = bars_per_chord * beats_per_bar * seconds_per_beat

    current_time = 0.0

    for chord in chords:
        notes = chord.get("notes", [])
        if not notes:
            current_time += seconds_per_chord
            continue

        midi_notes = []
        for n in notes:
            note_num = _note_name_to_midi(n, root_octave)
            if midi_notes and note_num <= midi_notes[-1]:
                note_num += 12
            midi_notes.append(note_num)

        for note_num in midi_notes:
            pm_note = pretty_midi.Note(
                velocity=80,
                pitch=note_num,
                start=current_time,
                end=current_time + seconds_per_chord * 0.95,
            )
            piano.notes.append(pm_note)

        current_time += seconds_per_chord

    midi.instruments.append(piano)

    settings.export_dir.mkdir(parents=True, exist_ok=True)
    stem = uuid.uuid4().hex[:12]
    dest = settings.export_dir / f"{stem}.mid"
    midi.write(str(dest))
    logger.info("MIDI written: %s (%d chords, %d bpm)", dest.name, len(chords), bpm)
    return dest
