# Phase E — AI Studio Implementation Plan

**Status:** Ready for implementation
**Last updated:** 2026-06-07
**Total effort:** ~850 lines across 8 tasks

---

## Design Principles

1. **Extensibility first** — New providers/models are a ~30-line file addition. No changes to routing, API, or UI.
2. **Auto-failover** — If a provider returns 429 (rate limit), automatically try the next in priority order. Configurable priority list per user.
3. **Curated model lists** — Only free/open models shown by default. Users can type any custom model name.
4. **Project-context-aware** — Every chat includes the current project's BPM, key, scale, mood, genre, and active parts.
5. **Knowledge base** — A curated file containing key architecture rules, research findings, and music theory constants is included in every system prompt. Expandable to a folder later.

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                      Provider Registry                          │
│  _configs: dict[str, ProviderConfig]  ← one per provider        │
│  _priority: list[str]                 ← failover order          │
│  generate(prompt, fallback=True)      ← auto-failover on 429    │
└────────────────────────────┬──────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                   ▼
   ┌──────────────┐  ┌──────────────┐   ┌──────────────┐
   │ GroqProvider │  │OpenRouter    │   │ OpenAI/GLM/  │
   │ httpx POST   │  │Provider      │   │ ... (stubs)  │
   │ 429→failover │  │ (same)       │   │              │
   └──────────────┘  └──────────────┘   └──────────────┘
                             │
                             ▼
                    ┌───────────────────┐
                    │  POST /api/chat   │
                    │  GET /api/chat/   │
                    │  history          │
                    │  (project context │
                    │   + doc knowledge │
                    │   + conversation  │
                    │   history)        │
                    └────────┬──────────┘
                             │
                             ▼
                    ┌───────────────────┐
                    │  AiStudio.tsx     │
                    │  (right column,   │
                    │   55% width —     │
                    │   the hero panel) │
                    └───────────────────┘
```

---

## Dashboard Layout (After)

```
TopBar: logo · Ctrl+K Search · Library · New Project
├── Left column (45%)
│   ├── Project Anchor (name, BPM, key, scale)
│   ├── Generate Panel (chord/melody/bassline controls)
│   └── Sample Analysis (upload + results)
├── Right column (55%) — CHAT (hero panel, full height)
│   └── AiStudio component
│       ├── Message list (auto-scroll, provider badge)
│       ├── Input bar + Send
│       └── Provider ▼ | Model ▼ | ⚙️ Settings
└── Bottom row (h-48)
    ├── MIDI Player (flex-1)
    └── Project Summary (compact, flex-1)
        ├── Key | BPM | Scale inline chips
        ├── Part counts as badges
        ├── Compact swing slider
        └── Download All MIDI button
```

---

## Tasks

### E1 — Multi-Provider Registry with Auto-Failover

**Files:** `providers/interface.py`, `providers/__init__.py`, `providers/groq_provider.py`, `providers/openrouter_provider.py`

**`providers/interface.py` changes:**
- Add `RateLimitError(Exception)` — signals failover
- Add `Provider.available_models: list[str]` — static curated list per provider
- Add `Provider.api_key_required: bool = True`

**`providers/__init__.py` changes (rewrite, ~80 lines):**
- `_configs: dict[str, ProviderConfig]` — stores `{api_key, model, extra_kwargs}` per provider
- `_priority: list[str]` — ordered provider names for failover
- `_active_idx: int` — index into `_priority` tracking which provider is active
- `configure(name, api_key, model, **kwargs)` → adds to configs
- `configure_priority(["groq", "openrouter", ...])` → sets failover order
- `generate(prompt, **kwargs)` → tries providers in priority order:
  1. Start with `_active_idx` (stickiness — reuse last working provider)
  2. If `RateLimitError` → try next in priority
  3. If `ProviderError` (non-429 failure) → don't failover (provider is broken)
  4. If all fail → raise `AllProvidersExhaustedError`
  5. On success with non-primary provider → schedule periodic re-probe of higher-priority providers (every 5 min, resets on success)
- **Concurrency guard:** `_probing: bool = False` flag. Only one re-probe runs at a time. If a probe is already in-flight, skip. Prevents cascade failures during sustained rate limits.

**`providers/groq_provider.py` (rewrite, ~50 lines):**
```python
class GroqProvider(Provider):
    name = "groq"
    model = "llama-3.3-70b-versatile"
    available_models = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",  # faster, falls in free tier
        "mixtral-8x7b-32768",
        "gemma2-9b-it",
        "deepseek-r1-distill-llama-70b",
    ]
    
    async def generate(self, prompt: str, **kwargs) -> LLMResponse:
        # POST https://api.groq.com/openai/v1/chat/completions
        # Handle 429 → RateLimitError
        # Handle other errors → ProviderError
