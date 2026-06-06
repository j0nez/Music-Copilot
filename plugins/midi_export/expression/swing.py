import logging

logger = logging.getLogger("music_copilot.swing")


def apply_swing(
    notes: list[dict],
    swing_amount: float = 0.30,
) -> list[dict]:
    if swing_amount <= 0:
        return notes

    swung = []
    for note in notes:
        beat_pos = note["start_beat"] % 1.0
        sixteenth_index = int(beat_pos * 4)
        if sixteenth_index in (1, 3):
            note = {**note, "start_beat": note["start_beat"] + swing_amount * 0.25}
        swung.append(note)

    return swung


SWING_PRESETS: dict[str, float] = {
    "house": 0.30,
    "techno": 0.20,
    "dnb": 0.40,
    "drum & bass": 0.40,
    "deep house": 0.35,
    "trance": 0.15,
    "melodic techno": 0.25,
}
