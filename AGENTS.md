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
- **Current Focus**: Frontend scaffold complete, ready for Sample Analyzer plugin
- **Recent Decisions**: 2026-06-03 — Created full folder structure, VISION.md, AGENTS.md, README.md, 9 architecture docs under docs/architecture/, initialized git with generic identity. Added opencode.json with instructions=[AGENTS.md, VISION.md] for compaction context.
- **Recent Decisions**: 2026-06-03 — Backend scaffold complete: FastAPI app with lifespan (init_db, discover_plugins), Plugin ABC + auto-discovery, Provider ABC + registry with 4 stubs, SQLite schema + connection, Pydantic shared models, config via pydantic-settings, health endpoint verified. aubio skipped (needs MSVC build tools). Dev script `scripts/dev.ps1`. PYTHONPATH set to project root for imports.
- **Recent Decisions**: 2026-06-03 — Plugin ABC enhanced with `input_schema` + `subscribes_to`. EventBus with on/off/emit. Plugin routes: list, execute, schema. Data contracts in shared/types.py. Three new architecture invariants (LLM never touches raw audio, plugins never call each other, every plugin needs input_schema).
- **Recent Decisions**: 2026-06-03 — Error handling system: custom exception hierarchy (MusicCopilotError + 6 subtypes), rotating file logger (5MB × 3 backups, configurable level), hybrid approach (exceptions for internal flow, PluginResult for API, global safety net for unexpected crashes). Verified health + plugin routes still work.
- **Blockers**: None

## Task History
| Date | Task | Outcome |
|------|------|---------|
| 2026-06-03 | Initial project scaffold | Done — folders, VISION.md, AGENTS.md, README.md, ARCHITECTURE docs, git init |
| 2026-06-03 | Add opencode.json with instructions & compaction config | Done — AGENTS.md + VISION.md loaded as instructions, tail_turns=20 |
| 2026-06-03 | Backend scaffold (FastAPI, plugins, providers, DB, config) | Done — app starts, health endpoint returns OK, all layers wired |
| 2026-06-03 | Plugin system + EventBus + data contracts + schema routes | Done — input_schema on Plugin ABC, EventBus with on/off/emit, shared/types.py data contracts, GET/POST plugin API routes verified |
| 2026-06-03 | Error handling + logging | Done — exceptions.py, logging.py with rotating files, hybrid exception/result pattern, global handlers in main.py |
| 2026-06-03 | Frontend scaffold (Electron + React + TypeScript + Vite + Tailwind) | Done — 7 placeholder pages, sidebar layout, routing, Electron main/preload, all verified |

## Feature Status (v0.1)
- [ ] Sample Analyzer
- [ ] Theory Engine
- [ ] Chord Progression Generator
- [ ] MIDI Export Engine
- [ ] Producer Chat
- [ ] Why Does This Sound Good?
- [ ] Finish My Idea (basic)

## Infrastructure Status
- [x] Backend scaffold (FastAPI + lifespan + config)
- [x] SQLite database (6 tables + init + connection)
- [x] Plugin ABC with input_schema + auto-discovery
- [x] EventBus (on/off/emit with auto-wiring)
- [x] Data contracts (shared/types.py)
- [x] Plugin API routes (list, execute, schema)
- [x] Provider ABC + 4 stubs (OpenAI, Groq, GLM, OpenRouter)
- [x] Git + GitHub remote (<https://github.com/j0nez/Music-Copilot>)
- [x] opencode.json with instructions + compaction config
- [x] Error handling (exception hierarchy + rotating file logger + global handlers)
- [x] Frontend scaffold (Electron + React + TypeScript + Vite + Tailwind)

## Git Workflow
- `git add -A && git commit -m "scope: message"` after every meaningful change.
- Update AGENTS.md and ARCHITECTURE docs before each commit.
- Keep commits atomic: one feature or fix per commit.
- Always check `git status` and `git diff --staged` before committing.
- Use conventional commit prefixes: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.

## Next Actions
1. Begin Sample Analyzer plugin (first real plugin with events)
2. Write first backend tests (theory engine + plugin discovery + event bus)
