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
- **Current Focus**: MIDI Export Engine + Chord Progression Generator done. 60 tests pass. No AI yet — all deterministic. Next: AI Studio integration (Producer Chat, Why Does This Sound Good?, Finish My Idea).
- **Recent Decisions**: 2026-06-04 — MIDI Export Engine built as three layers: service (backend/app/services/midi/generator.py writes .mid via pretty_midi), plugin (plugins/midi_export/ maps progression→MIDI), download endpoint (GET /api/progressions/{id}/midi returns FileResponse). Frontend: Export MIDI button in Music Theory + Library. 7 new tests.
- **Recent Decisions**: 2026-06-04 — Chord Progression Generator (plugins/chord_generator/) replaces 10-template system with 50+ patterns across 7 moods, 2 modes. Supports all 24 keys, configurable length (4/8/16), complexity (simple/advanced with secondary dominants, deceptive cadences, tritone subs). Frontend: 5th tab in Music Theory with 5-column dropdowns. 10 new tests, 60 total.
- **Recent Decisions**: 2026-06-04 — Progression Library API uses dedicated router (backend/app/api/progressions.py) + DAO (backend/app/db/progressions.py), not a plugin, since it's a persistence layer not an analysis/generation feature. Three endpoints: POST (save), GET (list with sort), DELETE. Frontend Library page (Library.tsx) is a sortable table with date/mood/genre/key columns. Save button in Music Theory wired with loading/success state. 7 new tests, 43 total.
- **Recent Decisions**: 2026-06-04 — Sample Analyzer plugin (plugins/sample_analyzer/plugin.py) uses librosa 0.11.0 chroma_cqt + music21 10.3.0 s.analyze('key') for Krumhansl-Schmuckler key detection. Upload endpoint (backend/app/api/upload.py) validates file extension + mimetype before saving. EventBus fires 'sample.analyzed' only after successful analysis. Frontend api.ts as single HTTP boundary with separate types.ts. Tests use scipy.io.wavfile for synthetic audio generation.
- **Recent Decisions**: 2026-06-03 — librosa 0.11.0 beat_track returns np.ndarray (not scalar) — use float(np.atleast_1d(tempo)[0]). music21 10.3.0 KrumhanslSchmuckler uses s.analyze('key') returning Key object with .tonic (Pitch) and .mode (str) — not .solution.
- **Recent Decisions**: 2026-06-03 — BPM detection switched from librosa.beat.beat_track to librosa.feature.rhythm.tempo with std_bpm=2.0. beat_track's dynamic-programming beat tracker introduced errors for off-center tempos (174→107.7) by deriving BPM from median inter-beat-interval of poorly tracked beats. Direct autocorrelation via tempo() avoids this entirely. Click-track tests at 143 and 174 BPM added to prevent regression.
- **Recent Decisions**: 2026-06-03 — BPM detection further improved by switching from single-band onset envelope to multi-band onset (librosa.onset.onset_strength_multi) with per-band normalization to [0,1] before averaging. This gives quiet high-frequency bands (hi-hats carrying beat-rate periodicity) equal influence as loud low-frequency bands (kicks carrying half-time groove). Also increased frame rate (hop_length=512→256) for finer autocorrelation resolution. Click-track tests at 143 and 174 BPM confirmed no regression.
- **Recent Decisions**: 2026-06-03 — BPM detection replaced entirely with DeepRhythm CNN (deeprhythm 0.0.13, PyTorch-based). Achieves 95.91% Acc1 on CPU at 0.12s — significantly more accurate than librosa's signal-processing approach (66.84% Acc1). Falls back to librosa.feature.rhythm.tempo when confidence < 0.5. Model weights (~7 MB) cached at ~/.cache/deeprhythm/ on first use. Key/scale detection untouched.
- **Recent Decisions**: 2026-06-03 — Short audio (< 8s) tiled with np.tile to meet DeepRhythm's 8-second clip minimum. Prevents AttributeError crash in split_audio when audio is shorter than clip_length. The repeating preserves periodicity so DeepRhythm still detects the correct tempo. New test added for 3-second audio. Confidence-based fallback still active.
- **Recent Decisions**: 2026-06-04 — Tempo-doubling heuristic removed (fragile — autocorrelation couldn't reliably distinguish half-time from full-time). Replaced with user-selectable BPM range dropdown (Auto / 50–150 / 100–200 / 150–250). Backend: `SampleAnalyzerInput` has `min_bpm`/`max_bpm` fields — if detected BPM is outside range and doubling/halving fits, applies correction. Frontend: `<select>` dropdown above drop zone. Zero false positives since user opts in. All 17 tests pass.
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
| 2026-06-03 | UI consolidation — AI Studio + Music Theory + Samples | Done — merged 7 pages into 4, AI Studio with context panel, Music Theory with tabs, docs/design/decisions.md created |
| 2026-06-03 | Sample Analyzer plugin + upload endpoint + Samples page + tests | Done — plugins/sample_analyzer/plugin.py with librosa BPM + Krumhansl-Schmuckler key detection via music21, upload endpoint with extension/mimetype validation, event emission (sample.analyzed), frontend api.ts/types.ts, drag-and-drop Samples page with result cards, 14 backend tests all passing |
| 2026-06-03 | BPM detection: beat_track → tempo() → multi-band onset → DeepRhythm CNN | Done — three iterative improvements: (1) beat_track → tempo() fixed 174→107.7 to 174→123, (2) multi-band onset normalization added no further improvement, (3) DeepRhythm CNN replaces signal-processing entirely. Short audio (<8s) tiled to 8s to prevent split_audio crash. 17 tests passing. |
| 2026-06-04 | Tempo-doubling heuristics (autocorrelation, multi-band, proportional threshold) | Removed — autocorrelation approach fundamentally unreliable for percussion. Replaced with user BPM range selector. |
| 2026-06-04 | BPM range selector for half-time fix | Done — dropdown with 4 options (Auto / 50–150 / 100–200 / 150–250) on Samples page. Backend doubles/halves when detected BPM falls outside the selected range. Zero false positives, full user control. |
| 2026-06-04 | Theory Engine plugin + 19 tests | Done — scales (11 types), chords (9 qualities), intervals, progressions (10 mood×key combos). All offline, no AI. 36 total tests passing. |
| 2026-06-04 | Progression Library API + frontend + tests | Done — 3 endpoints (save, list, delete), DAO helper, sortable Library table, Save button wired in Music Theory. 7 new tests, 43 total. |
| 2026-06-04 | MIDI Export Engine | Done — three-layer: service (pretty_midi writer), plugin (POST /api/plugins/midi_export/execute), download (GET /api/progressions/{id}/midi). Frontend Export MIDI buttons in Theory + Library. 7 new tests. |
| 2026-06-04 | Chord Progression Generator | Done — plugins/chord_generator/ with 50+ templates across 7 moods, all 24 keys, configurable length/complexity. Secondary dominants, deceptive cadences, substitutions. Frontend: 5th Music Theory tab. 10 new tests. 60 total. |

## Feature Status (v0.1)
- [x] Samples (analyze BPM, key, scale)
- [x] Theory Engine (scales, chords, intervals)
- [x] Chord Progression Generator
- [x] MIDI Export Engine
- [x] Progression & Melody Library (save, browse, sort — MIDI drag-and-drop stubbed)
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
- [x] opencode.json with instructions + compaction config
- [x] Error handling (exception hierarchy + rotating file logger + global handlers)
- [x] Frontend scaffold (Electron + React + TypeScript + Vite + Tailwind)
- [x] File upload endpoint (POST /api/upload with extension/mimetype validation)
- [x] Sample Analyzer plugin (BPM, key, scale, duration via librosa + music21 K-S)
- [x] Event emission (sample.analyzed) with async event_bus.emit()
- [x] Frontend api.ts (thin fetch wrapper) + types.ts (shared result types)
- [x] Samples page (drag-and-drop upload + result cards UI)
- [x] Progression Library API (POST/GET/DELETE + DAO)
- [x] Library page (sortable table with delete)
- [x] Save button wired in Music Theory page
- [x] Backend tests (60 tests: event bus, plugin discovery, sample analyzer, theory engine, progressions, midi export, chord generator)

## Git Workflow
- `git add -A && git commit -m "scope: message"` after every meaningful change.
- Update AGENTS.md and ARCHITECTURE docs before each commit.
- Keep commits atomic: one feature or fix per commit.
- Always check `git status` and `git diff --staged` before committing.
- Use conventional commit prefixes: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.

## Next Actions
1. AI Studio integration (Producer Chat, Why Does This Sound Good?, Finish My Idea)
