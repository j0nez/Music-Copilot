import pytest

from plugins import discover_plugins, execute_plugin

pytestmark = pytest.mark.asyncio


@pytest.fixture(autouse=True)
def _discover():
    discover_plugins()


async def test_scale_c_major():
    result = await execute_plugin(
        "theory_engine", mode="scale", key="C", scale_type="major"
    )
    assert result.success
    assert result.data["key"] == "C"
    assert result.data["scale"] == "major"
    assert result.data["notes"] == ["C", "D", "E", "F", "G", "A", "B"]
    assert result.data["intervals"] == [
        "Root", "Major 2nd", "Major 3rd", "Perfect 4th",
        "Perfect 5th", "Major 6th", "Major 7th",
    ]


async def test_scale_f_sharp_major():
    result = await execute_plugin(
        "theory_engine", mode="scale", key="F#", scale_type="major"
    )
    assert result.success
    assert result.data["key"] == "F#"
    assert result.data["notes"] == ["F#", "G#", "A#", "B", "C#", "D#", "E#"]


async def test_scale_eb_major():
    result = await execute_plugin(
        "theory_engine", mode="scale", key="Eb", scale_type="major"
    )
    assert result.success
    assert result.data["key"] == "Eb"
    assert result.data["notes"] == ["Eb", "F", "G", "Ab", "Bb", "C", "D"]


async def test_scale_natural_minor():
    result = await execute_plugin(
        "theory_engine", mode="scale", key="A", scale_type="natural minor"
    )
    assert result.success
    assert result.data["notes"] == ["A", "B", "C", "D", "E", "F", "G"]


async def test_scale_harmonic_minor():
    result = await execute_plugin(
        "theory_engine", mode="scale", key="A", scale_type="harmonic minor"
    )
    assert result.success
    assert result.data["notes"] == ["A", "B", "C", "D", "E", "F", "G#"]


async def test_scale_pentatonic_major():
    result = await execute_plugin(
        "theory_engine", mode="scale", key="C", scale_type="pentatonic major"
    )
    assert result.success
    assert result.data["notes"] == ["C", "D", "E", "G", "A"]


async def test_scale_dorian():
    result = await execute_plugin(
        "theory_engine", mode="scale", key="D", scale_type="dorian"
    )
    assert result.success
    assert result.data["notes"] == ["D", "E", "F", "G", "A", "B", "C"]


async def test_scale_unknown():
    result = await execute_plugin(
        "theory_engine", mode="scale", key="C", scale_type="invalid"
    )
    assert not result.success


async def test_chord_major():
    result = await execute_plugin(
        "theory_engine", mode="chord", root="C", chord_quality="major"
    )
    assert result.success
    assert result.data["notes"] == ["C", "E", "G"]


async def test_chord_minor():
    result = await execute_plugin(
        "theory_engine", mode="chord", root="A", chord_quality="minor"
    )
    assert result.success
    assert result.data["notes"] == ["A", "C", "E"]


async def test_chord_dominant_7th():
    result = await execute_plugin(
        "theory_engine", mode="chord", root="G", chord_quality="dominant 7th"
    )
    assert result.success
    assert result.data["notes"] == ["G", "B", "D", "F"]


async def test_chord_unknown_quality():
    result = await execute_plugin(
        "theory_engine", mode="chord", root="C", chord_quality="invalid"
    )
    assert not result.success


async def test_interval_perfect_fifth():
    result = await execute_plugin(
        "theory_engine", mode="interval", note1="C", note2="G"
    )
    assert result.success
    assert result.data["interval"] == "P5"
    assert result.data["semitones"] == 7


async def test_interval_minor_third():
    result = await execute_plugin(
        "theory_engine", mode="interval", note1="C", note2="Eb"
    )
    assert result.success
    assert result.data["interval"] in ("m3", "A2")
    assert result.data["semitones"] == 3


async def test_interval_unison():
    result = await execute_plugin(
        "theory_engine", mode="interval", note1="C", note2="C"
    )
    assert result.success
    assert result.data["interval"] == "P1"
    assert result.data["semitones"] == 0


async def test_progression_minor_dark():
    result = await execute_plugin(
        "theory_engine", mode="progression", key="A Minor", mood="dark"
    )
    assert result.success
    assert len(result.data["chords"]) == 4
    # i-VII-VI-VII in A minor
    chords = result.data["chords"]
    assert chords[0]["roman"] == "i"
    assert chords[0]["name"] == "A"
    assert chords[1]["roman"] == "VII"
    assert chords[1]["name"] == "G"


async def test_progression_major_uplifting():
    result = await execute_plugin(
        "theory_engine", mode="progression", key="C Major", mood="uplifting"
    )
    assert result.success
    chords = result.data["chords"]
    assert chords[0]["roman"] == "I"
    assert chords[0]["name"] == "C"
    assert chords[2]["roman"] == "vi"
    assert chords[2]["name"] == "A"


async def test_progression_fallback_default():
    result = await execute_plugin(
        "theory_engine", mode="progression", key="C Major", mood="unknown"
    )
    assert result.success
    # Should fall back to uplifting default for major
    assert result.data["chords"][0]["roman"] == "I"


async def test_unknown_mode():
    result = await execute_plugin("theory_engine", mode="invalid")
    assert not result.success
