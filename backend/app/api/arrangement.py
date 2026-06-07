import logging
import uuid

from fastapi import APIRouter
from fastapi.responses import FileResponse
from pydantic import BaseModel

from backend.app.core.config import settings
from backend.app.core.exceptions import InputValidationError, DatabaseError
from backend.app.services.midi.generator import write_midi
from backend.app.services.midi.models import MidiFile, MidiNote, MidiTrack
from backend.app.models.shared import ApiResponse, ErrorDetail
from backend.app.db.progressions import save_arrangement
from plugins.midi_export.expression.swing import apply_swing

logger = logging.getLogger("music_copilot.arrangement_api")

router = APIRouter(prefix="/arrangement", tags=["arrangement"])


class ArrangementNote(BaseModel):
    pitch: int
    velocity: int = 100
    start_beat: float = 1.0
    duration_in_beats: float = 1.0


class ArrangementSaveInput(BaseModel):
    chords: list[ArrangementNote] = []
    melody: list[ArrangementNote] = []
    bassline: list[ArrangementNote] = []
    key: str = "C"
    mood: str | None = None
    genre: str | None = None
    project_id: int | None = None
    name: str | None = None


class ArrangementExportInput(BaseModel):
    chords: list[ArrangementNote] = []
    melody: list[ArrangementNote] = []
    bassline: list[ArrangementNote] = []
    bpm: int = 120
    swing: float = 0.0
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
        swing_amount = max(0.0, min(1.0, payload.swing or 0.0))
        chords_swung = apply_swing(
            [n.model_dump() for n in payload.chords], swing_amount
        ) if swing_amount > 0 else [n.model_dump() for n in payload.chords]
        melody_swung = apply_swing(
            [n.model_dump() for n in payload.melody], swing_amount
        ) if swing_amount > 0 else [n.model_dump() for n in payload.melody]
        bassline_swung = apply_swing(
            [n.model_dump() for n in payload.bassline], swing_amount
        ) if swing_amount > 0 else [n.model_dump() for n in payload.bassline]

        tracks = []

        solo_map = payload.solo or {}
        has_solos = any(solo_map.values())

        parts = [
            ("chords", chords_swung, 0),
            ("melody", melody_swung, 1),
            ("bassline", bassline_swung, 33),
        ]

        for part_name, notes, program in parts:
            if has_solos and not solo_map.get(part_name, False):
                continue
            if not notes:
                continue
            track = MidiTrack(program=program)
            track.notes = [_note_to_midi(ArrangementNote(**n)) for n in notes]
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


@router.post("/save")
async def save_arrangement_route(payload: ArrangementSaveInput):
    if not payload.chords and not payload.melody and not payload.bassline:
        raise InputValidationError("At least one part (chords, melody, bassline) is required")

    data = {
        "chords": [n.model_dump() for n in payload.chords],
        "melody": [n.model_dump() for n in payload.melody],
        "bassline": [n.model_dump() for n in payload.bassline],
    }
    try:
        row_id = save_arrangement(
            key=payload.key, mood=payload.mood, genre=payload.genre,
            data=data, project_id=payload.project_id, name=payload.name,
        )
        return ApiResponse(success=True, data={"id": row_id})
    except Exception as exc:
        logger.error("Failed to save arrangement: project_id=%s name=%s exc=%s",
                      payload.project_id, payload.name, exc)
        raise DatabaseError(f"Failed to save arrangement: {exc}") from exc
