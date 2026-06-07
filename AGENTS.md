# Music Copilot — Agent Memory

## Identity
AI-powered music production assistant for FL Studio producers.
Built with Electron + React + FastAPI + SQLite.

## Architecture Invariants
- NEVER call AI models directly — always use `llm.generate(prompt)` via Provider Layer.
- Every feature MUST be a plugin under `/plugins/` with a `Plugin` ABC subclass.
- Plugins NEVER call other plugins directly — communicate via `event_bus.emit()`.
- LLMs NEVER handle raw audio/MIDI — audio → DSP → structured JSON → LLM interpretation only.
- SQLite for local state. No external DB dependencies.
- Frontend ↔ Backend via REST. No direct filesystem access from renderer.
- Audio/MIDI analysis must work fully offline.
- Every plugin declares an `input_schema` (Pydantic model) for auto-validation and frontend form generation.
- After every significant change: (1) update AGENTS.md (Active Context / Feature Status), (2) update ARCHITECTURE docs if structure changed, (3) `git add -A && git commit`.

## Coding Conventions
- **Python**: FastAPI async routes, Pydantic v2, `ruff` formatting, type hints everywhere.
- **TypeScript**: Strict mode, functional components, no `any`.
- **Tests**: `pytest` for backend, `vitest` for frontend.
- **Imports**: absolute from project root. `from backend.app.models import X`
- **Errors**: custom exception hierarchy → HTTPException with detail.

## Active Context
- **Phase**: v0.1 MVP Foundation
- **Current Focus**: All feature implementations complete through Batch D. Remaining: Batch E polish (preset corrections, bassline velocity, swing defaults) then Phase E (AI Studio).
- **Recent Decisions**: 2026-06-06 — All 7 original implementation batches done + all 13 post-audit fixes. Batches A–D (P0–P3) completed: audio playback (Web Audio API), Expression Engine integration (phrase arc velocity, articulation gate), swing pipeline, _map_range centering fix, bassline octave_jump fix, project state auto-fill, preset chip auto-trigger, clear vs regenerate separation, Generation Hub full controls, Ctrl+S arrangement save, VL score badge, generation history ring buffer. 154 tests pass (131 backend + 23 frontend).
- **Blockers**: None

## Task History
| Date | Task | Outcome |
|------|------|---------|
| 2026-06-03 | Initial project scaffold | Done — folders, VISION.md, AGENTS.md, README.md, ARCHITECTURE docs, git init |
| 2026-06-03 | Backend scaffold (FastAPI, plugins, providers, DB, config) | Done |
| 2026-06-03 | Plugin system + EventBus + data contracts + schema routes | Done |
| 2026-06-03 | UI consolidation + Sample Analyzer + upload endpoint | Done |
| 2026-06-03 | BPM detection: beat_track → tempo() → multi-band onset → DeepRhythm CNN | Done |
| 2026-06-06 | Batches 1–7 (Full Melody/Bassline implementation) | Done — isobar generators, GeneratePanel, MIDIPlayer, GenerationHub, swing, tests |
| 2026-06-06 | Batch A (P0) — Audio Playback + Expression Engine | Done — Web Audio API per-note oscillators, phrase arc velocity, articulation gate |
| 2026-06-06 | Batch B (P1) — Swing + Bugfixes | Done — swing in export, _map_range centering, bassline octave_jump PSequence fix |
| 2026-06-06 | Batch C (P2) — Preset + Auto behavior | Done — project auto-fill in GeneratePanel, auto-trigger on preset click, clear vs regenerate |
| 2026-06-06 | Batch D (P3) — Hub + Save + History | Done — GenerationHub full controls, Ctrl+S arrangement save, VL badge, history ring buffer with cycle arrows |

## Feature Status (v0.1)
- [x] Samples (analyze BPM, key, scale)
- [x] Chord Progression Generator
- [x] Melody Generator (isobar, phrase arc, articulation gate)
- [x] Bassline Generator (isobar, 4 patterns, trance octave_jump)
- [x] MIDI Export + Swing + Expression Engine
- [x] Generate Panel (Preset Chips, Auto defaults, loading spinners)
- [x] MIDI Player (Web Audio playback, playhead, per-part regenerate, history, swing slider)
- [x] Generation Hub (full controls, NoteGrid preview, Play/Stop, MIDI export, Save to Library)
- [x] Project Summary + Ctrl+S arrangement save
- [x] Voice-leading score badge
- [ ] AI Studio (chat + analysis + composition assistant)

## Infrastructure Status
- [x] Backend scaffold (FastAPI + lifespan + config)
- [x] SQLite database (6 tables + init + connection)
- [x] Plugin ABC with input_schema + auto-discovery
- [x] EventBus (on/off/emit with auto-wiring)
- [x] Data contracts (shared/types.py)
- [x] Plugin API routes (list, execute, schema)
- [x] Provider ABC + 4 stubs (OpenAI, Groq, GLM, OpenRouter)
- [x] Git + GitHub remote (<https://github.com/j0nez/Music-Copilot>)
- [x] Error handling (exception hierarchy + rotating file logger + global handlers)
- [x] Frontend scaffold (Electron + React + TypeScript + Vite + Tailwind)
- [x] Frontend api.ts + types.ts
- [x] Backend tests (131 tests)

## Git Workflow
- `git add -A && git commit -m "scope: message"` after every meaningful change.
- Update AGENTS.md and ARCHITECTURE docs before each commit.
- Keep commits atomic: one feature or fix per commit.
- Always check `git status` and `git diff --staged` before committing.
- Use conventional commit prefixes: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.

## Next Actions
1. ✅ Batch 1 — Prerequisites (isobar, bug fixes, imports, Pydantic v2, revert-on-failure)
2. ✅ Batch 2 — Backend Plugins (swing, bassline_generator, melody_generator, arrangement endpoint)
3. ✅ Batch 3 — Backend Tests
4. ✅ Batch 4 — Frontend Components (NoteGrid, GeneratePanel, MIDIPlayer, GenerationHub, etc.)
5. ✅ Batch 5 — Dashboard Wiring (45/55 layout, component tree)
6. ✅ Batch 6 — Frontend Tests
7. ✅ Batch 7 — Documentation
8. ✅ Batch A (P0) — Audio Playback + Expression Engine
9. ✅ Batch B (P1) — Swing + Bugfixes
10. ✅ Batch C (P2) — Preset + Auto behavior
11. ✅ Batch D (P3) — Hub + Save + History
12. ⬜ Batch E (P4) — Preset value corrections, bassline velocity polish, swing preset-driven defaults
13. ⬜ Phase E — AI Studio (last)
