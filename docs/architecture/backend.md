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

Custom exception hierarchy mapped to HTTP responses:

```python
class MusicCopilotError(Exception):
    code: str
    status_code: int
    message: str

class FileValidationError(MusicCopilotError):
    code = "INVALID_FILE"
    status_code = 422

class PluginExecutionError(MusicCopilotError):
    code = "PLUGIN_ERROR"
    status_code = 500

# Global exception handler in main.py
@app.exception_handler(MusicCopilotError)
async def handle_music_copilot_error(request, exc: MusicCopilotError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "data": None, "error": {"code": exc.code, "message": exc.message}},
    )
```

## Key Conventions

- All routes are async.
- Service methods are static or class methods (no service instances needed in v0.1).
- Database connections are short-lived (request-scoped via Depends).
- Plugins are executed via `execute_plugin(name, **kwargs)` — never imported directly.
