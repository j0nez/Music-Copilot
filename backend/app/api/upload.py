import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, File

from backend.app.core.config import settings
from backend.app.core.exceptions import FileValidationError
from backend.app.models.shared import ApiResponse

logger = logging.getLogger("music_copilot.upload")

router = APIRouter(prefix="/upload", tags=["upload"])

ALLOWED_EXTENSIONS = {".wav", ".mp3", ".flac", ".ogg", ".aiff", ".aif", ".m4a"}
ALLOWED_MIMETYPES = {
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/flac",
    "audio/x-flac",
    "audio/ogg",
    "audio/vorbis",
    "audio/aiff",
    "audio/x-aiff",
    "audio/x-m4a",
    "audio/mp4",
}


@router.post("/")
async def upload_audio(file: UploadFile = File(...)):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise FileValidationError(
            f"Unsupported file type '{ext}'. "
            f"Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    mime = file.content_type or ""
    if mime and mime not in ALLOWED_MIMETYPES:
        raise FileValidationError(f"Unsupported media type '{mime}'")

    upload_dir = settings.upload_dir
    upload_dir.mkdir(parents=True, exist_ok=True)

    stem = uuid.uuid4().hex
    dest = upload_dir / f"{stem}{ext}"

    content = await file.read()
    dest.write_bytes(content)

    logger.info("File uploaded: %s (%s, %d bytes)", dest.name, mime, len(content))

    return ApiResponse(
        success=True,
        data={
            "file_path": str(dest),
            "original_name": file.filename,
            "size_bytes": len(content),
            "format": ext.lstrip("."),
        },
    )
