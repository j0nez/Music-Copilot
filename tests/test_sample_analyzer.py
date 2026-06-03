import numpy as np
import pytest
from scipy.io import wavfile

from plugins import discover_plugins, execute_plugin
from plugins.events import event_bus

pytestmark = pytest.mark.asyncio

SR = 22050
BPM = 120
BEAT_INTERVAL = 60.0 / BPM
DURATION = 8.0


def _generate_test_tone(tmp_path) -> str:
    t = np.linspace(0, DURATION, int(SR * DURATION), endpoint=False)
    signal = np.zeros(int(SR * DURATION))

    for i in range(int(DURATION / BEAT_INTERVAL)):
        start = int(i * BEAT_INTERVAL * SR)
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
