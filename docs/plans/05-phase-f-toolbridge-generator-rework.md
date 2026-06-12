# Phase F — ToolBridge + Generator Rework + AI-Driven Chat Interface

**Status:** F1 (ToolBridge) done. Remaining: F1a + F5 + F2a + F3 + F6 + F4 + F2b.
**Last updated:** 2026-06-13
**Agent:** `opencode/deepseek-v4-flash-free` — all plan estimates tuned to this model's capabilities. Problems surface faster during implementation since AI iterates with immediate feedback.

---

## Overview

| Track | What | Est. Lines | Status |
|-------|------|-----------|--------|
| **F1 — ToolBridge** | AI calls note-creation tools (melody/bassline/chords) + web search via DuckDuckGo | ~270 | ✅ Done |
| **F1a — Description-based tools** | Wrap existing generators behind `generate_melody(description=...)` — makes chat usable before F2 rework | ~100 | ⬜ |
| **F5 — Model-Splitting** | Lightweight model for tool dispatch, heavy model for creative text. Solves Groq TPM bottleneck. | ~80 | ⬜ |
| **F2a — Core generator improvements** | NCTs + microtiming + dynamic envelope + voice-leading + anticipation/syncopation. 5 highest-impact, most AI-friendly gaps. | ~600-800 | ⬜ |
| **F3 — High-Level AI Tools** | Wrap F2a generators as AI-callable tools; add memory persistence | ~300 | ⬜ |
| **F6 — SSE Streaming** | Server-Sent Events for real-time tool progress ("Creating melody... → ✓ Done") | ~150 | ⬜ |
| **F4 — Chat-First UI** | AI Studio becomes primary interface, generator panels become secondary/collapsed | ~200 | ⬜ |
| **F2b — Remaining gaps** | Motif development, genre vocabulary, ornamentation — deferred post-MVP | ~400-600 | ⬜ |

**Execution order:** F1a → F5 → F2a → F3 → F6 → F4 → F2b. No track depends on a later track.

---

## Design Decisions

1. **Chat is the primary interface** — Everything flows through AI Studio. The Generate panel becomes a shortcut view into what the AI can also do. The user describes what they want; the AI calls high-level tools that invoke the procedural generators under the hood.

2. **Project context always enforced** — Project key, scale, and BPM are injected into every chat request's system prompt. High-level tools force all generated notes into the project's key/scale as a post-processing step.

3. **Vibe over genre** — MIDI files tagged by character (`_chill`, `_driving`, `_dark`) not siloed into genres. Genre/style tags optional for search.

4. **Procedural core, AI surface** — The generators themselves remain deterministic, offline, zero-GPU Python plugins. The AI (via LLM) handles high-level creative direction and parameter selection. The generators handle note execution with full corpus-informed musicality.

5. **Memory is persistent** — The AI can write what it learns (web search results, user preferences) to a SQLite memory table and read it back in future sessions.

6. **Tool notes replace current part** — AI-generated notes replace whatever the MIDI Player currently holds for that part. Not append.

7. **Non-chord tones at ~30% density** — The single biggest improvement for natural-sounding output. Mandatory in all generators after rework.

8. **Agent-aware planning** — All estimates reflect `opencode/deepseek-v4-flash-free` strengths: algorithmic, rule-based, table-driven code is fast and reliable; subjective musical tuning requires iteration.

---

## Architecture

```
User: "Make a medieval-sounding melody in D minor for 8 bars"
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
                     Round 1: Lightweight model decides what to call
                     → generate_melody(description="medieval, phrygian dominant", bars=8)
                     → ToolRegistry calls F2a procedural generator
                     → generator produces Note[] with NCTs, microtiming, voice-leading, etc.
                     → notes force-projected into project key/scale
                     → SSE event: "✓ Creating melody with phrygian feel..."
                            │
                            ▼
                     Round 2 (if needed): web_search("medieval music modes")
                     → SSE event: "🔍 Searching for medieval music modes..."
                     → results stored via memory_write("medieval modes", "...")
                     → SSE event: "✓ Saved medieval modes to memory"
                            │
                            ▼
                     Final round: Heavy model generates creative reply
                     → SSE event: full response streamed as text
                            │
                            ▼
Response: { reply: "...", tool_data: { melody: Note[] } }
                            │
                            ▼
Frontend → applies tool_data to MIDI Player state
         → notes playable, playable immediately
```

### Tool call flow

