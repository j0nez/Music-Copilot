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
    t = np.linspace(0, DURATION, total_samples, endpoint=False)
    signal = np.zeros(total_samples, dtype=np.int16)

    for start in range(0, total_samples, interval_samples):
        end = min(start + int(0.01 * SR), total_samples)
        tone = np.sin(2 * np.pi * 440 * t[start:end])
        envelope = np.exp(-np.linspace(0, 8, end - start))
        signal[start:end] = (tone * envelope * 20000).astype(np.int16)

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


async def test_sample_analyzer_confidence_fields(tmp_path):
    discover_plugins()
    file_path = _generate_test_tone(tmp_path)

    result = await execute_plugin("sample_analyzer", file_path=file_path)

    assert result.success
    assert "bpm_confidence" in result.data
    assert "key_confidence" in result.data
    assert "bpm_range_applied" in result.data
    assert "key_algorithms" in result.data
    assert len(result.data["key_algorithms"]) > 0


async def test_sample_analyzer_key_ensemble_runs_all_algorithms(tmp_path):
    discover_plugins()
    file_path = _generate_test_tone(tmp_path)

    result = await execute_plugin("sample_analyzer", file_path=file_path)

    assert result.success
    algos = {a["algorithm"] for a in result.data["key_algorithms"]}
    expected = {"Krumhansl-Schmuckler", "Aarden-Essen", "Bellman-Budge", "Temperley-Kostka-Payne", "Simple-Weights"}
    assert algos == expected, f"Missing algorithms: {expected - algos}"
    assert len(algos) == 5


async def test_sample_analyzer_key_confidence_not_none(tmp_path):
    discover_plugins()
    file_path = _generate_test_tone(tmp_path)

    result = await execute_plugin("sample_analyzer", file_path=file_path)

    assert result.success
    assert result.data["key_confidence"] in ("high", "medium", "low")


async def test_sample_analyzer_rejects_missing_file():
    discover_plugins()
    result = await execute_plugin("sample_analyzer", file_path="/nonexistent/file.wav")
    assert not result.success
    assert "not found" in (result.error or "").lower()


async def test_sample_analyzer_rejects_silence(tmp_path):
    discover_plugins()
    sr = 22050
    signal = np.zeros(int(sr * 3), dtype=np.int16)
    dest = tmp_path / "silence.wav"
    wavfile.write(str(dest), sr, signal)

    result = await execute_plugin("sample_analyzer", file_path=str(dest))
    assert not result.success
    assert "silent" in (result.error or "").lower()


async def test_sample_analyzer_rejects_short_audio(tmp_path):
    discover_plugins()
    sr = 22050
    signal = (np.random.rand(int(sr * 0.3)) * 32767).astype(np.int16)
    dest = tmp_path / "short.wav"
    wavfile.write(str(dest), sr, signal)

    result = await execute_plugin("sample_analyzer", file_path=str(dest))
    assert not result.success
    assert "too short" in (result.error or "").lower()


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
    assert "bpm_confidence" in received[0]
    assert "key_confidence" in received[0]


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


async def test_sample_analyzer_short_audio(tmp_path):
    discover_plugins()
    sr = 22050
    short_dur = 3.0
    interval_samples = int(sr * 60.0 / 140)
    total = int(sr * short_dur)
    t = np.linspace(0, short_dur, total, endpoint=False)
    signal = np.zeros(total, dtype=np.int16)
    for start in range(0, total, interval_samples):
        end = min(start + int(0.01 * sr), total)
        tone = np.sin(2 * np.pi * 440 * t[start:end])
        envelope = np.exp(-np.linspace(0, 8, end - start))
        signal[start:end] = (tone * envelope * 20000).astype(np.int16)
    dest = tmp_path / "short_140.wav"
    wavfile.write(str(dest), sr, signal)

    result = await execute_plugin("sample_analyzer", file_path=str(dest))

    assert result.success, f"Plugin failed: {result.error}"
    assert result.data["bpm"] is not None
    assert 60 <= result.data["bpm"] <= 240


async def test_sample_analyzer_bpm_range_applied_flag(tmp_path):
    discover_plugins()
    file_path = _generate_test_tone(tmp_path)

    result = await execute_plugin(
        "sample_analyzer", file_path=file_path, min_bpm=50, max_bpm=70,
    )

    assert result.success
    assert "bpm_range_applied" in result.data


async def test_sample_analyzer_warning_none_for_clean_tone(tmp_path):
    """Clean tonal audio should not produce a high-noise warning."""
    discover_plugins()
    file_path = _generate_test_tone(tmp_path)
    result = await execute_plugin("sample_analyzer", file_path=file_path)
    assert result.success
    assert result.data.get("warning") is None


async def test_sample_analyzer_handles_corrupt_audio(tmp_path):
    """Corrupt/invalid audio file should be handled gracefully, not crash."""
    discover_plugins()
    dest = tmp_path / "corrupt.wav"
    dest.write_bytes(b"\x00\x01\x02" * 1000)  # garbage bytes, not valid WAV

    result = await execute_plugin("sample_analyzer", file_path=str(dest))
    assert not result.success
    assert result.error is not None
