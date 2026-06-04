from pathlib import Path

import pretty_midi as pm
import pytest

from backend.app.core.config import settings
from backend.app.services.midi.generator import generate_midi
from plugins import discover_plugins, execute_plugin

C_MAJOR_CHORDS = [
    {"roman": "I", "name": "C", "notes": ["C", "E", "G"], "quality": "major"},
    {"roman": "IV", "name": "F", "notes": ["F", "A", "C"], "quality": "major"},
    {"roman": "V", "name": "G", "notes": ["G", "B", "D"], "quality": "major"},
    {"roman": "I", "name": "C", "notes": ["C", "E", "G"], "quality": "major"},
]


def _clean_exports():
    for f in settings.export_dir.glob("*.mid"):
        f.unlink(missing_ok=True)


def test_generate_midi_creates_file():
    _clean_exports()
    dest = generate_midi("C major", C_MAJOR_CHORDS, bpm=120)
    assert dest.exists()
    assert dest.suffix == ".mid"


def test_generate_midi_correct_number_of_notes():
    dest = generate_midi("C major", C_MAJOR_CHORDS, bpm=120)
    midi = pm.PrettyMIDI(str(dest))
    assert len(midi.instruments) == 1
    assert len(midi.instruments[0].notes) == 12


def test_generate_midi_has_correct_duration():
    dest = generate_midi("C major", C_MAJOR_CHORDS, bpm=120)
    midi = pm.PrettyMIDI(str(dest))
    end_time = max(n.end for n in midi.instruments[0].notes)
    assert end_time == pytest.approx(7.9, abs=0.5)


def test_generate_midi_pitches():
    dest = generate_midi("C major", [{"notes": ["C", "E", "G"]}], bpm=120)
    midi = pm.PrettyMIDI(str(dest))
    notes = sorted(n.pitch for n in midi.instruments[0].notes)
    assert notes == [60, 64, 67]


def test_generate_midi_with_flat_notes():
    _clean_exports()
    chords = [{"roman": "i", "name": "Fm", "notes": ["F", "Ab", "C"], "quality": "minor"}]
    dest = generate_midi("F minor", chords, bpm=100)
    assert dest.exists()
    midi = pm.PrettyMIDI(str(dest))
    assert len(midi.instruments[0].notes) == 3


@pytest.mark.asyncio
async def test_midi_export_plugin():
    discover_plugins()
    result = await execute_plugin(
        "midi_export",
        key="C major",
        chords=C_MAJOR_CHORDS,
        bpm=128,
    )
    assert result.success, f"Plugin failed: {result.error}"
    assert "file_path" in result.data
    assert Path(result.data["file_path"]).exists()
    assert result.data["bpm"] == 128
    assert result.data["length_bars"] == 4


@pytest.mark.asyncio
async def test_midi_export_plugin_empty_chords():
    discover_plugins()
    result = await execute_plugin("midi_export", key="C major", chords=[])
    assert result.success
    assert result.data["length_bars"] == 0