```

**`providers/openrouter_provider.py` (rewrite, ~45 lines):**
- Same pattern, base URL: `https://openrouter.ai/api/v1/chat/completions`
- `available_models` — curated list of free/open models on OpenRouter
- Default model: auto (routes to cheapest available)
- Handle 429 the same way

**Adding a new provider:** Create `providers/<name>_provider.py`, subclass `Provider`, set `name`/`model`/`available_models`, implement `generate()`. Auto-registered via import in `main.py` (same pattern as today).

### E2 — Provider Configuration API

**File:** `backend/app/api/providers.py` (NEW, ~80 lines)

| Method | Path | Request | Returns |
|--------|------|---------|---------|
| `GET` | `/api/providers/` | — | `{ providers: [{name, configured, model, available_models, healthy, key_hint}], priority: [] }` |
| `POST` | `/api/providers/configure` | `{ name, api_key, model }` | `{ success }` |
| `POST` | `/api/providers/priority` | `{ priority: ["groq", ...] }` | `{ success }` |
| `POST` | `/api/providers/test` | `{ name }` | `{ success, latency_ms }` |

API keys stored in SQLite `preferences` table. No encryption for v0.1 (project is local/private).

**Security rule:** `GET /api/providers/` must never return the full API key. Return `configured: bool` and `key_hint: "...x7f2"` (last 4 characters for identification). The frontend only needs to know if a key exists and which one is active.

`/api/providers/` added as a router in `main.py`.

### E3 — Chat API Route

**File:** `backend/app/api/chat.py` (NEW, ~80 lines)

**`POST /api/chat`**
```json
{
  "message": "What key is this progression in?",
  "project_context": {
    "key": "C",
    "scale": "Major",
    "bpm": 128,
    "mood": "uplifting",
    "genre": "house",
    "active_parts": {
      "chords": {"count": 4, "bars": 8, "root_notes": ["C", "F", "G", "Am"]},
      "melody": {"count": 32, "bars": 8, "range": "C4-G5"},
      "bassline": {"count": 16, "bars": 8}
    }
  }
}
```

**Key design decision:** Active parts send summaries, not raw MIDI arrays. A project with 32 melody notes + 16 bassline notes + 4 chords would send hundreds of pitch/beat/duration objects on every message — enormous overhead for a simple question. The AI doesn't need raw MIDI pitch numbers to answer production questions. If note-level analysis is ever needed, it's a separate plugin call, not a chat payload.

The frontend computes this summary from `Note[]` arrays before sending. `root_notes` extracts unique chord roots; `range` computes min/max pitch converted to `C4`-style notation.

Response:
```json
{
  "reply": "Your progression is in C major...",
  "model_used": "llama-3.3-70b-versatile",
  "provider_used": "groq",
  "tokens_used": 342
}
```

**Flow:**
1. Load last 10 messages from `chat_history` for conversation context
2. Build system prompt: Copilot identity + project context (as structured YAML) + knowledge base content
3. Call `providers.generate()` with full conversation array
4. Save user message + AI response to `chat_history`
5. Return reply with metadata