```
Round 1: "Make a medieval DnB melody" → lightweight model
         │ calls generate_melody(description=..., bars=8, energy=0.7)
         │ generator returns Note[] → stored in tool_data
         │ SSE: "✓ Melody created (8 bars, medieval feel)"
         │
Round 2 (optional): "Search for phrygian dominant" → same model
         │ calls web_search → results stored via memory_write
         │ SSE: "✓ Saved phrygian dominant info to memory"
         │
Round 3: Full tool history sent to heavy model
         │ heavy model generates final explanatory text
         │ SSE: streamed text tokens
         │
Return: { reply, tool_data: { melody: Note[] } }
```

---

## Track F1 — ToolBridge (✅ DONE as of 2026-06-07)

### What was built

| Component | File | Description |
|-----------|------|-------------|
| Tool dataclass + registry | `shared/tools.py` | `Tool(name, description, parameters, handler)` + `ToolRegistry` singleton |
| Provider tool support | `providers/interface.py` | `LLMResponse.tool_calls: list` field |
| Groq tool injection | `providers/groq_provider.py` | Sends `tools` in payload, parses `tool_calls` from response |
| OpenRouter tool injection | `providers/openrouter_provider.py` | Same pattern as Groq |
| Tool registration | `backend/app/api/tools.py` | 4 tools: create_melody, create_bassline, create_chords, web_search |
| Chat dispatch loop | `backend/app/api/chat.py` | Up to 5 tool rounds, tool_data in ChatResponse |
| Frontend wiring | `AiStudio.tsx` + `Dashboard.tsx` | onToolNotes callback applies tool_data to MIDI Player |
| DuckDuckGo search | `duckduckgo-search` in PyPI | Free, no API key |

### Rate limit fixes (applied 2026-06-07)

- Tools only sent on first dispatch round (`tools=tools if _round == 0 else None`)
- Chat history limited to 3 messages (saves ~500-700 tokens)
- Assistant message content omitted (not empty string) when tool_calls present

### What F1 did NOT build (addressed in F1a)

- Description-based generation tools (e.g., `generate_melody(description=...)`) — planned for F1a
- Memory persistence — planned for F3

---

## Track F1a — Description-Based Tools (Quick Win)

### Motivation

The current `create_melody(notes=[...])` requires the LLM to generate hundreds of raw MIDI note objects. This is token-prohibitive (~2500 tokens for 8 bars) and cognitively demanding — LLMs struggle with note-level coherence.

Building description-based tools now wraps the **existing** generators (before F2a rework) so the chat is immediately useful. These will be upgraded to call F2a generators once those are done.

### Tools to Add

| Tool | Parameters | Implementation (before F2a) | Implementation (after F2a) |
|------|-----------|---------------------------|---------------------------|
| `generate_melody` | `description: str, bars: int = 8, energy: float (0-1), seed: int?` | Calls existing `MelodyGenerator` plugin with increased `complexity` mapping | Calls reworked F2a generator with all 5 gap features |
| `generate_bassline` | `description: str, bars: int = 8, style: str = "auto"` | Calls existing `BasslineGenerator` plugin with genre-based style selection | Calls reworked F2a generator |
| `generate_chords` | `description: str, bars: int = 8, mood: str = "auto"` | Calls existing `ChordGenerator` plugin with mood/genre mapping | Calls reworked F2a generator |

**Post-processing for every tool (applies regardless of F2a status):**
- Force all pitches into project key/scale notes
- Snap `start_beat` to nearest 16th note
- Clamp velocity to 0-127

**Mapping description to generator parameters:**
- `"dark"`, `"heavy"`, `"aggressive"` → high complexity, minor scale preference
- `"chill"`, `"dreamy"`, `"ambient"` → low complexity, major scale preference, sparse density
- `"fast"`, `"driving"`, `"rolling"` → high notes per bar, shorter durations
- `"medieval"`, `"phrygian"`, `"oriental"` → minor with flat-2, flat-6 (phrygian mode)
- Unknown descriptors → default parameters (the LLM learns to use specific terms)

### Files to create/modify

| File | Change | Lines |
|------|--------|-------|
| `backend/app/api/tools.py` | Add `generate_melody`, `generate_bassline`, `generate_chords` wrapping existing plugin calls | +70 |
| `backend/app/api/tools.py` | Add description→params mapper helper | +20 |
| `backend/app/api/tools.py` | Add scale/key enforcement + grid snap helpers | +25 |

### Testing

Each transform is a pure `(Note[], context) → Note[]` function — trivially unit-testable:

| Test | What It Verifies | Lines |
|------|-----------------|-------|
| `test_generate_melody_in_key` | All output pitches belong to project key/scale | ~10 |
| `test_generate_chords_grid_snap` | All `start_beat` values are multiples of 0.25 | ~10 |
| `test_description_to_params_dark` | "dark" → minor scale, high complexity | ~8 |
| `test_description_to_params_unknown` | Unknown string → default params, no crash | ~8 |
| `test_all_pitches_clamped` | No pitch outside 0-127 after enforcement | ~8 |

