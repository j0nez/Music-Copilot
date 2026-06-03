# Backend Architecture

The backend is a Python FastAPI application with an async service layer, SQLite persistence, and a plugin orchestration system.

## Application Structure

```
backend/
└── app/
    ├── main.py          # FastAPI app creation, lifespan, router registration
    ├── api/             # Route handlers (thin layer, delegates to services)
    ├── core/            # Config, DI, app dependencies
    ├── models/          # Pydantic schemas (request/response)
    ├── services/        # Business logic (audio, midi, theory, chat)
    └── db/              # SQLite connection management
```

## App Lifespan

```python
# backend/app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from plugins import discover_plugins
from backend.app.db.database import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()                       # Initialize SQLite tables
    discover_plugins()              # Auto-discover all plugins
    yield
    # Shutdown (cleanup if needed)

app = FastAPI(title="Music Copilot", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
from backend.app.api import analyze, generate, chat, plugins as plugin_routes
app.include_router(analyze.router, prefix="/api")
app.include_router(generate.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(plugin_routes.router, prefix="/api")
```

## Route → Service → Plugin Pattern

Routes are thin — they validate input and delegate:

```python
# backend/app/api/analyze.py
from fastapi import APIRouter, UploadFile
from backend.app.services.audio.analyzer import AudioAnalysisService

router = APIRouter()

@router.post("/analyze/sample")
async def analyze_sample(file: UploadFile):
    result = await AudioAnalysisService.analyze(file)
    return {"success": True, "data": result}
```

Services orchestrate multiple operations, including plugin execution:

```python
# backend/app/services/audio/analyzer.py
from plugins import execute_plugin

class AudioAnalysisService:
    @staticmethod
    async def analyze(file: UploadFile) -> dict:
        # Save file temporarily
        # Call the SampleAnalyzer plugin
        result = await execute_plugin("sample_analyzer", filepath=temp_path)
        # Store result in DB
        # Return analysis
        return result.data
```

## Dependency Injection

FastAPI's `Depends` is used for shared dependencies:

```python
from fastapi import Depends
from backend.app.db.database import get_connection

def get_db():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()

@router.get("/samples")
async def list_samples(db=Depends(get_db)):
    cursor = db.execute("SELECT * FROM samples ORDER BY created_at DESC")
    return cursor.fetchall()
```

## Error Handling

Hybrid approach: typed exceptions for internal routing and logging, but `PluginResult` return values for the API layer with a safety-net global handler.

### Exception Hierarchy

```python
class MusicCopilotError(Exception):
    code: str          # Machine-readable, e.g. "INVALID_FILE"
    message: str       # Human-readable default message
    status_code: int   # HTTP status code
    severity: str      # "ERROR" | "WARNING"

class InputValidationError(MusicCopilotError):
    code = "INVALID_INPUT"
    status_code = 422
    severity = "WARNING"

class PluginNotFoundError(MusicCopilotError):
    code = "PLUGIN_NOT_FOUND"
    status_code = 404
    severity = "WARNING"

class PluginExecutionError(MusicCopilotError):
    code = "PLUGIN_ERROR"
    status_code = 500

class AIProviderError(MusicCopilotError):
    code = "AI_ERROR"
    status_code = 502

class FileValidationError(MusicCopilotError):
    code = "INVALID_FILE"
    status_code = 422

class DatabaseError(MusicCopilotError):
    code = "DATABASE_ERROR"
    status_code = 500
```

### Error Flow

```
Unexpected Exception (anywhere)
        │
        ├──► Global handler catches it
        │     logger.critical() + HTTP 500 + ApiResponse(error)
        │
Plugin code raises Exception
        │
        ├──► execute_plugin() catches it
        │     logger.error() + returns PluginResult(success=False)
        │
Input validates via Pydantic schema
        │
        ├──► ValidationError caught by execute_plugin()
        │     logger.warning() + returns PluginResult(success=False)
        │
MusicCopilotError raised
        │
        ├──► Global handler catches it
        │     logger.error/warning() + correct HTTP status + ApiResponse(error)
```

### Global Exception Handlers

Registered in `main.py`:

```python
@app.exception_handler(MusicCopilotError)
async def handle_music_copilot_error(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content=ApiResponse(success=False, error={"code": exc.code, "message": exc.message}),
    )

@app.exception_handler(Exception)
async def handle_unexpected_error(request, exc):
    logger.critical("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content=ApiResponse(success=False, error={"code": "INTERNAL_ERROR", "message": "..."}),
    )
```

## Logging

Standard Python logging with rotating file handler (5MB per file, 3 backups):

```
data/logs/app.log          # Current log
data/logs/app.log.1        # Rotated
data/logs/app.log.2
data/logs/app.log.3
```

Format: `2026-06-03 16:30:00 | ERROR | music_copilot.plugins | Plugin 'x' failed`

Configured via `Settings.log_path` and `Settings.log_level`. The level can be toggled between DEBUG (verbose) and INFO (production) without code changes.

## Key Conventions

- All routes are async.
- Service methods are static or class methods (no service instances needed in v0.1).
- Database connections are short-lived (request-scoped via Depends).
- Plugins are executed via `execute_plugin(name, **kwargs)` — never imported directly.
- Errors are logged at the correct severity (WARNING for user errors, ERROR for system failures, CRITICAL for unhandled crashes).
- The rotating log file is read-only for debugging — never programmatically parsed.
