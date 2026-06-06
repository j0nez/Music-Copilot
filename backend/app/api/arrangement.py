import logging
import uuid

from fastapi import APIRouter
from fastapi.responses import FileResponse
from pydantic import BaseModel

from backend.app.core.config import settings
from backend.app.services.midi.generator import write_midi
from backend.app.services.midi.models import MidiFile, MidiNote, MidiTrack
from backend.app.models.shared import ApiResponse

logger = logging.getLogger("music_copilot.arrangement_api")

router = APIRouter(prefix="/arrangement", tags=["arrangement"])


class ArrangementNote(BaseModel):
    pitch: int
    velocity: int = 100
    start_beat: float = 1.0
    duration_in_beats: float = 1.0


class ArrangementExportInput(BaseModel):
    chords: list[ArrangementNote] = []
    melody: list[ArrangementNote] = []
    bassline: list[ArrangementNote] = []
    bpm: int = 120
    solo: dict[str, bool] = {}


def _note_to_midi(n: ArrangementNote) -> MidiNote:
    return MidiNote(
        pitch=n.pitch,
        velocity=max(0, min(127, n.velocity)),
        start_beat=n.start_beat,
        duration_beats=n.duration_in_beats,
    )


@router.post("/export")
async def export_arrangement(payload: ArrangementExportInput):
    try:
        tracks = []

        solo_map = payload.solo or {}
        has_solos = any(solo_map.values())

        parts = [
            ("chords", payload.chords, 0),
            ("melody", payload.melody, 1),
            ("bassline", payload.bassline, 33),
        ]

        for part_name, notes, program in parts:
            if has_solos and not solo_map.get(part_name, False):
                continue
            if not notes:
                continue
            track = MidiTrack(program=program)
            track.notes = [_note_to_midi(n) for n in notes]
            tracks.append(track)

        if not tracks:
            return ApiResponse(
                success=False,
                data=None,
                error={"code": "NO_PARTS", "message": "No parts to export"},
            )

        midi_file = MidiFile(tracks=tracks, bpm=payload.bpm)
        dest = write_midi(midi_file)

        return ApiResponse(success=True, data={
            "midi_url": f"/api/exports/{dest.name}",
            "download_url": f"/api/exports/{dest.name}",
            "filename": dest.name,
        })

    except Exception as e:
        logger.error("Arrangement export failed: %s", e, exc_info=True)
        return ApiResponse(
            success=False,
            data=None,
            error={"code": "EXPORT_FAILED", "message": str(e)},
        )


@router.post("/per-part")
async def export_single_part(payload: dict, bpm: int = 120):
    part_name = payload.get("part", "")
    notes_data = payload.get("notes", [])

    if not part_name or not notes_data:
        return ApiResponse(
            success=False,
            data=None,
            error={"code": "INVALID_INPUT", "message": "part and notes are required"},
        )

    program_map = {"chords": 0, "melody": 1, "bassline": 33}
    program = program_map.get(part_name, 0)

    try:
        notes = [ArrangementNote(**n) for n in notes_data]
        track = MidiTrack(program=program)
        track.notes = [_note_to_midi(n) for n in notes]
        midi_file = MidiFile(tracks=[track], bpm=bpm)
        dest = write_midi(midi_file)

        return ApiResponse(success=True, data={
            "midi_url": f"/api/exports/{dest.name}",
            "download_url": f"/api/exports/{dest.name}",
            "filename": dest.name,
        })

    except Exception as e:
        logger.error("Per-part export failed: %s", e, exc_info=True)
        return ApiResponse(
            success=False,
            data=None,
            error={"code": "EXPORT_FAILED", "message": str(e)},
        )