~45 test lines total.

---

## Track F2a — Core Generator Improvements

### Research Foundation

A comprehensive research pass (2026-06-13) identified **11 gap areas**. This track implements the 5 most impactful, most AI-friendly gaps. The remaining 6 are deferred to F2b.

### Scope (5 gaps, ~600-800 lines)

| # | Gap | Why In F2a | Est. Lines | Approach |
|---|-----|-----------|-----------|----------|
| 1 | **Non-chord tones** | Highest impact. Table-driven (9 types, clear rules). Verifiable. | ~150 | NCT insertion engine: given a Note[] and current chord, replace ~30% with correct NCT type |
| 2 | **Microtiming layer** | Pure math on tick values. No musical judgment needed. | ~100 | Post-processing: downbeat delay, offbeat shuffle, bass grid-lock |
| 3 | **Dynamic envelope** | Statistical per-beat profiles. Verifiable output. | ~80 | Per-bar mountain profile + phrase-level crescendo/decrescendo arc |
| 4 | **Voice-leading checks** | Rule-based: contrary motion, chord-tone anchoring, register bounds. Verifiable. | ~120 | Post-generation pass that adjusts notes violating rules |
| 5 | **Anticipation + syncopation** | Probability-based time displacement. Simple mechanics. | ~80 | Shift notes before chord boundaries, displace offbeat notes |

### Deferred to F2b

| # | Gap | Why Deferred |
|---|-----|-------------|
| 6 | **Motif development** | Needs subjective tuning — what makes a "good" motif is hard to verify programmatically |
| 7 | **Antecedent-consequent phrasing** | Depends on cadence tracking, harmonic context |
| 8 | **Melodic contour arch** | Requires phrase-level tracking across bars |
| 9 | **Ornamentation** | Taste-driven — grace notes/trills placement is subjective |
| 10 | **Genre harmonic vocabulary** | Many nuanced rules, hard to verify correctness |
| 11 | **Register conventions** | Low impact compared to others |

### Integration

Each gap is a standalone transform that takes `Note[]` + context and returns `Note[]`:
```
Input Note[] → NCT insertion → Voice-leading fix → Anticipation/sync →
                Dynamic envelope → Microtiming → Scale enforce → Output Note[]
```

Each transform is unit-testable independently.

### Testing

The pipeline architecture (pure `Note[] → Note[]` transforms) makes testing straightforward:

| Test | What It Verifies | Lines |
|------|-----------------|-------|
| `test_nct_insertion_density` | ~30% of notes are non-chord tones after pass | ~12 |
| `test_nct_approach_leave` | Each NCT type follows correct approach/leave rules | ~15 |
| `test_microtiming_downbeat_delay` | Notes on beat 1 are delayed within expected range | ~10 |
| `test_microtiming_bass_locked` | Bass beat 1 stays quantized (±0ms) | ~10 |
| `test_dynamic_envelope_profile` | Per-beat velocity follows mountain profile | ~10 |
| `test_voice_leading_contrary_motion` | Melody-bass pairs move in opposite directions at expected rate | ~12 |
| `test_voice_leading_chord_tones` | Strong-beat notes are chord tones | ~10 |
| `test_anticipation_shift` | Some notes before chord boundaries are shifted early | ~10 |
| `test_syncopation_grid` | Some notes displaced from their original grid position | ~10 |
| `test_scale_enforcement` | All output pitches in project key/scale | ~10 |
| `test_pipeline_invariant` | Pipeline doesn't change note count or reorder | ~10 |

~120 test lines total.

---

## Track F3 — High-Level AI Tools & Memory

### Tools to Add (call F2a generators)

| Tool | Parameters | Returns | Implementation |
|------|-----------|---------|---------------|
| `generate_melody` | `description: str, bars: int = 8, energy: float (0-1), seed: int?` | `Note[]` | Calls F2a melody generator + key enforcement |
| `generate_bassline` | `description: str, bars: int = 8, style: str = "auto"` | `Note[]` | Calls F2a bassline generator + key enforcement |
| `generate_chords` | `description: str, bars: int = 8, mood: str = "auto"` | `Note[]` | Calls F2a chord generator + genre vocabulary |
| `memory_write` | `topic: str, content: str` | `{"success": true}` | `INSERT INTO memory (topic, content, ...)` |
| `memory_read` | `topic: str` | `str` or `None` | `SELECT ... FROM memory WHERE topic LIKE ?` |

