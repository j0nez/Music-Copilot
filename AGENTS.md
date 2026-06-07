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
- Shared music theory constants live in `shared/music_theory.py`, not duplicated per module.
- Provider layer has zero dependency on backend config — `configure(provider_name, api_key)` receives credentials explicitly at startup.
- After every significant change: (1) update AGENTS.md (Active Context / Feature Status), (2) update ARCHITECTURE docs if structure changed, (3) `git add -A && git commit`.

## Coding Conventions
- **Python**: FastAPI async routes, Pydantic v2, `ruff` formatting, type hints everywhere.
- **TypeScript**: Strict mode, functional components, no `any`.
- **Tests**: `pytest` for backend, `vitest` for frontend.
- **Imports**: absolute from project root. `from backend.app.models import X`; shared constants from `shared.music_theory`.
- **Errors**: custom exception hierarchy → HTTPException with detail.
- **Async audio**: heavy librosa calls wrapped in `asyncio.to_thread()` for non-blocking analysis (not `get_duration` — pure math).
- **Frontend API**: all fetch methods accept optional `AbortSignal` for cancellation.

## Active Context
- **Phase**: v0.1 MVP Foundation
- **Current Focus**: Library shows scale alongside key for melody/bassline/arrangement items. All existing items show `—` for scale (no retroactive data). Next: Phase E (AI Studio).
- **Recent Decisions**: 2026-06-06 — All 7 original implementation batches done + all 13 post-audit fixes. Batches A–D (P0–P3) completed: audio playback (Web Audio API), Expression Engine integration (phrase arc velocity, articulation gate), swing pipeline, _map_range centering fix, bassline octave_jump fix, project state auto-fill, preset chip auto-trigger, clear vs regenerate separation, Generation Hub full controls, Ctrl+S arrangement save, VL score badge, generation history ring buffer. 154 tests pass (131 backend + 23 frontend).
- **Recent Decisions**: 2026-06-07 — Infrastructure & polish: `shared/music_theory.py` created (consolidated NOTE_TO_SEMITONE, CHORD_INTERVALS, DIATONIC_QUALITIES from 4+ files). Provider layer decoupled from backend config (`configure()` takes explicit `provider_name`/`api_key`; `generate()` no longer auto-inits). EventBus handlers run concurrently via `asyncio.gather` with per-handler error isolation. Sample Analyzer: lazy `DeepRhythmPredictor` (delayed import), `asyncio.to_thread` for librosa calls, double-analysis guard. Frontend: `AbortController` replaces `Promise.race` for timeouts, `ErrorBoundary` wraps app, playhead refactored to imperative SVG API (no re-renders), proper chord→MIDI pitch mapping, per-part mute buttons, Library "Load" support, `ReferencePopover` now shows actual chord/interval content.
- **Recent Decisions**: 2026-06-07 — Qodo code review fixes (7 batches). Pattern/complexity mixup fixed (dedicated `pattern` field in GeneratorSettings). History cycling uses stable index ref instead of `arr.indexOf()` reference equality. Arrangement save route uses Pydantic schema + structured logging. Export download hardened with extension whitelist + resolve guard. GenerationHub uses AbortController + shows error feedback. Shared `withAbort` extracted to `utils/async.ts`. Shared `PITCH_CLASSES`/`chordNotesToMidi` in `music/pitch.ts`. ErrorBoundary imports `ReactNode`/`ErrorInfo` directly. Scale dropdown includes 'Auto' option.
- **Recent Decisions**: 2026-06-07 — UX polish round: (1) Unicode arrows in MIDIPlayer cycle buttons fixed (`\u25B2`→`{'\u25B2'}`); (2) MIDI download uses blob+fetch instead of `window.open` (avoids popup block); (3) per-part MIDI download buttons added to MIDIPlayer bottom bar; (4) LibraryModal gets "Arrangements" tab + per-part data display + per-part Load buttons for arrangement items; (5) Dashboard `handleLoadFromLibrary` handles both progression arrays and arrangement objects; (6) Arrangement save auto-splits into individual part entries (`name — Chords/Melody/Bassline`) so each appears on its own tab in Library. Backend: `save_idea()` generic inserter added to `progressions.py`; per-part export endpoint accepts `bpm` in body. Frontend: `downloadFromUrl()` and `exportSinglePart()` added to `api.ts`.
- **Recent Decisions**: 2026-06-07 — Qodo review batch 2 (post-polish): (A) DB CHECK constraint expanded — added `arrangement` and `arrangement_chords` types to `ideas` schema + table recreation migration preserves existing data. (B) `downloadFromUrl` SSRF fix — only relative URLs, always prepend localhost. (C) `/arrangement/per-part` uses `PerPartExportInput(BaseModel)` instead of untyped `dict`. (D) Auto-split saves chords as `arrangement_chords` (not `progression`) with correct `Note[]` data shape; all split saves carry `bpm` from the project. (E) `saveArrangement()` api call accepts `bpm`; Dashboard/GenerationHub pass `project.bpm` on save. (F) `ArrangementMidiButton` threads `p.bpm` instead of hardcoded 120. (G) `NoteListMidiButton` component for per-type MIDI download (melody/bassline/arrangement_chords) via existing `/arrangement/per-part` endpoint. (H) `get_any_idea()` helper added for generic idea lookup. (I) Pattern casing normalized to `'Auto'` (matching other auto fields) + backend comparison made case-insensitive. (J) `save_idea` logging includes `project_id`/`key` context. All issues from Qodo review batch resolved: SSRF, untyped payload, wrong chords data shape + bpm hardcode, pattern casing, logging context.
- **Recent Decisions**: 2026-06-07 — Note name badges in LibraryModal. Added `midiPitchToName()` and `SEMITONE_TO_NOTE` to `music/pitch.ts`. LibraryModal renders colored note-name badges (melody=green, bassline=blue, arrangement_chords=purple) truncated at 20 with `+N` remainder. Next: save scale with arrangement/ideas.
- **Recent Decisions**: 2026-06-07 — `scale` column added to `ideas` DB table. `save_idea()` and `save_arrangement()` accept optional `scale` param. `ArrangementSaveInput` has `scale` field. Frontend `saveArrangement()` passes `scale`. Dashboard passes `settings.scale` (always major/minor from GeneratePanel). GenerationHub passes `resolveScale()` (resolves Auto to project scale). LibraryModal displays `Key — scale` column. TypeScript compiles cleanly.
- **Recent Decisions**: 2026-06-07 — Phase 1 audit fix batch: NoteGrid bar line bug (`beat % BEATS_PER_BAR` instead of `beat % BEAT_WIDTH`). Dashboard `handleRegenerate()` uses `project?.key` and `project?.scale?.toLowerCase()` instead of hardcoded `'C'`/`'major'`. GeneratePanel scale dropdown adds `'Auto'` option (consistent with GenerationHub). ProjectSummary MIDI download uses `downloadFromUrl()` (blob+fetch) instead of `window.open()`.
- **Recent Decisions**: 2026-06-07 — Phase 2 audit fix batch: GenerationHub `handleSave()` now checks `res.success` and shows error via existing `error` state. Dashboard `handleSaveArrangement()` has `saving` state (guards double-click + disabled), checks API response, and shows a top-center toast (green on success, red on error) that auto-dismisses after 3s.
- **Recent Decisions**: 2026-06-07 — Phase 3 audit fix batch: README corrected (removed claims for unimplemented Producer Chat/Why Does This Sound Good?/Finish My Idea). All 17 remaining exported API functions now accept optional `AbortSignal`. Dead `Idea` interface removed from `types.ts`. Dead `ChordPads.tsx` component deleted. Empty `backend/tests/`, `services/audio/`, `services/chat/` directories cleaned up. Architecture docs (`frontend.md`, `api-contract.md`) updated. MIDI `_note_name_to_midi()` confirmed correct (no bug).
- **Recent Decisions**: 2026-06-07 — Phase E (AI Studio) fully implemented. Multi-provider registry with auto-failover (Groq + OpenRouter live, others stubs). Provider config API stores keys in DB, never returns full key. Chat API route injects project context + knowledge base + conversation history. AiStudio chat UI in right column (hero panel, 55%). Project Summary collapsed to compact bottom-row strip. Knowledge_base.txt with version marker. 125 backend + 23 frontend tests pass.
- **Recent Decisions**: 2026-06-07 — Code review fixes (7 issues resolved). #1: `provider_used=response.provider` instead of `response.model` in chat.py. #2: Chat history only saved after successful round-trip (prevents error message pollution). #3: `isobar>=5.9.2` added to backend/pyproject.toml. #4+#5: `_SCALE_NAMES`, `resolve_phrase_multiplier` (public rename), `resolve_gate_length`, and gate dicts moved from `theory.py`/plugins to `shared/music_theory.py` — plugins no longer import from `backend.app.services.midi.theory`. #6: AiStudio history restore parses `created_at` from server instead of `Date.now()` for all messages. #7: ProviderSettings now sends model-only changes; backend `ConfigureRequest.api_key` optional (doesn't overwrite key on model-only update).
- **Recent Decisions**: 2026-06-07 — Two bug fixes for local-network + local-PC provider list empty. (A) `backend/app/api/providers.py:29`: `@router.get("")` → `@router.get("/")` — the route was registered at `/api/providers` (no trailing slash) but frontend calls `/api/providers/` (with trailing slash), causing 404 on all requests (affects local PC too, confirmed by server log). (B) `frontend/src/renderer/api.ts:20`: `BASE = 'http://localhost:8000/api'` → `BASE = '/api'` — hardcoded localhost URL fails from laptop where `localhost` resolves to itself; relative URL always goes to same-origin server (correct since frontend is served by FastAPI). Frontend rebuilt.
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
| 2026-06-06 | Batch E (P4) — Preset corrections + swing defaults | Done — complexity swaps, Deep House mood/genre fix, swing auto-set on genre switch |
| 2026-06-07 | Infrastructure & polish updates | Done — shared/music_theory.py, provider decoupling, async EventBus, async sample analyzer, AbortController, ErrorBoundary, imperative playhead, mute buttons, Library Load |
| 2026-06-07 | Qodo review fixes (7 batches) | Done — shared pitch utility (music/pitch.ts), shared withAbort (utils/async.ts), GeneratorSettings pattern field, Scale Auto option, arrangement save Pydantic schema + logging, export extension whitelist + resolve guard, history index ref (fix array ref equality), GenerationHub AbortController + error feedback, ErrorBoundary React import |

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
- [x] AI Studio (multi-provider chat with project context, knowledge base, auto-failover)

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
- [x] Backend tests (13 test files, 23 frontend tests)

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
12. ✅ Batch E (P4) — Preset value corrections (complexity swaps, Deep House mood), swing preset-driven defaults (auto-set on genre switch via prevGenreRef). Bassline velocity (phrase arc, DnB offbeat 80, PAccent) already done in Batch A.
13. ✅ **Phase E — AI Studio** — See `docs/plans/04-phase-e-ai-studio.md` for full plan (8 tasks, ~850 lines)
     - ✅ E1 — Multi-provider registry + auto-failover + Groq/OpenRouter implementations
     - ✅ E2 — Provider configuration API
     - ✅ E3 — Chat API route with project context
     - ✅ E4 — Chat history service
     - ✅ E5 — Knowledge base file
     - ✅ E6 — AiStudio chat UI component (hero panel)
     - ✅ E7 — Provider Settings UI modal
     - ✅ E8 — Dashboard integration + compact Project Summary
