import math

CHORD_TONE_WEIGHTS: dict[str, float] = {
    "root": 1.0,
    "third": 0.88,
    "fifth": 0.76,
    "seventh": 0.92,
    "ninth": 0.82,
    "sus2": 0.90,
    "sus4": 0.95,
}

BEAT_WEIGHTS: dict[int, float] = {
    1: 1.0,
    2: 0.78,
    3: 0.88,
    4: 0.72,
}

GENRE_BEAT_MODIFIERS: dict[str, dict[int, float]] = {
    "house": {1: 1.0, 2: 0.92, 3: 0.95, 4: 0.88},
    "techno": {1: 1.0, 2: 0.72, 3: 0.92, 4: 0.68},
    "trance": {1: 1.0, 2: 0.82, 3: 0.96, 4: 0.78},
    "melodic techno": {1: 1.0, 2: 0.80, 3: 0.90, 4: 0.75},
    "deep house": {1: 1.0, 2: 0.88, 3: 0.92, 4: 0.85},
    "progressive house": {1: 1.0, 2: 0.84, 3: 0.94, 4: 0.80},
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

CHORD_TONE_ROLES: list[tuple[int, str]] = [
    (0, "root"),
    (4, "third"),
    (7, "fifth"),
    (11, "seventh"),
    (14, "ninth"),
]

from shared.music_theory import NOTE_TO_SEMITONE, SEMITONE_TO_NOTE


def note_name_to_semitone(note: str) -> int:
    raw = note.rstrip("0123456789")
    return NOTE_TO_SEMITONE.get(raw, 0)


def semitone_to_midi(semitone: int, octave: int = 4) -> int:
    return 12 * (octave + 1) + (semitone % 12)


def note_name_to_midi(note: str, octave: int = 4) -> int:
    raw = note.rstrip("0123456789")
    semitone = NOTE_TO_SEMITONE.get(raw, 0)
    return 12 * (octave + 1) + semitone


def _get_tone_role(note_name: str, root_semitone: int) -> str:
    note_semi = note_name_to_semitone(note_name)
    interval = (note_semi - root_semitone) % 12
    for semi, role in CHORD_TONE_ROLES:
        if interval == semi:
            return role
    if interval == 2:
        return "sus2"
    if interval == 5:
        return "sus4"
    if interval in (1, 3, 6, 8, 10):
        return "third"
    return "fifth"


def resolve_velocity(
    note_name: str,
    chord_root: str,
    chord_quality: str,
    beat_in_bar: int,
    bar_index: int,
    total_bars: int,
    genre: str = "house",
    mood: str = "uplifting",
    base_velocity: int = 100,
) -> int:
    root_semi = note_name_to_semitone(chord_root)
    role = _get_tone_role(note_name, root_semi)
    tone_weight = CHORD_TONE_WEIGHTS.get(role, 0.85)

    beat_modifier = GENRE_BEAT_MODIFIERS.get(genre, BEAT_WEIGHTS).get(beat_in_bar, 0.85)
    beat_weight = BEAT_WEIGHTS.get(beat_in_bar, 0.85) * beat_modifier

    phrase_mult = _resolve_phrase_multiplier(bar_index, total_bars, genre)

    mood_modifier = 1.05 if mood == "uplifting" else 0.95 if mood in ("dark", "melancholic") else 1.0

    velocity = base_velocity * tone_weight * beat_weight * phrase_mult * mood_modifier

    if chord_quality in ("dominant 7th", "diminished", "augmented"):
        velocity *= 1.05
    elif chord_quality in ("sus2", "sus4"):
        velocity *= 0.95

    velocity = max(30, min(127, round(velocity)))
    return velocity


def _resolve_phrase_multiplier(bar_index: int, total_bars: int, genre: str = "house") -> float:
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


def resolve_gate_length(genre: str, articulation: str = "auto") -> float:
    if articulation != "auto":
        return GATE_BY_ARTICULATION.get(articulation, 0.85)
    return GATE_BY_GENRE.get(genre, 0.85)


def resolve_voicing(notes: list[str], root: str, style: str = "close") -> list[int]:
    root_semi = note_name_to_semitone(root)
    midi_notes = [note_name_to_midi(n, 4) for n in notes]

    if style == "close" or len(notes) <= 3:
        result = []
        for n in midi_notes:
            if result and n <= result[-1]:
                n += 12
            result.append(n)
        return result

    if style == "drop2" and len(notes) == 4:
        result = [midi_notes[0]]
        second = midi_notes[1] - 12
        if second < result[-1]:
            second += 12
        result.append(second)
        for n in midi_notes[2:]:
            while n <= result[-1]:
                n += 12
            result.append(n)
        return result

    if style == "open":
        result = []
        for i, n in enumerate(midi_notes):
            octave = 4 + (i // 3) if i > 0 else 4
            note = n - 12 + (octave - 4) * 12
            if result and note <= result[-1]:
                note += 12
            result.append(note)
        return result

    result = [midi_notes[0]]
    for n in midi_notes[1:]:
        while n <= result[-1]:
            n += 12
        result.append(n)
    return result


def resolve_arpeggiation(
    notes: list[str],
    root: str,
    pattern: str,
    beats: float,
    base_velocity: int,
    genre: str,
) -> list[dict]:
    root_semi = note_name_to_semitone(root)
    midi_pitches = resolve_voicing(notes, root, "close")

    if pattern == "up":
        order = list(range(len(midi_pitches)))
    elif pattern == "down":
        order = list(range(len(midi_pitches) - 1, -1, -1))
    elif pattern == "updown":
        order = list(range(len(midi_pitches))) + list(range(len(midi_pitches) - 2, -1, -1))
    elif pattern == "trance":
        repeats = max(1, int(beats / 0.25))
        order = [i % len(midi_pitches) for i in range(repeats)]
    else:
        order = list(range(len(midi_pitches)))

    beat_division = beats / len(order) if order else beats
    gate = GATE_BY_GENRE.get(genre, 0.75)
    if genre == "trance":
        gate = 0.45

    result = []
    for step_idx, pitch_idx in enumerate(order):
        pitch = midi_pitches[pitch_idx % len(midi_pitches)]
        start = step_idx * beat_division
        dur = beat_division * gate

        note_name = notes[pitch_idx % len(notes)]
        role = _get_tone_role(note_name, root_semi)
        tone_weight = CHORD_TONE_WEIGHTS.get(role, 0.85)

        if pattern == "trance":
            accent = 1.0 + 0.15 * math.sin(step_idx * math.pi / 4)
        elif pattern == "updown":
            mid = len(order) // 2
            accent = 1.0 - 0.15 * abs(step_idx - mid) / mid if mid else 1.0
        else:
            accent = 1.0

        velocity = max(40, min(127, round(base_velocity * tone_weight * accent)))

        result.append({
            "pitch": pitch,
            "velocity": velocity,
            "start_beat": start,
            "duration_beats": dur,
        })

    return result
