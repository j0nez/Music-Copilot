from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from backend.app.core.config import settings

router = APIRouter(prefix="/exports", tags=["exports"])

ALLOWED_EXTENSIONS = {".mid", ".midi"}


@router.get("/{filename}")
async def download_export(filename: str):
    safe_filename = Path(filename).name
    file_path = settings.export_dir / safe_filename

    if file_path.suffix.lower() not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        resolved = file_path.resolve()
        allowed = settings.export_dir.resolve()
        if not resolved.is_relative_to(allowed):
            raise HTTPException(status_code=404, detail="File not found")
    except (ValueError, OSError):
        raise HTTPException(status_code=404, detail="File not found")

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(str(file_path), media_type="audio/midi", filename=filename)
