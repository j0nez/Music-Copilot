from fastapi import APIRouter

from backend.app.models.shared import ApiResponse
from plugins import (
    execute_plugin,
    get_plugin_schema,
    list_plugins,
)

router = APIRouter(prefix="/plugins", tags=["plugins"])


@router.get("/")
async def list_all_plugins():
    return ApiResponse(
        success=True,
        data={"plugins": list_plugins()},
    )


@router.get("/{name}/schema")
async def plugin_schema(name: str):
    schema = get_plugin_schema(name)
    if schema is None:
        return ApiResponse(
            success=False,
            data=None,
            error={"code": "NOT_FOUND", "message": f"Plugin '{name}' has no schema or not found"},
        )
    return ApiResponse(success=True, data={"schema": schema})


@router.post("/{name}/execute")
async def run_plugin(name: str, payload: dict = {}):
    result = await execute_plugin(name, **payload)
    return ApiResponse(
        success=result.success,
        data=result.data if result.success else None,
        error={"code": "PLUGIN_ERROR", "message": result.error} if result.error else None,
    )
