import pretty_midi

from backend.app.services.midi.models import MidiFile, MidiTrack, MidiNote
from backend.app.services.midi.theory import (
    resolve_velocity,
    resolve_voicing,
    resolve_arpeggiation,
    note_name_to_semitone,
)
from backend.app.services.midi.generator import write_midi
from backend.app.services.midi.patterns import progression_to_midi

C_MAJOR_CHORDS = [
    {"name": "C", "notes": ["C", "E", "G"], "quality": "major"},
    {"name": "F", "notes": ["F", "A", "C"], "quality": "major"},
    {"name": "G", "notes": ["G", "B", "D"], "quality": "major"},
]


def test_velocity_chord_tone_hierarchy():
    root_vel = resolve_velocity("C", "C", "major", 1, 0, 8, "house", "uplifting", 100)
    third_vel = resolve_velocity("E", "C", "major", 1, 0, 8, "house", "uplifting", 100)
    fifth_vel = resolve_velocity("G", "C", "major", 1, 0, 8, "house", "uplifting", 100)

    assert root_vel > third_vel, f"root {root_vel} should be > third {third_vel}"
    assert third_vel > fifth_vel, f"third {third_vel} should be > fifth {fifth_vel}"
    assert 30 <= root_vel <= 127
    assert 30 <= third_vel <= 127
    assert 30 <= fifth_vel <= 127


def test_velocity_seventh_tone_higher_than_fifth():
    seventh_vel = resolve_velocity("B", "C", "dominant 7th", 1, 0, 8, "house", "uplifting", 100)
    fifth_vel = resolve_velocity("G", "C", "dominant 7th", 1, 0, 8, "house", "uplifting", 100)

    assert seventh_vel > fifth_vel, f"seventh {seventh_vel} should be > fifth {fifth_vel}"


def test_velocity_downbeat_stronger_than_offbeat():
    beat1 = resolve_velocity("C", "C", "major", 1, 0, 4, "house", "uplifting", 100)
    beat2 = resolve_velocity("C", "C", "major", 2, 0, 4, "house", "uplifting", 100)
    beat4 = resolve_velocity("C", "C", "major", 4, 0, 4, "house", "uplifting", 100)

    assert beat1 >= beat2, f"beat1 {beat1} should be >= beat2 {beat2}"
    assert beat1 >= beat4


def test_velocity_phrase_middle_slightly_quieter():
    start = resolve_velocity("C", "C", "major", 1, 0, 8, "house", "uplifting", 100)
    middle = resolve_velocity("C", "C", "major", 1, 3, 8, "house", "uplifting", 100)
    end = resolve_velocity("C", "C", "major", 1, 7, 8, "house", "uplifting", 100)

    assert start > middle, f"start {start} should be > middle {middle}"
    assert end > middle, f"end {end} should be > middle {middle}"


def test_techno_downbeat_stronger_offbeat_weak():
    techno_dbeat = resolve_velocity("C", "C", "major", 1, 0, 4, "techno", "uplifting", 100)
    techno_obeat = resolve_velocity("C", "C", "major", 2, 0, 4, "techno", "uplifting", 100)
    house_obeat = resolve_velocity("C", "C", "major", 2, 0, 4, "house", "uplifting", 100)

    assert techno_dbeat - techno_obeat > house_obeat - techno_obeat or techno_dbeat > techno_obeat * 1.2


def test_close_voicing_within_octave():
    midi_notes = resolve_voicing(["C", "E", "G"], "C", "close")
    assert len(midi_notes) == 3
    intervals = [midi_notes[i+1] - midi_notes[i] for i in range(len(midi_notes)-1)]
    assert all(i <= 12 for i in intervals), f"intervals {intervals} should all be <= 12"


def test_open_voicing_spread():
    midi_notes = resolve_voicing(["C", "E", "G", "B"], "C", "open")
    assert len(midi_notes) == 4
    span = max(midi_notes) - min(midi_notes)
    assert span >= 14, f"open voicing span {span} should be >= 14"


def test_drop2_voicing():
    midi_notes = resolve_voicing(["C", "E", "G", "B"], "C", "drop2")
    assert len(midi_notes) == 4
    first_two_diff = midi_notes[1] - midi_notes[0]
    assert first_two_diff >= 3, f"drop2 upper gap {first_two_diff} should be >= 3"


def test_arpeggio_up_ascending_order():
    result = resolve_arpeggiation(["C", "E", "G"], "C", "up", 4.0, 100, "house")
    pitches = [n["pitch"] for n in result]
    assert pitches == sorted(pitches), f"up arp should be ascending: {pitches}"


def test_arpeggio_down_descending_order():
    result = resolve_arpeggiation(["C", "E", "G"], "C", "down", 4.0, 100, "house")
    pitches = [n["pitch"] for n in result]
    assert pitches == sorted(pitches, reverse=True), f"down arp should be descending: {pitches}"


