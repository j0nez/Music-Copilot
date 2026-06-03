# Music Copilot — Agent Memory

## Identity
AI-powered music production assistant for FL Studio producers.
Built with Electron + React + FastAPI + SQLite.

## Architecture Invariants
- NEVER call AI models directly — always use `llm.generate(prompt)` via Provider Layer.
- Every feature MUST be a plugin under `/plugins/` with a `Plugin` ABC subclass.
- SQLite for local state. No external DB dependencies.
- Frontend ↔ Backend via REST. No direct filesystem access from renderer.
- Audio/MIDI analysis must work fully offline.
- After every significant change: (1) update AGENTS.md (Active Context / Feature Status), (2) update ARCHITECTURE docs if structure changed, (3) `git add -A && git commit`.

## Coding Conventions
- **Python**: FastAPI async routes, Pydantic v2, `ruff` formatting, type hints everywhere.
- **TypeScript**: Strict mode, functional components, no `any`.
- **Tests**: `pytest` for backend, `vitest` for frontend.
- **Imports**: absolute from project root. `from backend.app.models import X`
- **Errors**: custom exception hierarchy → HTTPException with detail.

## Active Context
- **Phase**: v0.1 MVP Foundation
- **Current Focus**: Project scaffold with git, VISION.md, AGENTS.md, ARCHITECTURE docs
- **Recent Decisions**: 2026-06-03 — Created full folder structure, VISION.md, AGENTS.md, README.md, 9 architecture docs under docs/architecture/, initialized git with generic identity. Added opencode.json with instructions=[AGENTS.md, VISION.md] for compaction context.
- **Recent Decisions**: 2026-06-03 — Backend scaffold complete: FastAPI app with lifespan (init_db, discover_plugins), Plugin ABC + auto-discovery, Provider ABC + registry with 4 stubs, SQLite schema + connection, Pydantic shared models, config via pydantic-settings, health endpoint verified. aubio skipped (needs MSVC build tools). Dev script `scripts/dev.ps1`. PYTHONPATH set to project root for imports.
- **Blockers**: None

## Task History
| Date | Task | Outcome |
|------|------|---------|
| 2026-06-03 | Initial project scaffold | Done — folders, VISION.md, AGENTS.md, README.md, ARCHITECTURE docs, git init |
| 2026-06-03 | Add opencode.json with instructions & compaction config | Done — AGENTS.md + VISION.md loaded as instructions, tail_turns=20 |
| 2026-06-03 | Backend scaffold (FastAPI, plugins, providers, DB, config) | Done — app starts, health endpoint returns OK, all layers wired |

## Feature Status (v0.1)
- [ ] Sample Analyzer
- [ ] Theory Engine
- [ ] Chord Progression Generator
- [ ] MIDI Export Engine
- [ ] Producer Chat
- [ ] Why Does This Sound Good?
- [ ] Finish My Idea (basic)

## Git Workflow
- `git add -A && git commit -m "scope: message"` after every meaningful change.
- Update AGENTS.md and ARCHITECTURE docs before each commit.
- Keep commits atomic: one feature or fix per commit.
- Always check `git status` and `git diff --staged` before committing.
- Use conventional commit prefixes: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.

## Next Actions
1. Initialize frontend (Electron + React + TypeScript)
2. Begin Sample Analyzer plugin
3. Write first backend tests
