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

### Known Issue — TPM Rate Limit on Tool Call Rounds

The Groq free tier has a 12,000 tokens-per-minute (TPM) limit. Tool definitions (~2000 tokens) + system prompt + knowledge base + history can consume most of this in one round-trip.

**Applied fixes:**
- Tools definitions only sent on the first round (`tools=tools if _round == 0 else None`) — saves ~2000 tokens per second round
- Chat history reduced from 10 to 3 messages — saves ~500-700 tokens per request

**Future idea — split models by role:**
Use a lightweight/fast model (e.g., `llama-3.1-8b-instant`) for the tool-calling round (it just needs to decide which tool to call) and a heavier model (`llama-3.3-70b-versatile`) for generating the final text response. Benefits:
- Lightweight tool round uses fewer tokens, lower TPM
- Heavy model text round doesn't include tool definitions — no wasted tokens
- Each model stays within its own TPM window
Enables finer-grained rate-limit management. Implement as a config option in the provider layer.

---

## Track F2 — MIDI Analysis & Generator Rework

**Starting with data-driven analysis of real MIDI files, then rewrite generators from statistics.**

### Philosophy

**Vibe over genre.** A good progression is good regardless of genre label. MIDI files are tagged by character (`_chill`, `_driving`, `_dark`, `_heavy`, `_melodic`, etc.) rather than siloed into genres. Tempo comes from the project, not the MIDI file. Genre/style references (`_dnb`, `_house`, `_techno`) are optional tags for searchability, not hard boundaries.

### MIDI File Naming Convention

```
<descriptive_name>_<vibe>_<style_ref>.<ext>
```

Examples: `pianomelody_chill.mid`, `bassline_heavy_dnb.mid`, `chords_melodic_deephouse.mid`, `drums_fast_dnb.mid`, `arp_driving_trance.mid`, `pad_dark_techno.mid`

**Rule:** First underscore-separated segment = name. All remaining segments = freeform tags. No required tags. Everything is optional. Parser handles bare filenames gracefully (`pianomelody.mid` → name=`pianomelody`, tags=[]).

### Folder Structure

```
data/
├── midi/
│   ├── user_picked/          ← User's hand-picked files
│   ├── bulk_chords/          ← Cloned GitHub chord repo (13k files)
│   ├── bulk_melodies/        ← User-curated melody/bass downloads
│   └── any_future_folders/   ← Drop anytime, script walks all
└── analysis/
    ├── scan_cache.json        ← Auto-managed (path → last_modified)
    └── stats.json             ← Per-file + aggregate statistics
```

### Implementation Steps

#### Step 1 — `scripts/analyze_midi.py` (analysis script)

**Usage:**
```bash
python scripts/analyze_midi.py              # scan data/midi/, skip cached files
python scripts/analyze_midi.py --force       # re-scan everything
python scripts/analyze_midi.py --data-dir custom/path
```

**Dependencies:** `pretty_midi`, `json`, `pathlib`, `os` — all already installed or stdlib.

**Cache system:**
- `data/analysis/scan_cache.json` maps absolute file path → last modified timestamp
- New files → scan + cache
- Changed files → re-scan + update timestamp
- Unchanged files → skip (fast, no re-analysis)
- Deleted files → auto-removed from cache

**Filename parser:**
- Split by `_`, first segment = name, rest = tags list
- No crash on missing tags or unusual characters
- Returns `{name: str, tags: list[str]}`

**Per-file analysis (pretty_midi):**

| Category | Detection |
|----------|-----------|
| chords (polyphonic) | Any beat with ≥2 simultaneous notes |
| bass (monophonic, ≤60) | Single notes, median pitch ≤ 60 |
| melody (monophonic, >60) | Single notes, median pitch > 60 |

**Extracted statistics per file:**

| Statistic | Description |
|-----------|-------------|
| `pitch_hist` | Count of each MIDI note number (0-127) |
| `pitch_class` | Count of each pitch class (0-11), normalized |
| `interval_matrix` | Transition counts between consecutive pitch differences (e.g., `{"+1": 42, "+2": 18, "0": 12, "-1": 30, ...}`) |
| `vel_profile` | Average velocity per beat-position bucket (1, 1.25, 1.5, 1.75, 2, ...) within a bar |
| `vel_hist` | Distribution of all velocity values |
| `duration_hist` | Count of each note length in beats (0.125, 0.25, 0.5, 1.0, 2.0, etc.) |
| `notes_per_bar` | Average number of notes per bar |
| `gap_times` | Distribution of silence gaps between note endings and next note starts |
| `phrase_shape` | Average pitch direction profile across phrase positions (start/mid/end) |

**Aggregated statistics:**

Grouped by:
- **Tag** — any tag that appears in ≥3 files gets its own aggregate (e.g., `chill`, `heavy`, `dnb`)
- **Type** — melody, bass, chords (auto-detected)
- **Tag × Type** — cross-product for finer granularity (e.g., `chill_melody`, `heavy_bass`)
- **Overall** — all files combined

**Output:**
- `data/analysis/stats.json` — full machine-readable JSON with per-file + all aggregates
- Terminal summary — human-readable highlights printed to stdout

#### Step 2 — `scripts/download_bulk_midis.py` (bulk downloader, done later)

**Features:**
- Clone [ldrolez/free-midi-chords](https://github.com/ldrolez/free-midi-chords) → `data/midi/bulk_chords/`
- Optionally scrape selected free MIDI packs for melodies/basslines
- Respects gitignore, idempotent (won't re-download if folder exists)

### Future uses for the analysis infrastructure

- **Library search** — find MIDIs by vibe using extracted feature vectors
- **AI Studio context** — feed real statistical patterns to chat instead of hardcoded KB
- **Comparison tool** — compare a new MIDI to corpus ("this melody is unusually sparse for your taste")
- **Melody completion** — given a seed, suggest continuations from corpus patterns
- **Generator diagnostics** — compare generator output to real MIDI stats side-by-side

### Generator Rework (after analysis)

Each generator gets rewritten using extracted statistics:

#### Melody Generator (`plugins/melody_generator/plugin.py`)
- Replace `PRandomWalk` on scale degrees with an interval transition model sampled from corpus data
- Add rest insertion at corpus-observed density (genre/vibe-dependent)
- Add phrase contour (ascend → peak → descend) from corpus phrase shapes
- Replace static velocity patterns with corpus-derived beat-position velocity profiles

#### Bassline Generator (`plugins/bassline_generator/plugin.py`)
- Replace hardcoded patterns (root_fifth, walking, etc.) with corpus-derived pitch and rhythm distributions
- Add harmonic anchoring (follow chord progression roots at corpus rate)
- Use corpus duration distributions per vibe

#### Chord Generator (`plugins/chord_generator/plugin.py`)
- Add inversions and spread voicings (drop 2, drop 3) at corpus frequency
- Add extended chords (9th, sus4, add9) based on corpus prevalence
- Replace template selection with corpus-derived transition probabilities between roman numerals
- Better voice leading informed by corpus voice-leading patterns

#### Approach
1. ✅ Write `scripts/analyze_midi.py` — scan, cache, extract, aggregate, output
2. ⬜ Write `scripts/download_bulk_midis.py` — bulk chord repo + optional packs
3. ⬜ User drops curated files → first full analysis run
4. ⬜ Review statistics together, identify patterns
5. ⬜ Rewrite generators one at a time, comparing output to corpus stats
6. ⬜ Iterate: add more MIDIs, re-analyze, refine generators
