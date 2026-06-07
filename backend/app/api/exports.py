from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse

from backend.app.core.config import settings

router = APIRouter(prefix="/exports", tags=["exports"])


@router.get("/{filename}")
async def download_export(filename: str):
    safe_filename = Path(filename).name  # Strips all path traversal characters
    file_path = settings.export_dir / safe_filename
    if not file_path.exists():
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(file_path), media_type="audio/midi", filename=filename)
