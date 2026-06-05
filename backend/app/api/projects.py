import logging

from fastapi import APIRouter

from backend.app.core.exceptions import InputValidationError, DatabaseError
from backend.app.db.projects import (
    create_project,
    delete_project,
    get_last_project,
    get_project,
    list_projects,
    save_last_project,
    update_project,
)
from backend.app.models.shared import ApiResponse, ErrorDetail

logger = logging.getLogger("music_copilot.projects_api")

router = APIRouter(prefix="/projects", tags=["projects"])


CREATE_FIELDS = {"name", "bpm", "key", "scale"}


@router.post("/")
async def api_create_project(payload: dict):
    name = str(payload.get("name", "Untitled Project"))
    bpm = payload.get("bpm", 120)
    key = payload.get("key", "C")
    scale = payload.get("scale", "Major")

    if not isinstance(bpm, int) or bpm < 1 or bpm > 999:
        raise InputValidationError("bpm must be an integer between 1 and 999")
    if not isinstance(key, str) or not key.strip():
        raise InputValidationError("key must be a non-empty string")
    if not isinstance(scale, str) or not scale.strip():
        raise InputValidationError("scale must be a non-empty string")

    try:
        project_id = create_project(name, bpm, key.strip(), scale.strip())
        save_last_project(project_id)
    except Exception as exc:
        raise DatabaseError(f"Failed to create project: {exc}") from exc

    return ApiResponse(success=True, data={"id": project_id})


@router.get("/")
async def api_list_projects():
    try:
        items = list_projects()
    except Exception as exc:
        raise DatabaseError(f"Failed to list projects: {exc}") from exc

    return ApiResponse(success=True, data={"projects": items})


@router.get("/last")
async def api_get_last_project():
    try:
        project_id = get_last_project()
        if project_id is None:
            return ApiResponse(success=True, data={"project": None})
        project = get_project(project_id)
        return ApiResponse(success=True, data={"project": project})
    except Exception as exc:
        raise DatabaseError(f"Failed to get last project: {exc}") from exc


@router.get("/{project_id}")
async def api_get_project(project_id: int):
    try:
        project = get_project(project_id)
    except Exception as exc:
        raise DatabaseError(f"Failed to get project: {exc}") from exc

    if project is None:
        return ApiResponse(
            success=False,
            data=None,
            error=ErrorDetail(code="NOT_FOUND", message=f"Project {project_id} not found"),
        )

    return ApiResponse(success=True, data={"project": project})


@router.put("/{project_id}")
async def api_update_project(project_id: int, payload: dict):
    if not payload:
        raise InputValidationError("No fields to update")

    try:
        updated = update_project(project_id, **payload)
    except Exception as exc:
        raise DatabaseError(f"Failed to update project: {exc}") from exc

    if not updated:
        return ApiResponse(
            success=False,
            data=None,
            error=ErrorDetail(code="NOT_FOUND", message=f"Project {project_id} not found"),
        )

    project = get_project(project_id)
    return ApiResponse(success=True, data={"project": project})


@router.delete("/{project_id}")
async def api_delete_project(project_id: int):
    try:
        deleted = delete_project(project_id)
    except Exception as exc:
        raise DatabaseError(f"Failed to delete project: {exc}") from exc

    if not deleted:
        return ApiResponse(
            success=False,
            data=None,
            error=ErrorDetail(code="NOT_FOUND", message=f"Project {project_id} not found"),
        )

    return ApiResponse(success=True, data={"deleted": True})
