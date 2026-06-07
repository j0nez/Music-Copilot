import logging
import time

from fastapi import APIRouter
from pydantic import BaseModel

from backend.app.db.database import get_connection
from backend.app.models.shared import ApiResponse

logger = logging.getLogger("music_copilot.api.providers")

router = APIRouter(prefix="/api/providers", tags=["providers"])


class ConfigureRequest(BaseModel):
    name: str
    api_key: str
    model: str | None = None


class PriorityRequest(BaseModel):
    priority: list[str]


class TestRequest(BaseModel):
    name: str


@router.get("")
async def list_providers():
    from providers import get_provider_info, get_priority
    providers = get_provider_info()
    for p in providers:
        p["healthy"] = _check_healthy(p["name"])
    return ApiResponse(
        success=True,
        data={
            "providers": providers,
            "priority": get_priority(),
        },
    )


@router.post("/configure")
async def configure_provider(req: ConfigureRequest):
    from providers import configure
    try:
        configure(req.name, req.api_key, model=req.model)
    except ValueError as e:
        return ApiResponse(success=False, error={"code": "INVALID_PROVIDER", "message": str(e)})

    _save_api_key(req.name, req.api_key)
    if req.model:
        _save_model(req.name, req.model)

    logger.info("Configured provider %s (model: %s)", req.name, req.model or "default")
    return ApiResponse(success=True, data={"configured": True})


@router.post("/priority")
async def set_priority(req: PriorityRequest):
    from providers import configure_priority
    try:
        configure_priority(req.priority)
    except ValueError as e:
        return ApiResponse(success=False, error={"code": "INVALID_PRIORITY", "message": str(e)})

    _save_priority(req.priority)
    logger.info("Provider priority set to: %s", req.priority)
    return ApiResponse(success=True, data={"priority": req.priority})


@router.post("/test")
async def test_provider(req: TestRequest):
    from providers import get_provider_info
    info_list = get_provider_info()
    info = next((p for p in info_list if p["name"] == req.name), None)
    if not info:
        return ApiResponse(success=False, error={"code": "NOT_FOUND", "message": f"Provider '{req.name}' not found"})
    if not info["configured"]:
        return ApiResponse(success=False, error={"code": "NOT_CONFIGURED", "message": f"Provider '{req.name}' is not configured"})

    from providers import configure
    try:
        start = time.monotonic()
        provider = configure(req.name, _load_api_key(req.name), model=info["model"] or None)
        await provider.generate("ping", _probe=True, max_tokens=1)
        elapsed = int((time.monotonic() - start) * 1000)
        return ApiResponse(success=True, data={"healthy": True, "latency_ms": elapsed})
    except Exception as e:
        return ApiResponse(success=False, error={"code": "TEST_FAILED", "message": str(e)})


def _save_api_key(provider: str, key: str) -> None:
    conn = get_connection()
    try:
        conn.execute("INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)",
                     (f"provider_key_{provider}", key))
        conn.commit()
    finally:
        conn.close()


def _load_api_key(provider: str) -> str:
    conn = get_connection()
    try:
        row = conn.execute("SELECT value FROM preferences WHERE key = ?",
                           (f"provider_key_{provider}",)).fetchone()
        return row["value"] if row else ""
    finally:
        conn.close()


def _save_model(provider: str, model: str) -> None:
    conn = get_connection()
    try:
        conn.execute("INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)",
                     (f"provider_model_{provider}", model))
        conn.commit()
    finally:
        conn.close()


def _save_priority(priority: list[str]) -> None:
    conn = get_connection()
    try:
        conn.execute("INSERT OR REPLACE INTO preferences (key, value) VALUES ('provider_priority', ?)",
                     (",".join(priority),))
        conn.commit()
    finally:
        conn.close()


def _check_healthy(name: str) -> bool:
    from providers import get_provider_info
    info_list = get_provider_info()
    info = next((p for p in info_list if p["name"] == name), None)
    if not info or not info["configured"]:
        return False
    if not _load_api_key(name):
        return False
    return True


def load_persisted_config() -> None:
    """Load persisted provider config from DB at startup."""
    from providers import configure
    conn = get_connection()
    try:
        priority_row = conn.execute(
            "SELECT value FROM preferences WHERE key = 'provider_priority'"
        ).fetchone()
        if priority_row:
            priority = [p.strip() for p in priority_row["value"].split(",") if p.strip()]
        else:
            priority = []

        rows = conn.execute(
            "SELECT key, value FROM preferences WHERE key LIKE 'provider_key_%'"
        ).fetchall()
        for row in rows:
            provider_name = row["key"].replace("provider_key_", "")
            api_key = row["value"]
            model_row = conn.execute(
                "SELECT value FROM preferences WHERE key = ?",
                (f"provider_model_{provider_name}",),
            ).fetchone()
            model = model_row["value"] if model_row else None
            try:
                configure(provider_name, api_key, model=model)
                logger.info("Loaded persisted config for provider %s", provider_name)
            except ValueError:
                logger.warning("Provider %s not available, skipping", provider_name)

        if priority:
            try:
                from providers import configure_priority
                configure_priority(priority)
            except (ValueError, RuntimeError) as e:
                logger.warning("Could not restore provider priority: %s", e)
    finally:
        conn.close()