**System prompt structure (~3-4KB):**
```
You are Music Copilot, an AI music production assistant for FL Studio producers.

=== Project Context ===
Key: C | Scale: Major | BPM: 128
Genre: house | Mood: uplifting
Active chords: 4 chords over 8 bars
Active melody: 32 notes over 8 bars
Active bassline: 16 notes over 8 bars

=== Knowledge Base ===
Music Copilot has these capabilities:
- Sample analysis (BPM, key, scale via deeprhythm + music21)
- Chord progression generation (7 moods, 24 keys, 9 quality types)
- Melody generation (isobar-based, genre-aware)
- Bassline generation (4 patterns per genre)
- MIDI export with swing, velocity arcs, articulation gates
- Voice-leading scoring (music21 VoiceLeadingQuartet)

Architecture rules:
- Every feature is a plugin under /plugins/
- Audio analysis works fully offline
- Never edit files — users load results via the UI
- Available plugins: sample_analyzer, theory_engine, chord_generator, melody_generator, bassline_generator, midi_export

Music theory reference (available constants):
- 12 semitones: C=0, C#=1, ..., B=11
- Diatonic chord intervals per quality (major, minor, dim, aug, dom7, maj7, min7, dim7, sus4)
- Scale degrees per mode
```

**`GET /api/chat/history?limit=20`** — returns last N messages ordered by `created_at DESC`

**`DELETE /api/chat/history`** — clears all history for a fresh conversation

### E4 — Chat History Service

**File:** `backend/app/db/chat.py` (NEW, ~50 lines)

Uses existing `chat_history` table:
```sql
CREATE TABLE chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,       -- 'user' | 'assistant' | 'system'
    message TEXT NOT NULL,
    provider TEXT,
    model TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Functions:
- `save_message(role: str, message: str, provider: str | None, model: str | None) -> int`
- `get_history(limit: int = 20) -> list[dict]`
- `clear_history() -> None`

### E5 — Knowledge Base File

**File:** `shared/knowledge_base.txt` (NEW, ~80 lines)

- **Version marker on line 1:** `# Last updated: 2026-06-07 | Version: 0.1`
- Every update bumps the marker. Prevents the AI from giving advice based on stale docs.
- Curated hand-written file with condensed content from:
- AGENTS.md (architecture invariants, coding conventions, feature status)
- `docs/architecture/` (overview, plugin system, data flow, decisions)
- `docs/research/model-recommendations.md` (recommended providers/models, BPM benchmarks)
- `docs/research/overall-musical-understanding.md` (analysis pipeline architecture)
- `shared/music_theory.py` (constants reference)

Included verbatim in every chat system prompt. Kept under 3KB to fit any model's context without crowding conversation.

**Future:** Expand to `shared/knowledge/` folder with multiple files. AI can edit/add to knowledge via tool calls (follow-up feature).

### E6 — AiStudio Frontend Component

**File:** `frontend/src/renderer/components/AiStudio.tsx` (NEW, ~180 lines)

The hero panel — renders in the right column (55% width).

