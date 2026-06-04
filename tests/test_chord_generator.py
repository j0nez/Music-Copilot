import pytest

from plugins import discover_plugins, execute_plugin

pytestmark = pytest.mark.asyncio


async def test_plugin_discovery():
    registry = discover_plugins()
    assert "chord_generator" in registry


async def test_chord_generator_major_uplifting():
    discover_plugins()
    result = await execute_plugin("chord_generator", key="C Major", mood="uplifting", genre="house")
    assert result.success, f"Plugin failed: {result.error}"
    assert result.data["key"] == "C Major"
    assert result.data["mood"] == "uplifting"
    assert result.data["genre"] == "house"
    assert len(result.data["chords"]) > 0
    for chord in result.data["chords"]:
        assert "roman" in chord
        assert "name" in chord
        assert "notes" in chord
        assert "quality" in chord


async def test_chord_generator_minor_dark():
    discover_plugins()
    result = await execute_plugin("chord_generator", key="A Minor", mood="dark", genre="techno")
    assert result.success, f"Plugin failed: {result.error}"
    assert result.data["key"] == "A Minor"
    assert result.data["mood"] == "dark"


async def test_chord_generator_length_8():
    discover_plugins()
    result = await execute_plugin("chord_generator", key="C Major", mood="uplifting", genre="house", length=8)
    assert result.success
    assert len(result.data["chords"]) == 8


async def test_chord_generator_length_16():
    discover_plugins()
    result = await execute_plugin("chord_generator", key="G Minor", mood="emotional", genre="trance", length=16)
    assert result.success
    assert len(result.data["chords"]) == 16


async def test_chord_generator_length_4():
    discover_plugins()
    result = await execute_plugin("chord_generator", key="D Major", mood="energetic", genre="house", length=4)
    assert result.success
    assert len(result.data["chords"]) == 4


async def test_chord_generator_advanced_complexity():
    discover_plugins()
    result = await execute_plugin(
        "chord_generator", key="C Major", mood="uplifting", genre="house", length=8, complexity="advanced"
    )
    assert result.success
    assert len(result.data["chords"]) > 0


async def test_chord_generator_all_minor_keys():
    discover_plugins()
    keys = ["A Minor", "E Minor", "B Minor", "F# Minor", "C# Minor", "G# Minor",
            "D Minor", "G Minor", "C Minor", "F Minor", "Bb Minor", "Eb Minor"]
    for key in keys:
        result = await execute_plugin("chord_generator", key=key, mood="dark", genre="techno")
        assert result.success, f"Failed for key {key}: {result.error}"
        assert len(result.data["chords"]) > 0


async def test_chord_generator_all_major_keys():
    discover_plugins()
    keys = ["C Major", "G Major", "D Major", "A Major", "E Major", "B Major", "F# Major",
            "F Major", "Bb Major", "Eb Major", "Ab Major", "Db Major", "Gb Major", "Cb Major"]
    for key in keys:
        result = await execute_plugin("chord_generator", key=key, mood="uplifting", genre="house")
        assert result.success, f"Failed for key {key}: {result.error}"
        assert len(result.data["chords"]) > 0


async def test_chord_generator_returns_progression_chord_format():
    discover_plugins()
    result = await execute_plugin("chord_generator", key="C Major", mood="uplifting", genre="house")
    assert result.success
    chord = result.data["chords"][0]
    assert isinstance(chord["roman"], str)
    assert isinstance(chord["name"], str)
    assert isinstance(chord["notes"], list)
    assert isinstance(chord["quality"], str)
    assert len(chord["notes"]) > 0
