import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.api import arrangement as arrangement_routes
from backend.app.api import exports as export_routes
from backend.app.api import plugins as plugin_routes
from backend.app.api import progressions as progression_routes
from backend.app.api import providers as provider_routes
from backend.app.api import projects as project_routes
from backend.app.api import search as search_routes
from backend.app.api import upload as upload_routes
from backend.app.core.config import settings
from backend.app.core.exceptions import MusicCopilotError
from backend.app.core.logging import setup_logging
from backend.app.api.providers import load_persisted_config
from backend.app.db.database import init_db
from backend.app.models.shared import ApiResponse
from plugins import discover_plugins
from providers import configure as configure_provider
from providers import configure_priority
from providers.openai_provider import OpenAIProvider  # noqa: F401
from providers.groq_provider import GroqProvider  # noqa: F401
from providers.glm_provider import GLMProvider  # noqa: F401
from providers.openrouter_provider import OpenRouterProvider  # noqa: F401

logger = logging.getLogger("music_copilot.app")


def _configure_provider_priority() -> None:
    from providers import configure, get_provider_info
    priority_str = settings.ai_provider_priority
    if not priority_str:
        return
    priority = [p.strip() for p in priority_str.split(",") if p.strip()]
    existing = [p["name"] for p in get_provider_info() if p["configured"]]
    for p in priority:
        if p not in existing:
            try:
                configure(p, "", model=settings.ai_model)
            except ValueError:
                logger.warning("Provider %s not registered, skipping priority", p)
    try:
        from providers import configure_priority as set_prio
        set_prio([p for p in priority if p in [x["name"] for x in get_provider_info()]])
    except (ValueError, RuntimeError) as e:
        logger.warning("Could not set provider priority: %s", e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(settings.log_path, settings.log_level)
    logger.info("Starting Music Copilot v%s", settings.app_version)
    init_db()
    discover_plugins()
    load_persisted_config()
    if settings.ai_api_key:
        configure_provider(settings.ai_provider, settings.ai_api_key, model=settings.ai_model)
    _configure_provider_priority()
    yield
    logger.info("Shutting down Music Copilot")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(arrangement_routes.router, prefix="/api")
app.include_router(export_routes.router, prefix="/api")
app.include_router(plugin_routes.router, prefix="/api")
app.include_router(progression_routes.router, prefix="/api")
app.include_router(provider_routes.router)
app.include_router(project_routes.router, prefix="/api")
app.include_router(search_routes.router, prefix="/api")
app.include_router(upload_routes.router, prefix="/api")


@app.exception_handler(MusicCopilotError)
async def handle_music_copilot_error(request, exc: MusicCopilotError):
    log_method = logger.error if exc.severity == "ERROR" else logger.warning
    log_method("%s | %s", exc.code, exc.message)
    return JSONResponse(
        status_code=exc.status_code,
        content=ApiResponse(
            success=False,
            error={"code": exc.code, "message": exc.message},
        ).model_dump(),
    )


@app.exception_handler(Exception)
async def handle_unexpected_error(request, exc: Exception):
    logger.critical("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content=ApiResponse(
            success=False,
            error={"code": "INTERNAL_ERROR", "message": "An unexpected error occurred"},
        ).model_dump(),
    )


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": settings.app_version}
