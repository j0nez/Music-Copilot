import logging
from pathlib import Path

from fastapi import APIRouter, Query
from pydantic import BaseModel

from backend.app.core.config import settings
from backend.app.db.chat import clear_history, get_history, save_message
from backend.app.models.shared import ApiResponse

logger = logging.getLogger("music_copilot.api.chat")

router = APIRouter(prefix="/api/chat", tags=["chat"])

_KNOWLEDGE_BASE_PATH = Path(__file__).resolve().parent.parent.parent.parent / "shared" / "knowledge_base.txt"

_SYSTEM_PROMPT_TEMPLATE = """You are Music Copilot, an AI music production assistant for FL Studio producers. You help with music theory, arrangement, sound design, and production workflow.

=== Project Context ===
Key: {key} | Scale: {scale} | BPM: {bpm}
Genre: {genre} | Mood: {mood}
Active chords: {chords_summary}
Active melody: {melody_summary}
Active bassline: {bassline_summary}

=== Knowledge Base ===
{knowledge_base}
"""


class ActivePartsSummary(BaseModel):
    count: int = 0
    bars: int = 0
    root_notes: list[str] = []
    range: str = ""


class ProjectContext(BaseModel):
    key: str = "C"
    scale: str = "Major"
    bpm: int = 120
    mood: str = ""
    genre: str = ""
    active_parts: dict[str, ActivePartsSummary] = {}


class ChatRequest(BaseModel):
    message: str
    project_context: ProjectContext | None = None


class ChatResponse(BaseModel):
    reply: str
    model_used: str
    provider_used: str
    tokens_used: int


@router.post("")
async def chat(req: ChatRequest):
    ctx = req.project_context or ProjectContext()
    kb = _load_knowledge_base()
    parts = ctx.active_parts or {}

    system_prompt = _SYSTEM_PROMPT_TEMPLATE.format(
        key=ctx.key,
        scale=ctx.scale,
        bpm=ctx.bpm,
        genre=ctx.genre or "—",
        mood=ctx.mood or "—",
        chords_summary=_summarize_part(parts.get("chords")),
        melody_summary=_summarize_part(parts.get("melody")),
        bassline_summary=_summarize_part(parts.get("bassline")),
        knowledge_base=kb,
    )

    history = get_history(limit=10)
    messages = [{"role": h["role"], "content": h["message"]} for h in history]

    from providers import generate

    save_message("user", req.message)

    try:
        response = await generate(
            req.message,
            system_prompt=system_prompt,
            messages=messages,
            temperature=0.7,
            max_tokens=2048,
        )
    except Exception as e:
        logger.error("Chat generation failed: %s", e)
        save_message("assistant", f"Error: {e}")
        return ApiResponse(
            success=False,
            error={"code": "AI_ERROR", "message": str(e)},
        )

    save_message("assistant", response.content, provider=response.provider or "unknown", model=response.model)

    return ApiResponse(
        success=True,
        data=ChatResponse(
            reply=response.content,
            model_used=response.model,
            provider_used=response.model,
            tokens_used=response.tokens_used,
        ).model_dump(),
    )


@router.get("/history")
async def list_history(limit: int = Query(default=20, ge=1, le=100)):
    history = get_history(limit=limit)
    return ApiResponse(success=True, data={"history": history})


@router.delete("/history")
async def delete_history():
    clear_history()
    return ApiResponse(success=True, data={"cleared": True})


def _summarize_part(part: ActivePartsSummary | None) -> str:
    if part is None or part.count == 0:
        return "—"
    parts_str = []
    if part.count:
        parts_str.append(f"{part.count} notes over {part.bars} bars")
    if part.root_notes:
        parts_str.append(f"roots: {', '.join(part.root_notes)}")
    if part.range:
        parts_str.append(f"range: {part.range}")
    return " | ".join(parts_str)


def _load_knowledge_base() -> str:
    try:
        if _KNOWLEDGE_BASE_PATH.exists():
            return _KNOWLEDGE_BASE_PATH.read_text(encoding="utf-8")
    except Exception as e:
        logger.warning("Could not load knowledge base: %s", e)
    return ""
