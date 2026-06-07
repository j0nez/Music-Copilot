NOTE_TO_SEMITONE: dict[str, int] = {
    "C": 0, "C#": 1, "Db": 1,
    "D": 2, "D#": 3, "Eb": 3,
    "E": 4, "Fb": 4,
    "F": 5, "F#": 6, "Gb": 6,
    "G": 7, "G#": 8, "Ab": 8,
    "A": 9, "A#": 10, "Bb": 10,
    "B": 11, "Cb": 11,
}

SEMITONE_TO_NOTE_LIST: list[str] = [
    "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
]

SEMITONE_TO_NOTE: dict[int, str] = {
    0: "C", 1: "C#", 2: "D", 3: "Eb",
    4: "E", 5: "F", 6: "F#", 7: "G",
    8: "Ab", 9: "A", 10: "Bb", 11: "B",
}

CHORD_INTERVALS: dict[str, list[int]] = {
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

DIATONIC_QUALITIES_MAJOR: list[str] = ["major", "minor", "minor", "major", "major", "minor", "diminished"]
DIATONIC_QUALITIES_MINOR: list[str] = ["minor", "diminished", "major", "minor", "minor", "major", "major"]