def test_arpeggio_updown_symmetric():
    result = resolve_arpeggiation(["C", "E", "G"], "C", "updown", 4.0, 100, "house")
    pitches = [n["pitch"] for n in result]
    assert len(pitches) == 5, f"updown 3 notes should give 5: {pitches}"
    assert pitches[0] == pitches[-1], f"updown should start and end on same pitch: {pitches}"
    assert pitches == [60, 64, 67, 64, 60], f"unexpected updown order: {pitches}"


def test_trance_arpeggio_repeated_pattern():
    result = resolve_arpeggiation(["C", "E", "G"], "C", "trance", 2.0, 100, "trance")
    assert len(result) >= 4, f"trance arp should have many notes, got {len(result)}"


def test_arpeggio_velocity_varies():
    result = resolve_arpeggiation(["C", "E", "G"], "C", "up", 4.0, 100, "house")
    velocities = [n["velocity"] for n in result]
    assert len(set(velocities)) > 1, f"velocities should vary: {velocities}"


def test_write_midi_creates_valid_file(tmp_path):
    midi_file = MidiFile(
        tracks=[
            MidiTrack(
                program=0,
                notes=[
                    MidiNote(pitch=60, velocity=100, start_beat=0.0, duration_beats=1.0),
                    MidiNote(pitch=64, velocity=80, start_beat=1.0, duration_beats=1.0),
                ],
            ),
        ],
        bpm=120,
    )

    dest = write_midi(midi_file)

    assert dest.exists()
    assert dest.suffix == ".mid"

    pm = pretty_midi.PrettyMIDI(str(dest))
    assert len(pm.instruments) == 1
    assert len(pm.instruments[0].notes) == 2
    assert pm.instruments[0].notes[0].velocity == 100
    assert pm.instruments[0].notes[1].velocity == 80


def test_write_midi_multi_track(tmp_path):
    midi_file = MidiFile(
        tracks=[
            MidiTrack(program=0, notes=[MidiNote(pitch=60, velocity=100, start_beat=0.0, duration_beats=4.0)]),
            MidiTrack(program=33, notes=[MidiNote(pitch=36, velocity=100, start_beat=0.0, duration_beats=4.0)]),
        ],
        bpm=120,
    )

    dest = write_midi(midi_file)

    pm = pretty_midi.PrettyMIDI(str(dest))
    assert len(pm.instruments) == 2


def test_progression_block_chords():
    mf = progression_to_midi(C_MAJOR_CHORDS, bpm=120, bars_per_chord=1, style="block")
    assert len(mf.tracks) == 1
    total_notes = sum(len(t.notes) for t in mf.tracks)
    assert total_notes == 3 * 3, f"3 chords x 3 notes = 9, got {total_notes}"


def test_progression_arpeggio_more_notes_than_block():
    block = progression_to_midi(C_MAJOR_CHORDS, bpm=120, bars_per_chord=1, style="block")
    arp = progression_to_midi(C_MAJOR_CHORDS, bpm=120, bars_per_chord=2, style="arpeggio", arpeggio_pattern="updown")

    block_count = sum(len(t.notes) for t in block.tracks)
    arp_count = sum(len(t.notes) for t in arp.tracks)
    assert arp_count > block_count, f"arpeggio {arp_count} should have more notes than block {block_count}"


def test_progression_full_multi_track():
    mf = progression_to_midi(C_MAJOR_CHORDS, bpm=120, bars_per_chord=1, style="full")
    assert len(mf.tracks) == 2, f"full should have 2 tracks, got {len(mf.tracks)}"


def test_progression_velocity_varies():
    mf = progression_to_midi(C_MAJOR_CHORDS, bpm=120, bars_per_chord=1, style="block")
    notes = mf.tracks[0].notes
    velocities = [n.velocity for n in notes]
    assert len(set(velocities)) > 1, f"velocities should vary by theory rules: {velocities}"
    assert all(30 <= v <= 127 for v in velocities)


def test_progression_base_velocity_ceiling():
    mf = progression_to_midi(C_MAJOR_CHORDS, bpm=120, bars_per_chord=1, style="block", base_velocity=120)
    notes = mf.tracks[0].notes
    assert all(n.velocity >= 30 for n in notes)
    assert all(n.velocity <= 127 for n in notes)


def test_progression_all_styles_produce_midi():
    for style in ("block", "arpeggio", "broken", "full"):
        mf = progression_to_midi(C_MAJOR_CHORDS, bpm=120, bars_per_chord=1, style=style)
        total = sum(len(t.notes) for t in mf.tracks)
        assert total > 0, f"style '{style}' produced 0 notes"


def test_velocity_mood_modifier():
    uplifting = resolve_velocity("C", "C", "major", 1, 0, 4, "house", "uplifting", 100)
    dark = resolve_velocity("C", "C", "major", 1, 0, 4, "house", "dark", 100)
    assert uplifting >= dark, f"uplifting {uplifting} should be >= dark {dark}"