**SQLite table:**
```sql
CREATE TABLE IF NOT EXISTS memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Files to create/modify

| File | Change | Lines |
|------|--------|-------|
| `backend/app/api/tools.py` | Add memory_write, memory_read, regenerate generate_* for F2a | +120 |
| `backend/app/database.py` | Add `init_memory_table()` | +15 |

### Testing

| Test | What It Verifies | Lines |
|------|-----------------|-------|
| `test_memory_write_read` | Write then read → same content returned | ~12 |
| `test_memory_write_overwrite` | Same topic, second write → latest content returned | ~10 |
| `test_generate_melody_calls_f2a` | Mocks F2a generator, verifies it was called | ~10 |
| `test_generate_bassline_params` | Parameters passed to F2a match tool invocation | ~10 |
| `test_tool_errors_graceful` | Missing/invalid params → descriptive error, not crash | ~10 |

~52 test lines total.

---

## Track F4 — Chat-First UI

### After F3 + F6

The UI redesign depends on F3 (high-level tools exist) and F6 (streaming exists). Without streaming, the redesign is cosmetic. Without high-level tools, the chat can't create anything useful.

**Before (current):**
```
┌───────────────────┬──────────────────────────┐
│                   │                          │
│ Generate Panel    │     AI Studio            │
│ (presets, params, │     (chat, knowledge)    │
│  history, hub)    │                          │
│                   │                          │
├───────────────────┤                          │
│ Project Summary   │                          │
│ (compact row)     │                          │
└───────────────────┴──────────────────────────┘
```

**After (chat-first):**
```
┌──────────────────────────────────────────────┐
│  AI Studio (70%)                             │
│  - Chat messages (full width)               │
│  - Tool call notifications with SSE          │
│    "Creating medieval melody..." ✓           │
│    "Searching for phrygian mode..." ✓        │
│    "Saved to memory: medieval modes" ✓        │
│                                              │
│  ┌──────────────────┐                        │
│  │ Quick Actions    │                        │
│  │ [Regenerate]     │                        │
│  │ [MIDI Download]  │                        │
│  └──────────────────┘                        │
├──────────────────────────────────────────────┤
│  Collapsible: Generator Panel (default: collapsed) │
│  Collapsible: Project Summary (default: collapsed) │
└──────────────────────────────────────────────┘
```

### Files to change

| File | Change | Lines |
|------|--------|-------|
| `Dashboard.tsx` | Reorder layout: AI Studio primary, panels collapsible | +60 |
| `AiStudio.tsx` | Add tool call notification stream, quick action bar | +50 |
| `GeneratePanel.tsx` | Add collapsed state + "restore from chat" receiver | +30 |

---

## Track F5 — Model-Splitting

### Motivation

Groq free tier: 30 RPM, 12K TPM. Tool definitions (~2000 tokens) + system prompt + knowledge base + history can consume most of the budget in one round-trip. Without this, chat + 2 tool rounds hits the TPM wall before the final text response.

### Architecture

```
Round 1 (tool decision):  Lightweight model (llama-3.1-8b-instant)
  - Cheap: ~2K tokens for tool defs + minimal reasoning
  - Output: which tool to call + arguments

Round 2 (tool execution):  N/A (local Python running the generator)
  - No LLM needed

Round 3 (text response):  Heavy model (llama-3.3-70b-versatile)
  - Tool definitions removed from context → saves ~2K tokens
  - Full budget for creative reasoning + long response
```

### Configuration

```python
model_tool = "llama-3.1-8b-instant"    # lightweight, fast
model_text = "llama-3.3-70b-versatile"  # heavy, creative
```

Configurable per provider. Falls back to same model for both if unset.

### Files to modify

| File | Change | Lines |
|------|--------|-------|
| `backend/app/api/chat.py` | Split dispatch: tool rounds use `model_tool`, text rounds use `model_text` | +20 |
| `providers/interface.py` | Add optional `model_override` param to `generate()` | +5 |
| `backend/app/api/providers.py` | Allow separate tool/text model config | +10 |

### Testing

| Test | What It Verifies | Lines |
|------|-----------------|-------|
| `test_model_splitting_tool_round` | Tool dispatch round uses `model_tool` | ~10 |
| `test_model_splitting_text_round` | Text response round uses `model_text` | ~10 |
| `test_model_splitting_fallback` | When `model_text` not set, falls back to same model | ~8 |

~30 test lines total.

---

## Track F6 — SSE Streaming

### Motivation

Current `POST /api/chat/` waits for all tool rounds + text generation, then returns the full response. Users expect real-time feedback:
```
"Creating medieval melody..." → ✓ Done
"Searching for phrygian mode..." → ✓ Found
"Generating response..." → streamed text
```

### Approach

Replace `POST /api/chat/` response with Server-Sent Events:

```
→ POST /api/chat/
← Content-Type: text/event-stream

