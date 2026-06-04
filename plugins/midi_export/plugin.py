import logging
from typing import Literal

from pydantic import BaseModel, Field

from backend.app.services.midi.generator import generate_midi as _generate_midi_legacy, write_midi
from backend.app.services.midi.patterns import progression_to_midi
from plugins.base import Plugin, PluginResult

logger = logging.getLogger("music_copilot.midi_export")


class MidiExportInput(BaseModel):
    key: str
    chords: list[dict]
    bpm: int = 120
    bars_per_chord: int = 1
    style: Literal["block", "arpeggio", "broken", "full"] = "block"
    voicing: Literal["close", "open", "drop2"] = "close"
    articulation: Literal["auto", "legato", "tenuto", "staccato", "staccatissimo"] = "auto"
    genre: str = "house"
    mood: str = "uplifting"
    arpeggio_pattern: Literal["up", "down", "updown", "trance"] = "up"
    base_velocity: int = Field(default=100, ge=30, le=127)


class MidiExportPlugin(Plugin):
    name = "midi_export"
    description = "Export chord progressions to MIDI files"
    version = "0.2.0"
    input_schema = MidiExportInput

    async def execute(self, **kwargs) -> PluginResult:
        try:
            chords = kwargs["chords"]
            bpm = kwargs.get("bpm", 120)
            bars_per_chord = kwargs.get("bars_per_chord", 1)
            style = kwargs.get("style", "block")

            if style == "block" and "voicing" not in kwargs and "articulation" not in kwargs and "base_velocity" not in kwargs:
                key = kwargs["key"]
                dest = _generate_midi_legacy(key, chords, bpm=bpm, bars_per_chord=bars_per_chord)
            else:
                midi_file = progression_to_midi(
                    chords=chords,
                    bpm=bpm,
                    bars_per_chord=bars_per_chord,
                    style=style,
                    voicing=kwargs.get("voicing", "close"),
                    articulation=kwargs.get("articulation", "auto"),
                    genre=kwargs.get("genre", "house"),
                    mood=kwargs.get("mood", "uplifting"),
                    arpeggio_pattern=kwargs.get("arpeggio_pattern", "up"),
                    base_velocity=kwargs.get("base_velocity", 100),
                )
                dest = write_midi(midi_file)

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