```
┌────────────────────────────────────────────────┐
│ Chat  [New Chat]                               │
│ ┌────────────────────────────────────────────┐ │
│ │ AI: "Your progression is in C major..."    │ │
│ │    — groq · llama-3.3-70b                 │ │
│ │                                            │ │
│ │ You: "What notes are in C major?"          │ │
│ │                                            │ │
│ │ AI: "C D E F G A B"                       │ │
│ │    — groq · llama-3.3-70b · 28 tokens     │ │
│ │                                            │ │
│ │   ┌─┐                                      │ │
│ │   │⏳│  (loading animation)                 │ │
│ │   └─┘                                      │ │
│ └────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────┐ │
│ │ [Type a message...]               [Send] ► │ │
│ │ Groq ▼  llama-3.3-70b-versatile ▼  ⚙️     │ │
│ └────────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

**Features:**
- Message bubble list with auto-scroll
- Provider + model badge per AI message
- Text input + Send button (Enter or Ctrl+Enter)
- Loading state with spinner
- Error state with retry option
- "New Chat" button → calls `DELETE /api/chat/history` to clear server-side history, then reloads system prompt. Clean slate on both client and server — no stale history on next app restart.
- Provider dropdown (populated from `GET /api/providers/`)
- Model dropdown (populated from selected provider's `available_models`)
- Custom model text input option (type any model name)
- ⚙️ settings gear → opens ProviderSettings modal
- Fetches conversation history on mount
- Responds to project changes (re-injects project context on next message only — doesn't clear chat)

**Type definitions (types.ts):**
```typescript
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  model?: string;
  tokens_used?: number;
  timestamp: number;
}

