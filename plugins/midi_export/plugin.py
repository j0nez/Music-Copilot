import logging
from pathlib import Path
from typing import Literal

from pydantic import BaseModel

from backend.app.services.midi.generator import generate_midi
from plugins.base import Plugin, PluginResult

logger = logging.getLogger("music_copilot.midi_export")


class MidiExportInput(BaseModel):
    key: str
    chords: list[dict]
    bpm: int = 120
    bars_per_chord: int = 1


class MidiExportPlugin(Plugin):
    name = "midi_export"
    description = "Export chord progressions to MIDI files"
    version = "0.1.0"
    input_schema = MidiExportInput

    async def execute(self, **kwargs) -> PluginResult:
        try:
            key = kwargs["key"]
            chords = kwargs["chords"]
            bpm = kwargs.get("bpm", 120)
            bars_per_chord = kwargs.get("bars_per_chord", 1)

            dest = generate_midi(key, chords, bpm=bpm, bars_per_chord=bars_per_chord)

            return PluginResult(
                success=True,
                data={
                    "file_path": str(dest),
                    "filename": dest.name,
                    "bpm": bpm,
                    "length_bars": len(chords) * bars_per_chord,
                },
            )
        except Exception as e:
            logger.error("MIDI export failed: %s", e, exc_info=True)
            return PluginResult(success=False, data={}, error=str(e))
