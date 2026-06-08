# Phase F — ToolBridge + Generator Rework

**Status:** Ready for implementation
**Last updated:** 2026-06-07
**Total effort:** ~350 lines across two tracks

---

## Overview

Two independent tracks:

| Track | What | Est. Lines | Priority |
|-------|------|-----------|----------|
| **F1 — ToolBridge** | AI can call tools: create notes (melody/bassline/chords) + web search via DuckDuckGo | ~270 | High |
| **F2 — Generator Rework** | Improve melody/bassline/chord generators using real MIDI examples as guidelines | ~200 | Medium |

**F1 first, then F2.** User wants to do more music theory research before tackling generators.

---

## Design Decisions

1. **Tool notes replace current part** — When AI calls `create_melody`, the notes replace whatever is in the MIDI Player (like pressing "Generate"). Not append.
2. **DuckDuckGo for web search** — Free, no API key. The AI decides when to search vs. use the knowledge base.
3. **MIDI examples are guidelines, not templates** — The generator rework extracts structural patterns (note density, interval preferences, rhythm patterns, velocity profiles) from real MIDI files without hardcoding specific melodies.
4. **Plugin wrapping** — Existing generators remain available. ToolBridge adds a direct note-construction path alongside them.

---

## Architecture

```
User message: "Create a C minor melody — C D Eb F G Ab Bb C"
        │
        ▼
POST /api/chat ───→ Chat dispatch loop
                           │
                    ┌──────┴──────┐
                    │              │
              ToolRegistry    Provider.generate()
              (tools.py)      (with tools=[])
                    │              │
                    └──────┬──────┘
                           │
                           ▼
                    Groq/OpenRouter API
                    (tool_call in response)
                           │
                           ▼
                    ToolRegistry.call(tool_name, args)
                    → validates notes
                    → returns tool result
                           │
                           ▼
                    Second generate() call with tool result
                    → final text response
                           │
                           ▼
Response: { reply: "...", tool_data: { melody: Note[] } }
                           │
                           ▼
Frontend → applies tool_data to MIDI Player state
         → notes playable immediately
```

### Tool call flow (max 5 rounds)

```
Round 1: user message → Groq decides to call create_melody
         │
         ▼ validate + store result
         │
Round 2: tool result sent back → Groq generates final reply
         │
         ▼ return reply + tool_data
```

---

## Track F1 — ToolBridge Implementation

### Files to create

| File | Purpose | Lines |
|------|---------|-------|
| `shared/tools.py` | `Tool` dataclass + `ToolRegistry` (register, list, call) | ~70 |

### Files to modify

| File | Change | Lines |
|------|--------|-------|
| `providers/interface.py` | Add `tool_calls: list` field to `LLMResponse` | +2 |
| `providers/groq_provider.py` | Inject `tools` from kwargs into API payload; parse `tool_calls` from response | +15 |
| `providers/openrouter_provider.py` | Same as Groq | +15 |
| `backend/app/api/chat.py` | Add dispatch loop + `tool_data` to `ChatResponse` | +50 |
| `backend/app/api/tools.py` | New — register all tools | +80 |
| `frontend/src/renderer/components/AiStudio.tsx` | Add `onToolNotes` prop, apply `tool_data` from response | +20 |
| `frontend/src/renderer/pages/Dashboard.tsx` | Wire `onToolNotes` → generation handlers / setChords | +15 |
| `frontend/src/renderer/types.ts` | Add `tool_data?: { melody?, bassline?, chords? }` to chat response type | +5 |
| `backend/pyproject.toml` | Add `duckduckgo-search` dependency | +1 |

### Step-by-step

#### Step 1 — Tool schema + registry (`shared/tools.py`)

```python
@dataclass
class Tool:
    name: str
    description: str
    parameters: dict  # JSON Schema
    handler: Callable[..., Awaitable[Any]]

class ToolRegistry:
    _tools: dict[str, Tool] = {}

    @classmethod
    def register(cls, tool: Tool) -> None: ...
    @classmethod
    def get(cls, name: str) -> Tool | None: ...
    @classmethod
    def list(cls) -> list[dict]: ...
    @classmethod
    async def call(cls, name: str, arguments: dict) -> Any: ...
```

#### Step 2 — Provider layer (`interface.py`, `groq_provider.py`, `openrouter_provider.py`)

- `LLMResponse.tool_calls: list = []` — stores raw tool_call dicts from API
- Both providers: read `tools` from kwargs → `payload["tools"] = tools`
- Parse response: `choice["message"].get("tool_calls", [])` → store in `LLMResponse.tool_calls`
- Content may be `None` when tool_calls are present — handle gracefully

