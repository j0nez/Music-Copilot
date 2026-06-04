import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.api import exports as export_routes
from backend.app.api import plugins as plugin_routes
from backend.app.api import progressions as progression_routes
from backend.app.api import upload as upload_routes
from backend.app.core.config import settings
from backend.app.core.exceptions import MusicCopilotError
from backend.app.core.logging import setup_logging
from backend.app.db.database import init_db
from backend.app.models.shared import ApiResponse
from plugins import discover_plugins
from providers.openai_provider import OpenAIProvider  # noqa: F401
from providers.groq_provider import GroqProvider  # noqa: F401
from providers.glm_provider import GLMProvider  # noqa: F401
from providers.openrouter_provider import OpenRouterProvider  # noqa: F401

logger = logging.getLogger("music_copilot.app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(settings.log_path, settings.log_level)
    logger.info("Starting Music Copilot v%s", settings.app_version)
    init_db()
    discover_plugins()
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

app.include_router(export_routes.router, prefix="/api")
app.include_router(plugin_routes.router, prefix="/api")
app.include_router(progression_routes.router, prefix="/api")
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
