import pytest

from plugins import discover_plugins, execute_plugin

pytestmark = pytest.mark.asyncio


async def test_melody_generator_simple_major():
    discover_plugins()
    result = await execute_plugin(
        "melody_generator",
        key="C Major",
        scale="Major",
        mood="uplifting",
        genre="house",
        length=4,
        complexity="simple",
    )
    assert result.success, f"Plugin failed: {result.error}"
    notes = result.data["notes"]
    assert len(notes) > 0, "Should produce notes"
    assert result.data["length_bars"] == 4
    for n in notes:
        assert "pitch" in n
        assert "velocity" in n
        assert "start_beat" in n
        assert "duration_in_beats" in n
        assert 0 <= n["pitch"] <= 127
        assert 0 <= n["velocity"] <= 127


async def test_melody_generator_simple_minor():
    discover_plugins()
    result = await execute_plugin(
        "melody_generator",
        key="A Minor",
        scale="Natural Minor",
        mood="dark",
        genre="techno",
        length=8,
        complexity="simple",
    )
    assert result.success, f"Plugin failed: {result.error}"
    assert len(result.data["notes"]) > 0
    assert result.data["length_bars"] == 8


async def test_melody_generator_advanced():
    discover_plugins()
    result = await execute_plugin(
        "melody_generator",
        key="A Minor",
        scale="Natural Minor",
        mood="emotional",
        genre="trance",
        length=8,
        complexity="advanced",
    )
    assert result.success, f"Plugin failed: {result.error}"
    assert len(result.data["notes"]) > 0


async def test_melody_generator_edge_cases():
    discover_plugins()
    result = await execute_plugin(
        "melody_generator",
        key="C Major",
        scale="Major",
        mood="neutral",
        genre="melodic techno",
        length=4,
        complexity="simple",
    )
    assert result.success, f"Plugin failed: {result.error}"
    notes = result.data["notes"]
    assert len(notes) > 0
    # All notes should be in valid range
    for n in notes:
        assert n["start_beat"] >= 0
        assert n["duration_in_beats"] > 0
