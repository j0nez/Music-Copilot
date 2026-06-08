import logging

from shared.tools import Tool, ToolRegistry
from backend.app.api.arrangement import ArrangementNote

logger = logging.getLogger("music_copilot.tools")

_NOTE_SCHEMA = {
    "type": "object",
    "properties": {
        "pitch": {"type": "integer", "minimum": 0, "maximum": 127, "description": "MIDI note number (60 = middle C)"},
        "velocity": {"type": "integer", "minimum": 0, "maximum": 127, "default": 100},
        "start_beat": {"type": "number", "minimum": 0, "description": "Beat position (1.0 = first beat)"},
        "duration_in_beats": {"type": "number", "minimum": 0.125, "description": "Note length in beats"},
    },
    "required": ["pitch", "start_beat", "duration_in_beats"],
}

_NOTE_LIST_SCHEMA = {
    "type": "object",
    "properties": {
        "notes": {
            "type": "array",
            "items": _NOTE_SCHEMA,
            "description": "Array of notes to create",
        },
    },
    "required": ["notes"],
}


async def _validate_notes(notes: list[dict]) -> list[dict]:
    validated: list[dict] = []
    for n in notes:
        note = ArrangementNote(
            pitch=n["pitch"],
            velocity=n.get("velocity", 100),
            start_beat=float(n.get("start_beat", 1.0)),
            duration_in_beats=float(n.get("duration_in_beats", 1.0)),
        )
        validated.append(note.model_dump())
    logger.info("Validated %d notes", len(validated))
    return validated


async def handle_create_melody(notes: list[dict]) -> dict:
    validated = await _validate_notes(notes)
    return {"type": "melody", "notes": validated}


async def handle_create_bassline(notes: list[dict]) -> dict:
    validated = await _validate_notes(notes)
    return {"type": "bassline", "notes": validated}


async def handle_create_chords(notes: list[dict]) -> dict:
    validated = await _validate_notes(notes)
    return {"type": "chords", "notes": validated}


async def handle_web_search(query: str) -> dict:
    try:
        from duckduckgo_search import DDGS
        results = list(DDGS().text(query, max_results=3))
        formatted = "\n\n".join(
            f"{r['title']}\n{r['body']}" for r in results
        )
        logger.info("Web search for '%s' returned %d results", query, len(results))
        return {"results": formatted[:4000]}
    except ImportError:
        logger.warning("duckduckgo_search not installed")
        return {"results": "Search unavailable (library not installed)."}
    except Exception as e:
        logger.error("Web search failed: %s", e)
        return {"results": f"Search failed: {e}"}


ToolRegistry.register(Tool(
    name="create_melody",
    description="Create melody notes. Each note must have pitch (0-127), velocity (0-127, default 100), start_beat (beat position), and duration_in_beats.",
    parameters=_NOTE_LIST_SCHEMA,
    handler=handle_create_melody,
))

ToolRegistry.register(Tool(
    name="create_bassline",
    description="Create bassline notes. Each note must have pitch (0-127), velocity (0-127, default 100), start_beat (beat position), and duration_in_beats.",
    parameters=_NOTE_LIST_SCHEMA,
    handler=handle_create_bassline,
))

ToolRegistry.register(Tool(
    name="create_chords",
    description="Create chord notes. Each note must have pitch (0-127), velocity (0-127, default 100), start_beat (beat position), and duration_in_beats. Use one note per chord tone per beat for chord voicings.",
    parameters=_NOTE_LIST_SCHEMA,
    handler=handle_create_chords,
))

ToolRegistry.register(Tool(
    name="web_search",
    description="Search the web for current information. Use this when you need FL Studio documentation, tutorials, music theory references, or any information not in the knowledge base.",
    parameters={
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "The search query"},
        },
        "required": ["query"],
    },
    handler=handle_web_search,
))

logger.info("Registered %d tools: %s", len(ToolRegistry._tools), list(ToolRegistry._tools.keys()))
