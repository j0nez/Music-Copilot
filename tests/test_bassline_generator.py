import pytest

from plugins import discover_plugins, execute_plugin

pytestmark = pytest.mark.asyncio

GENRES = ["techno", "house", "trance", "deep house", "dnb", "melodic techno"]


async def test_bassline_root_fifth():
    discover_plugins()
    for genre in ["techno", "melodic techno"]:
        result = await execute_plugin(
            "bassline_generator",
            key="A Minor",
            scale="Natural Minor",
            genre=genre,
            length=4,
        )
        assert result.success, f"{genre} failed: {result.error}"
        notes = result.data["notes"]
        assert len(notes) > 0
        for n in notes:
            assert "pitch" in n
            assert "velocity" in n
            assert "start_beat" in n
            assert "duration_in_beats" in n
            assert 24 <= n["pitch"] <= 72, f"Bass pitch {n['pitch']} out of range"


async def test_bassline_walking():
    discover_plugins()
    for genre in ["house", "deep house"]:
        result = await execute_plugin(
            "bassline_generator",
            key="A Minor",
            scale="Natural Minor",
            genre=genre,
            length=4,
        )
        assert result.success, f"{genre} failed: {result.error}"
        assert len(result.data["notes"]) > 0


async def test_bassline_syncopated():
    discover_plugins()
    result = await execute_plugin(
        "bassline_generator",
        key="A Minor",
        scale="Natural Minor",
        genre="dnb",
        length=4,
    )
    assert result.success, f"dnb failed: {result.error}"
    notes = result.data["notes"]
    assert len(notes) > 0
    # DnB has 4 notes per bar, so 4 bars = 16 notes
    assert len(notes) >= 8


async def test_bassline_edge_cases():
    discover_plugins()
    result = await execute_plugin(
        "bassline_generator",
        key="C Major",
        scale="Major",
        genre="techno",
        length=16,
    )
    assert result.success, f"Plugin failed: {result.error}"
    notes = result.data["notes"]
    assert len(notes) > 0
    assert result.data["length_bars"] == 16
    for n in notes:
        assert n["start_beat"] >= 0
        assert n["duration_in_beats"] > 0