event: tool_start
data: {"tool": "generate_melody", "params": {"description": "medieval", "bars": 8}}

event: tool_end
data: {"tool": "generate_melody", "notes_count": 48, "duration_seconds": 0.3}

event: tool_start
data: {"tool": "web_search", "params": {"query": "phrygian dominant mode"}}

event: tool_end
data: {"tool": "web_search", "results_count": 3}

event: token
data: "Here's your medieval-sounding melody in D phrygian..."

event: token
data: " I used wide interval leaps at phrase peaks..."

event: done
data: {"tool_data": {"melody": [...]}}
```

### SSE event types

| Event | When | Payload |
|-------|------|---------|
| `tool_start` | Before each tool call | `{tool, params}` |
| `tool_end` | After each tool call completes | `{tool, summary}` |
| `token` | Each text token (or chunk) | text string |
| `error` | On tool failure | `{tool, error}` |
| `done` | End of response | `{tool_data}` |

### Frontend changes

| File | Change | Lines |
|------|--------|-------|
| `frontend/src/renderer/api.ts` | Add `chatStream()` using `EventSource` or `fetch` + reader | +40 |
| `AiStudio.tsx` | Replace `sendMessage` with streaming handler, render SSE events inline | +60 |
| `AiStudio.tsx` | Add tool progress indicators (spinners + checkmarks) | +30 |

### Testing

| Test | What It Verifies | Lines |
|------|-----------------|-------|
| `test_sse_tool_start_event` | Backend emits `event: tool_start` before tool execution | ~12 |
| `test_sse_tool_end_event` | Backend emits `event: tool_end` after tool completes | ~12 |
| `test_sse_done_event` | Backend emits `event: done` with `tool_data` at end | ~12 |
| `test_sse_error_event` | Tool failure emits `event: error` with details without crashing | ~12 |

~48 test lines total.

---

## Track F2b — Remaining Generator Gaps (Deferred)

Deferred post-MVP. Each gap needs iteration and subjective tuning that's harder to verify programmatically:

| # | Gap | Est. Lines | What It Needs |
|---|-----|-----------|---------------|
| 6 | **Motif development** | ~150 | User feedback loop — does this sound like a good motif? |
| 7 | **Antecedent-consequent phrasing** | ~100 | Harmonic cadence tracking across bar boundaries |
| 8 | **Melodic contour arch** | ~80 | Phrase-level direction tracking |
| 9 | **Ornamentation** | ~80 | Subjective — where to place grace notes |
| 10 | **Genre harmonic vocabulary** | ~120 | Many nuanced rules per genre |
| 11 | **Register conventions** | ~40 | Low impact compared to others |

---

## Appendix — Research Documents

All implemented gaps detailed in:

- **`docs/research/advanced-midi-generation.md`**
  - Section 11: Non-Chord Tones (9 types, genre rates, implementation algorithm)
  - Section 12: Motif Development (9 techniques, PReVaDe, antecedent-consequent)
  - Section 13: Syncopation & Anticipation (LH&L model, press-and-release)
  - Section 14: Ornamentation (grace notes, trills, mordents, turns, slides, falls)
  - Section 15: Voice-Leading Between Parts (chord-tone anchoring, contrary motion)
  - Section 16: Complete Generator Upgrade (microtiming layer, dynamic envelope)

- **`docs/research/music-theory-algorithms.md`**
  - Section 9: Genre-Specific Harmonic Vocabulary (5 major electronic genres)
  - Section 10: Instrument & Register Conventions (MIDI ranges, frequency slots)
  - Section 11: Theory-Generation Feedback Loop (five-question check, checklist)

## Appendix — Future Ideas (Deferred)

| Idea | When | Why Deferred |
|------|------|-------------|
| **MIDI Library search by vibe** | Post-F2b | Needs feature vectors from corpus |
| **Melody completion from seed** | Post-F2b | Needs corpus patterns + generator infrastructure |
| **Generator diagnostics** | Post-F2b | Compare generator output to real MIDI stats |
| **Transformer-based generation** | Post-MVP | Requires GPU, dataset, training pipeline |
| **Bulk MIDI download** | Post-F2b | `scripts/download_bulk_midis.py` for Lakh + chord repo (23k+ files). Useful for F2b statistical profiles but not blocking F2a. |
