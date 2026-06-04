import json
import logging

from fastapi import APIRouter
from fastapi.responses import FileResponse

from backend.app.core.exceptions import InputValidationError, DatabaseError
from backend.app.db.database import get_connection
from backend.app.db.progressions import (
    delete_progression,
    list_progressions,
    save_progression,
)
from backend.app.models.shared import ApiResponse, ErrorDetail
from backend.app.services.midi.generator import generate_midi

logger = logging.getLogger("music_copilot.progressions_api")

router = APIRouter(prefix="/progressions", tags=["progressions"])


@router.post("/")
async def create_progression(payload: dict):
    key = payload.get("key")
    if not key or not isinstance(key, str):
        raise InputValidationError("'key' is required and must be a string")

    chords = payload.get("chords")
    if not chords or not isinstance(chords, list):
        raise InputValidationError("'chords' is required and must be a list")

    mood = payload.get("mood")
    genre = payload.get("genre")

    try:
        row_id = save_progression(key, mood, genre, chords)
    except Exception as exc:
        raise DatabaseError(f"Failed to save progression: {exc}") from exc

    return ApiResponse(success=True, data={"id": row_id})


@router.get("/")
async def get_progressions(sort_by: str = "created_at", sort_order: str = "DESC"):
    try:
        items = list_progressions(sort_by=sort_by, sort_order=sort_order)
    except Exception as exc:
        raise DatabaseError(f"Failed to list progressions: {exc}") from exc

    return ApiResponse(success=True, data={"progressions": items})


@router.delete("/{progression_id}")
async def remove_progression(progression_id: int):
    try:
        deleted = delete_progression(progression_id)
    except Exception as exc:
        raise DatabaseError(f"Failed to delete progression: {exc}") from exc

    if not deleted:
        return ApiResponse(
            success=False,
            data=None,
            error=ErrorDetail(code="NOT_FOUND", message=f"Progression {progression_id} not found"),
        )

    return ApiResponse(success=True, data={"deleted": True})


@router.get("/{progression_id}/midi")
async def download_progression_midi(progression_id: int, bpm: int = 120):
    try:
        conn = get_connection()
        row = conn.execute(
            "SELECT key, chords FROM progressions WHERE id = ?", (progression_id,)
        ).fetchone()
        conn.close()
    except Exception as exc:
        raise DatabaseError(f"Failed to read progression: {exc}") from exc

    if row is None:
        return ApiResponse(
            success=False,
            data=None,
            error=ErrorDetail(code="NOT_FOUND", message=f"Progression {progression_id} not found"),
        )

    chords = json.loads(row["chords"])
    dest = generate_midi(row["key"], chords, bpm=bpm)
    return FileResponse(str(dest), media_type="audio/midi", filename=dest.name)
