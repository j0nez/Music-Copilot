import logging

from fastapi import APIRouter, Query

from backend.app.core.exceptions import InputValidationError
from backend.app.db.search import search_all
from backend.app.models.shared import ApiResponse

logger = logging.getLogger("music_copilot.search_api")

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/")
async def search(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(20, ge=1, le=100, description="Max results"),
):
    if not q.strip():
        raise InputValidationError("Search query 'q' is required")
    try:
        results = search_all(q.strip(), limit=limit)
    except Exception as exc:
        logger.error("Search failed: %s", exc, exc_info=True)
        return ApiResponse(success=False, data={"results": []}, error={"code": "SEARCH_ERROR", "message": "Search failed"})
    return ApiResponse(success=True, data={"results": results})
