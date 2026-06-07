# Remaining Work — Phases & Roadmap

**Purpose:** Captures everything still outstanding across both prior plans (`01-melody-bassline-implementation.md` and `02-v0.1-review-and-decisions.md`). Features that were completed in Batches 1–7 and fix Batches A–E are excluded.

**Current state:** 154 tests passing (131 backend + 23 frontend), 0 TS errors. All v0.1 feature work complete except for Phase E (AI Studio).

---

## Phase E — AI Studio (The Last v0.1 Feature)

The only remaining v0.1 feature. Architecture already scaffolded — Provider layer is decoupled and Groq/OpenAI/GLM/OpenRouter stubs exist.

| # | Task | Detail | Effort | Depends On |
|---|------|--------|--------|------------|
| E1 | Groq provider configuration + verification | Add `.env` key, verify `GroqProvider.generate()` works end-to-end | ~15 min | None |
| E2 | `POST /api/chat` route with project context injection | Backend route that calls `llm.generate()` with current project (BPM, key, scale, mood, genre) as system prompt | ~80 lines | E1 |
| E3 | Build `ToolBridge` | Expose each plugin's `execute()` + `input_schema` as LLM-callable JSON tool functions. No plugin rewrites needed. | ~120 lines | E2 |
| E4 | State mutation endpoints | `POST /api/project/settings`, `POST /api/player/set-part`, `POST /api/player/clear-part` — allows AI to modify project/player state | ~60 lines | Project state exists |
| E5 | Wire AI Studio chat UI | Replace fake responses in AiStudio with real API calls. Wire chat bubbles to backend + tool call display. | ~60 lines | E3 + E4 |
| E6 | Absorb into dashboard | Collapse Project Summary to header, expand Co-Producer Chat in right column. Remove standalone AiStudio page. | ~30 lines | E5 + C1 |

**Total Phase E effort:** ~350 lines, ~1-2 days

---

## Phase 2 — Analysis & Learning (Deferred)

| # | Feature | Detail | Effort |
|---|---------|--------|--------|
| F1 | **Theory Teacher** | User asks theory questions, AI explains with examples from project context. Uses existing Provider layer. | ~100 lines |
| F2 | **Basic-Pitch note transcription** | Add `basic-pitch` (ONNX, ~50MB). Transcribe audio → notes → feed to music21 for chord detection. Enables "upload a guitar loop → Music Copilot tells you the chords." | ~300 lines + 1 dep |
| F3 | **Why Does This Sound Good?** | AI analyzes chord progression + voice leading, explains tension/resolution/harmony in natural language. | ~150 lines |
| F4 | **Finish My Idea (basic)** | Analyze loop/MIDI input → suggest next section (drop, breakdown, bridge). Rule-based structure generator. | ~200 lines |

---

## Phase 3 — Creative Generation (Deferred)

| # | Feature | Detail | Effort |
|---|---------|--------|--------|
| G1 | **Arpeggiator Generator** | Up/down/random/trance patterns via isobar. Genre-aware. Already slots into `[+ Add Part ▾]` in MIDI Player. | ~150 lines |
| G2 | **Drum Pattern Generator** | Genre-aware drum patterns via isobar. Slots into MIDI Player part list. | ~200 lines |
| G3 | **Idea Generator** | "Give me 20 drop ideas" with hooks/arrangements via AI. | ~100 lines |
| G4 | **musicnn genre/mood tagging** | Add `musicnn` (TensorFlow, ~500MB). Auto-detect genre, mood, instruments from audio. | ~200 lines + 1 dep |

---

## Phase 4 — Track Completion (Deferred)

| # | Feature | Detail | Effort |
|---|---------|--------|--------|
| H1 | **Finish My Idea (full)** | Audio/MIDI in → full song structure with intro/build/drop/breakdown/outro. | ~400 lines |
| H2 | **Arrangement Planner** | UI for arranging sections: drag-drop blocks for intro, build, drop, breakdown, outro. | ~300 lines |
| H3 | **Track Completion Suggestions** | Detect missing elements (bass, FX, tension layers) and suggest additions. | ~150 lines |

---

## Phase 5+ — Advanced Intelligence (Deferred)

| # | Feature | Detail | Effort |
|---|---------|--------|--------|
| I1 | **Reference Analyzer** | Upload reference track → BPM, key, structure, energy curve, arrangement sections with timestamps. | ~400 lines + MSAF |
| I2 | **Recreation Guide** | AI explains how to recreate the analyzed reference track. | ~200 lines |
| I3 | **Sample Library Scanner** | Index Splice/own folder to SQLite. Searchable by key, BPM, type. | ~300 lines |
| I4 | **AI Sample Search** | "Find dark techno kicks" via natural language → filtered sample results. | ~100 lines |
| I5 | **FL Studio Template Generator** | Genre-specific project templates exported as .flp. | ~200 lines |
| I6 | **Project Analyzer** | Analyze exported FLP data and stems through the app. | ~300 lines |
| I7 | **JUCE VST3 Bridge Plugin** | Deep DAW integration (audio streaming, transport sync, MIDI output). Standalone C++ project. | 3-6 months |

---

## Test Coverage Gaps (Carried Forward)

Even though 154 tests pass, the following areas have zero coverage:

| Gap | Location | Priority |
|-----|----------|----------|
| GenerationHub tests | `frontend/` | Medium |
| NoteGrid tests | `frontend/` | Medium |
| Swing end-to-end test | `backend/` — verify `apply_swing()` is called on export | Low |
| Voice-leading display test | `frontend/` — badge appears after chord gen | Low |
| Surprise Me randomization test | `frontend/` — randomScale, randomMood | Low |
| Loading/error state tests | `frontend/` — spinner during API, error toast | Low |

---

## Summary

| Phase | Status | Items | Est. Effort |
|-------|--------|-------|-------------|
| **Phase E — AI Studio** | ⬜ Next | 6 tasks | ~350 lines |
| **Phase 2 — Analysis** | ⬜ Deferred | 4 tasks | ~750 lines |
| **Phase 3 — Creative** | ⬜ Deferred | 4 tasks | ~650 lines |
| **Phase 4 — Completion** | ⬜ Deferred | 3 tasks | ~850 lines |
| **Phase 5+ — Advanced** | ⬜ Deferred | 7 tasks | ~1,500 lines + C++ |
| **Test gaps** | ⬜ Fill as needed | 6 gaps | ~100 lines |

*Last updated: 2026-06-07*
