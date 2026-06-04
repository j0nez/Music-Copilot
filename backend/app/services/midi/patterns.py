from backend.app.services.midi.models import MidiFile, MidiTrack, MidiNote
from backend.app.services.midi.theory import (
    resolve_velocity,
    resolve_voicing,
    resolve_arpeggiation,
    resolve_gate_length,
    note_name_to_semitone,
)


def progression_to_midi(
    chords: list[dict],
    bpm: int = 120,
    bars_per_chord: int = 1,
    beat_division: int = 1,
    style: str = "block",
    voicing: str = "close",
    articulation: str = "auto",
    genre: str = "house",
    mood: str = "uplifting",
    arpeggio_pattern: str = "up",
    base_velocity: int = 100,
) -> MidiFile:
    if style == "block":
        return _block_chords(
            chords, bpm, bars_per_chord, beat_division,
            voicing, articulation, genre, mood, base_velocity,
        )
    if style in ("arpeggio", "broken"):
        return _arpeggiated_chords(
            chords, bpm, bars_per_chord, arpeggio_pattern,
            articulation, genre, base_velocity,
        )
    if style == "full":
        return _full_arrangement(
            chords, bpm, bars_per_chord, beat_division,
            voicing, articulation, arpeggio_pattern, genre, mood, base_velocity,
        )
    return _block_chords(
        chords, bpm, bars_per_chord, beat_division,
        voicing, articulation, genre, mood, base_velocity,
    )


def _block_chords(
    chords: list[dict],
    bpm: int,
    bars_per_chord: int,
    beat_division: int,
    voicing: str,
    articulation: str,
    genre: str,
    mood: str,
    base_velocity: int,
) -> MidiFile:
    track = MidiTrack(program=0)
    beats_per_bar = 4
    total_bars = len(chords) * bars_per_chord

    current_beat = 0.0

    for chord_idx, chord in enumerate(chords):
        notes = chord.get("notes", [])
        root = chord.get("name", "C").replace("m", "").replace("dim", "").replace("aug", "")
        if not root:
            root = "C"
        root = root[0].upper()
        quality = chord.get("quality", "major")

        block_beats = bars_per_chord * beats_per_bar
        chord_start_beat = current_beat
        midi_notes = resolve_voicing(notes, root, voicing)
        gate = resolve_gate_length(genre, articulation)
        note_duration = block_beats * gate

        bar_index = chord_idx * bars_per_chord

        for note_idx, pitch in enumerate(midi_notes):
            note_name = notes[note_idx % len(notes)]
            beat_in_bar = int(chord_start_beat % 4) + 1
            vel = resolve_velocity(
                note_name=note_name,
                chord_root=root,
                chord_quality=quality,
                beat_in_bar=beat_in_bar,
                bar_index=bar_index,
                total_bars=total_bars,
                genre=genre,
                mood=mood,
                base_velocity=base_velocity,
            )
            track.notes.append(MidiNote(
                pitch=pitch,
                velocity=vel,
                start_beat=chord_start_beat,
                duration_beats=note_duration,
            ))

        current_beat += block_beats

    return MidiFile(tracks=[track], bpm=bpm)


def _arpeggiated_chords(
    chords: list[dict],
    bpm: int,
    bars_per_chord: int,
    arpeggio_pattern: str,
    articulation: str,
    genre: str,
    base_velocity: int,
) -> MidiFile:
    track = MidiTrack(program=0)
    beats_per_bar = 4
    current_beat = 0.0

    for chord in chords:
        notes = chord.get("notes", [])
        root = chord.get("name", "C").replace("m", "").replace("dim", "").replace("aug", "")
        if not root:
            root = "C"
        root = root[0].upper()

        block_beats = bars_per_chord * beats_per_bar

        arp_notes = resolve_arpeggiation(
            notes=notes,
            root=root,
            pattern=arpeggio_pattern,
            beats=block_beats,
            base_velocity=base_velocity,
            genre=genre,
        )

        for arp_note in arp_notes:
            track.notes.append(MidiNote(
                pitch=arp_note["pitch"],
                velocity=arp_note["velocity"],
                start_beat=current_beat + arp_note["start_beat"],
                duration_beats=arp_note["duration_beats"],
            ))

        current_beat += block_beats

    return MidiFile(tracks=[track], bpm=bpm)


def _full_arrangement(
    chords: list[dict],
    bpm: int,
    bars_per_chord: int,
    beat_division: int,
    voicing: str,
    articulation: str,
    arpeggio_pattern: str,
    genre: str,
    mood: str,
    base_velocity: int,
) -> MidiFile:
    chord_track = MidiTrack(program=0)
    bass_track = MidiTrack(program=33)
    beats_per_bar = 4
    total_bars = len(chords) * bars_per_chord

    current_beat = 0.0

    from backend.app.services.midi.theory import semitone_to_midi, note_name_to_semitone

    for chord_idx, chord in enumerate(chords):
        notes = chord.get("notes", [])
        root = chord.get("name", "C").replace("m", "").replace("dim", "").replace("aug", "")
        if not root:
            root = "C"
        root = root[0].upper()
        quality = chord.get("quality", "major")

        block_beats = bars_per_chord * beats_per_bar
        chord_start_beat = current_beat
        bar_index = chord_idx * bars_per_chord

        midi_notes = resolve_voicing(notes, root, voicing)
        gate = resolve_gate_length(genre, articulation)

        for note_idx, pitch in enumerate(midi_notes):
            note_name = notes[note_idx % len(notes)]
            beat_in_bar = int(chord_start_beat % 4) + 1
            vel = resolve_velocity(
                note_name=note_name,
                chord_root=root,
                chord_quality=quality,
                beat_in_bar=beat_in_bar,
                bar_index=bar_index,
                total_bars=total_bars,
                genre=genre,
                mood=mood,
                base_velocity=base_velocity,
            )
            chord_track.notes.append(MidiNote(
                pitch=pitch,
                velocity=vel,
                start_beat=chord_start_beat,
                duration_beats=block_beats * gate,
            ))

        root_semi = note_name_to_semitone(root)
        bass_pitch = semitone_to_midi(root_semi, 2)
        bass_vel = resolve_velocity(
            note_name=root,
            chord_root=root,
            chord_quality=quality,
            beat_in_bar=1,
            bar_index=bar_index,
            total_bars=total_bars,
            genre=genre,
            mood=mood,
            base_velocity=base_velocity,
        )
        bass_track.notes.append(MidiNote(
            pitch=bass_pitch,
            velocity=bass_vel,
            start_beat=chord_start_beat,
            duration_beats=block_beats,
        ))

        if mood in ("dark", "melancholic"):
            pass

        current_beat += block_beats

    return MidiFile(tracks=[chord_track, bass_track], bpm=bpm)
