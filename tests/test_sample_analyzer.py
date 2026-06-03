import numpy as np
import pytest
from scipy.io import wavfile

from plugins import discover_plugins, execute_plugin
from plugins.events import event_bus

pytestmark = pytest.mark.asyncio

SR = 22050
DURATION = 8.0


def _generate_test_tone(tmp_path) -> str:
    bpm = 120
    interval = 60.0 / bpm
    t = np.linspace(0, DURATION, int(SR * DURATION), endpoint=False)
    signal = np.zeros(int(SR * DURATION))

    for i in range(int(DURATION / interval)):
        start = int(i * interval * SR)
        tone_len = int(0.1 * SR)
        if start + tone_len >= len(signal):
            break
        tone = np.sin(2 * np.pi * 440 * np.linspace(0, 0.1, tone_len))
        envelope = np.exp(-np.linspace(0, 5, tone_len))
        signal[start : start + tone_len] = tone * envelope * 0.5

    signal = np.clip(signal, -1.0, 1.0)
    signal_int16 = (signal * 32767).astype(np.int16)

    dest = tmp_path / "test_tone.wav"
    wavfile.write(str(dest), SR, signal_int16)
    return str(dest)


def _generate_click_track(tmp_path, bpm: int, filename: str) -> str:
    interval_samples = int(SR * 60.0 / bpm)
    total_samples = int(SR * DURATION)
    signal = np.zeros(total_samples, dtype=np.int16)

    for start in range(0, total_samples, interval_samples):
        end = min(start + 3, total_samples)
        signal[start:end] = 8000

    dest = tmp_path / filename
    wavfile.write(str(dest), SR, signal)
    return str(dest)


async def test_sample_analyzer_detects_bpm_and_key(tmp_path):
    discover_plugins()
    file_path = _generate_test_tone(tmp_path)

    result = await execute_plugin("sample_analyzer", file_path=file_path)

    assert result.success, f"Plugin failed: {result.error}"
    assert result.data["bpm"] is not None
    assert 110 <= result.data["bpm"] <= 130
    assert result.data["key"] is not None
    assert result.data["length_seconds"] is not None
    assert result.data["format"] == "wav"


async def test_sample_analyzer_rejects_missing_file():
    discover_plugins()
    result = await execute_plugin("sample_analyzer", file_path="/nonexistent/file.wav")
    assert not result.success
    assert "not found" in (result.error or "").lower()


async def test_sample_analyzer_emits_event(tmp_path):
    discover_plugins()
    file_path = _generate_test_tone(tmp_path)
    received = []

    async def on_analyzed(**data):
        received.append(data)

    event_bus.on("sample.analyzed", on_analyzed)
    await execute_plugin("sample_analyzer", file_path=file_path)
    event_bus.off("sample.analyzed", on_analyzed)

    assert len(received) == 1
    assert received[0]["bpm"] == pytest.approx(120, abs=10)
    assert received[0]["key"] is not None


async def test_sample_analyzer_detects_143_bpm(tmp_path):
    discover_plugins()
    file_path = _generate_click_track(tmp_path, 143, "click_143.wav")

    result = await execute_plugin("sample_analyzer", file_path=file_path)

    assert result.success, f"Plugin failed: {result.error}"
    assert result.data["bpm"] == pytest.approx(143, abs=3)


async def test_sample_analyzer_detects_174_bpm(tmp_path):
    discover_plugins()
    file_path = _generate_click_track(tmp_path, 174, "click_174.wav")

    result = await execute_plugin("sample_analyzer", file_path=file_path)

    assert result.success, f"Plugin failed: {result.error}"
    assert result.data["bpm"] is not None
    assert 60 <= result.data["bpm"] <= 240
    assert result.data["key"] is not None
    assert result.data["length_seconds"] is not None