interface ProviderInfo {
  name: string;
  configured: boolean;
  model: string | null;
  available_models: string[];
  healthy: boolean;
  key_hint: string | null;  // last 4 chars, e.g. "...x7f2"
}
```

### E7 — Provider Settings UI

**File:** `frontend/src/renderer/components/ProviderSettings.tsx` (NEW, ~80 lines)

Modal overlay from Chat's gear icon:

```
╔══════════════════════════════════════════╗
║  Provider Settings            [✕ Close] ║
║                                          ║
║  Priority Order (drag to reorder):      ║
║    ≡ Groq                        [✕]   ║
║    ≡ OpenRouter                  [✕]   ║
║    [+ Add Provider]                     ║
║                                          ║
║  ─── Groq ───                           ║
║  API Key:    [•••••••••••••••••]        ║
║  Model:      [llama-3.3-70b-versatile ▼]║
║  Status:     ✅ Healthy (180ms)          ║
║  [Test Connection]                       ║
║                                          ║
║  ─── OpenRouter ───                      ║
║  API Key:    [•••••••••••••••••]        ║
║  Model:      [[auto ▼] or type:        ]║
║  Status:     ⚠️ Not configured           ║
║  [Test Connection]                       ║
║                                          ║
║  ℹ️ Models shown are free/open. Type    ║
║     any model name to use custom models. ║
╚══════════════════════════════════════════╝
```

Functions:
- `listProviders()` → `GET /api/providers/`
- `configureProvider(name, apiKey, model)` → `POST /api/providers/configure`
- `setPriority(priority)` → `POST /api/providers/priority`
- `testProvider(name)` → `POST /api/providers/test`

### E8 — Dashboard Integration

**Files:** `frontend/src/renderer/pages/Dashboard.tsx`, `frontend/src/renderer/components/ProjectSummary.tsx`

**Dashboard.tsx changes (~20 lines):**
1. Remove `<Panel title="Session Notes">` block entirely
2. Change right column from `<Panel title="Project Summary"><ProjectSummary...` to `<Panel title="Chat"><AiStudio project={project} />`
3. Change bottom row from `MIDI Player | Session Notes` to `MIDI Player | Project Summary (compact)`
4. Pass `project` to AiStudio for context

**ProjectSummary.tsx rewrite (~60 lines, compact):**
- Remove full-height layout, separate sections, heavy typography
- Single line: `Key: C | BPM: 128 | Scale: Major`
- Badges: `Chords: 4 notes | Melody: 32 notes | Bassline: 16 notes`
- Swing slider: compact horizontal
- Download All MIDI: small inline button
- Fits in bottom-row panel alongside MIDI Player

---

## Files Changed (Complete List)

| # | File | Change | ~Lines |
|---|------|--------|--------|
| 1 | `providers/interface.py` | Add `RateLimitError`, `available_models`, `api_key_required` | +10 |
| 2 | `providers/__init__.py` | Multi-provider registry, priority, auto-failover | rewrite 80 |
| 3 | `providers/groq_provider.py` | Real httpx implementation | rewrite 50 |
| 4 | `providers/openrouter_provider.py` | Real httpx implementation | rewrite 45 |
| 5 | `backend/app/api/providers.py` | NEW: provider config routes | 80 |
| 6 | `backend/app/api/chat.py` | NEW: chat route + history | 80 |
| 7 | `backend/app/db/chat.py` | NEW: chat history service | 50 |
| 8 | `backend/app/main.py` | Add `providers_router` + `chat_router` | +4 |
| 9 | `shared/knowledge_base.txt` | NEW: curated doc knowledge base | 80 |
| 10 | `frontend/src/renderer/api.ts` | Add chat + provider API methods | +40 |
| 11 | `frontend/src/renderer/types.ts` | Add `ChatMessage`, `ProviderInfo` types | +20 |
| 12 | `frontend/src/renderer/components/AiStudio.tsx` | NEW: chat hero panel | 180 |
| 13 | `frontend/src/renderer/components/ProviderSettings.tsx` | NEW: provider config modal | 80 |
| 14 | `frontend/src/renderer/components/ProjectSummary.tsx` | Compact redesign | rewrite 60 |
| 15 | `frontend/src/renderer/pages/Dashboard.tsx` | Layout restructure | +20 |
| 16 | `docs/plans/03-remaining-work-phases.md` | Mark Phase E complete | +5 |
| 17 | `AGENTS.md` | Update active context + feature status | +10 |
| **Total** | | | **~835 lines** |

---

## Implementation Order

| Step | Task | Description | Depends On |
|------|------|-------------|------------|
| 1 | E1 | Provider layer: multi-registry, failover, Groq + OpenRouter | None |
| 2 | E2 | Provider config API routes | E1 |
| 3 | E3 | Chat API route | E1 |
| 4 | E4 | Chat history service | E3 (needs DB functions first) |
| 5 | E5 | Knowledge base file | None (independent) |
| 6 | E6 | AiStudio frontend component | E2, E3 |
| 7 | E7 | Provider settings UI | E6 (uses common concepts) |
| 8 | E8 | Dashboard integration + compact ProjectSummary | E6 |
| 9 | — | Update AGENTS.md, `03-remaining-work-phases.md`, commit | All |

---

## Conversation Memory (Deferred to Post-v0.1)

Current: last 10 messages per conversation. Adequate for v0.1.

Future memory system could include:
- A `chat_memories` table for condensed summaries of older conversations
- AI-writable memories via tool calls
- Relevant memories injected into system prompt automatically
- User-pinned knowledge items

---

## Open Questions / Known Gaps

1. **API key encryption** — Skipped for v0.1. Keys stored in SQLite `preferences` table as plaintext. Project is local/private. Encrypt with `cryptography.fernet` in a follow-up if needed.
2. **Parallel failover retries** — Deferred. Sequential is fine for v0.1 (rate limits are transient; first provider usually works). Add parallel retry as follow-up.
3. **Auto-fetch model lists from providers** — Not for v0.1. We use curated static lists. Users can type any model name if they want something not in the curated list.
4. **Doc knowledge base expansion** — Deferred. Start with single `knowledge_base.txt`. Expand to `shared/knowledge/` folder with AI-editable entries as a follow-up.
5. **SSE streaming for chat responses** — Groq and OpenRouter both support Server-Sent Events for token-by-token streaming. v0.1 sends the complete response in one batch (2-8s wait with no feedback). Streaming requires a different rendering approach in AiStudio (incremental text append vs. single bubble append) and changes to the backend route (return `StreamingResponse` instead of JSON). Adding this after the component is built is invasive — plan for it as a high-priority follow-up once the basic chat works.
6. **`tokens_used` is optional** — `ChatMessage.tokens_used?: number` (already optional in the type definition). Don't display "0 tokens" when absent. Some providers don't return usage data.