#### Step 3 — Note creation tools (`backend/app/api/tools.py`)

Four tools registered at import time:

| Tool | Parameters | Returns |
|------|-----------|---------|
| `create_melody` | `notes: list[{pitch, velocity, start_beat, duration_in_beats}]` | `Note[]` |
| `create_bassline` | `notes: list[{pitch, velocity, start_beat, duration_in_beats}]` | `Note[]` |
| `create_chords` | `notes: list[{pitch, velocity, start_beat, duration_in_beats}]` | `Note[]` |
| `web_search` | `query: str` | `str` (formatted results) |

All three note tools:
- Validate required fields, types, ranges (pitch 0-127, velocity 0-127, etc.)
- Return the notes array unchanged on success
- Return error message on validation failure

`web_search` tool:
- Uses `duckduckgo_search` library (`DDGS.text(query, max_results=3)`)
- Returns formatted snippet: title + body for each result
- Truncated to ~4000 chars to fit context window
- Timeout: 10 seconds

#### Step 4 — Chat dispatch loop (`backend/app/api/chat.py`)

Modified flow:
1. Gather tools from `ToolRegistry.list()` (always include all)
2. Call `generate(prompt, tools=tools, ...)`
3. If `response.tool_calls` is non-empty:
   a. For each tool_call, call `ToolRegistry.call(name, arguments)`
   b. Append tool results as `{"role": "tool", ...}` messages
   c. Call `generate()` again (up to 5 rounds)
4. Return final `ChatResponse` with:
   - `reply` — final assistant text
   - `tool_data` — dict of accumulated tool results `{melody: Note[], ...}`

```
ChatResponse(BaseModel):
    reply: str
    model_used: str
    provider_used: str
    tokens_used: int
    tool_data: dict | None = None
```

#### Step 5 — Frontend integration

**types.ts** — Extend the chat response type:
```typescript
interface ChatResult {
  reply: string;
  model_used: string;
  provider_used: string;
  tokens_used: number;
  tool_data?: {
    melody?: Note[];
    bassline?: Note[];
    chords?: Note[];
  };
}
```

**AiStudio.tsx** — Add `onToolNotes` prop:
```typescript
interface AiStudioProps {
  project: Project | null;
  activeParts: Record<string, ActivePartsSummary>;
  onToolNotes?: (notes: { melody?: Note[]; bassline?: Note[]; chords?: Note[] }) => void;
}
```

In `handleSend`, after receiving response with `tool_data`, call `onToolNotes`.

**Dashboard.tsx** — Pass handler:
```tsx
<AiStudio
  project={project}
  activeParts={activeParts}
  onToolNotes={(notes) => {
    if (notes.chords) setChords(notes.chords);
    if (notes.melody) setMelody(notes.melody);
    if (notes.bassline) setBassline(notes.bassline);
  }}
/>
```

#### Step 6 — System prompt update (`backend/app/api/chat.py`)

Add to the end of `_SYSTEM_PROMPT_TEMPLATE`:

```
When the user asks you to create or modify musical content, use the available tools:
- create_melody — Create melody notes (each note: pitch, velocity, start_beat, duration_in_beats)
- create_bassline — Create bassline notes
- create_chords — Create chord notes (one note per chord tone per beat)
- web_search — Search the web for current information

Use web_search when you need information not covered in the knowledge base,
such as FL Studio shortcuts, current documentation, or tutorials.
```

---

## Track F2 — Generator Rework

**Will be detailed after ToolBridge is done and user shares MIDI examples.**

### Planned improvements

#### Melody Generator (`plugins/melody_generator/plugin.py`)
- Add rest insertion (genre-dependent density)
- Add phrase contour (ascend → peak → descend)
- Better interval selection per genre
- Genre-specific velocity profiles

#### Bassline Generator (`plugins/bassline_generator/plugin.py`)
- Harmonic anchoring (follow chord progression roots)
- Better rhythm patterns from real examples
- Genre-specific note lengths and octaves

#### Chord Generator (`plugins/chord_generator/plugin.py`)
- Inversions and spread voicings (drop 2, drop 3)
- Extended chords (9th, sus4, add9 in advanced mode)
- Genre-aware template selection
- Better voice leading across full progression

#### Approach
1. User shares MIDI files per genre/culture/instrument
2. Analyze for: note distributions, interval preferences, rest density, velocity profiles, rhythm patterns
3. Build genre-specific pattern tables
4. Implement improved generators
5. Test: compare output patterns to real MIDI statistics
