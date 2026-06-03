from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api import plugins as plugin_routes
from backend.app.core.config import settings
from backend.app.db.database import init_db
from plugins import discover_plugins
from providers.openai_provider import OpenAIProvider  # noqa: F401
from providers.groq_provider import GroqProvider  # noqa: F401
from providers.glm_provider import GLMProvider  # noqa: F401
from providers.openrouter_provider import OpenRouterProvider  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    discover_plugins()
    yield


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

app.include_router(plugin_routes.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": settings.app_version}
