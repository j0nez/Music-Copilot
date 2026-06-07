from isobar import Scale

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

GATE_BY_ARTICULATION: dict[str, float] = {
    "legato": 0.95,
    "tenuto": 0.85,
    "staccato": 0.45,
    "staccatissimo": 0.25,
    "auto": 0.85,
}

GATE_BY_GENRE: dict[str, float] = {
    "house": 0.75,
    "techno": 0.40,
    "trance": 0.55,
    "melodic techno": 0.80,
    "deep house": 0.80,
    "progressive house": 0.70,
}


def resolve_gate_length(genre: str, articulation: str = "auto") -> float:
    if articulation != "auto":
        return GATE_BY_ARTICULATION.get(articulation, 0.85)
    return GATE_BY_GENRE.get(genre, 0.85)


def resolve_phrase_multiplier(bar_index: int, total_bars: int, genre: str = "house") -> float:
    if total_bars <= 1:
        return 1.0

    progress = bar_index / (total_bars - 1)

    if genre in ("techno",):
        valley = 0.85
    elif genre in ("trance", "melodic techno", "progressive house"):
        valley = 0.80
    else:
        valley = 0.87

    mid_point = 0.4

    if progress < mid_point:
        t = progress / mid_point
        multiplier = 1.0 - (1.0 - valley) * t
    else:
        t = (progress - mid_point) / (1.0 - mid_point)
        multiplier = valley + (1.05 - valley) * t

    return multiplier
