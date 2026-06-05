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

## Search Fallback Chain
When performing web searches, always try sources in this order. Skip to the next if rate-limited or unavailable:
1. **built-in `websearch`** (Exa AI) — fast, free, but rate-limited at ~10 concurrent calls with >7min cooldown
2. **Tavily MCP** (`tavily` server, if enabled) — AI-optimized results, 1,000 credits/month, best quality
3. **Firecrawl MCP** (`firecrawl` server, if enabled) — JS rendering support, 1,000 pages/month. Remote endpoint: `https://mcp.firecrawl.dev/mcp`
4. **Open-WebSearch MCP** (`open-websearch` server) — multi-engine: duckduckgo, bing, brave, exa, startpage
5. **DuckDuckGo MCP** (`duckduckgo` server) — lightweight Python fallback
6. **built-in `webfetch`** — no rate limit, but only for known URLs

For diverse results in research: use Open-WebSearch's `engines` parameter to query multiple backends simultaneously (`engines: ["duckduckgo", "brave", "exa"]`).

## Coding Conventions
- **Python**: FastAPI async routes, Pydantic v2, `ruff` formatting, type hints everywhere.
- **TypeScript**: Strict mode, functional components, no `any`.
- **Tests**: `pytest` for backend, `vitest` for frontend.
- **Imports**: absolute from project root. `from backend.app.models import X`
- **Errors**: custom exception hierarchy → HTTPException with detail.

## Active Context
- **Phase**: v0.1 MVP Foundation (Plan → Build)
- **Current Focus**: Implementation ready. Full plan in `plan-v0.1-review.md`. First task: Project concept (A1).
- **Recent Decisions**: 2026-06-05 — Full codebase audit + v0.1 forward plan written (`plan-v0.1-review.md`). 5 phases, 23 tasks, ~2,700 lines. AI Studio moved to last (Phase E). Sample Analyzer upgrade added: 4-algorithm key ensemble (zero new deps), confidence scores, edge-case robustness, "Apply to Project" button. Basic-Pitch (Apache-2.0, ONNX, ~50MB) identified as Phase 2 unlock for actual chord detection from audio. musicnn/CREMA/Omnizart deferred to Phase 3+.
- **Recent Decisions**: 2026-06-05 — FL Studio integration research completed (docs/research/fl-studio-integration.md). Splice Bridge case study added as section 10 — reverse-engineered VST3/AU plugin architecture, 3 generations (Bridge 2021, native DAW integrations 2025-2026, Sounds Plugin 2026 beta), comparison to Music Copilot's proposed VST3 bridge. Key finding: keep skip-Tier-4 strategy; if built, use JUCE + named pipes, thin plugin. 29 references.
- **Recent Decisions**: 2026-06-05 — Model Recommendations research completed (docs/research/model-recommendations.md). Evaluated 20+ tools across 5 categories. Confirmed deeprhythm + music21 as SOTA offline BPM/key. Recommended Groq (free tier) as primary LLM provider. ACE-Step 1.5 (Apache-2.0) best for AI music generation. Procedural (music21 + arvo) preferred over ML for Phase 1-3. Essentia flagged for AGPL license issue. 20 references.
- **Recent Decisions**: 2026-06-05 — Music Theory & Algorithms research completed (docs/research/music-theory-algorithms.md). 12 references across 6 topics: music21 voice leading (VoiceLeadingQuartet with 6 motion types), Roman numeral analysis (functionalityScore, secondary dominants), cadence detection (cadence-detector + CADET GNN vs music21-based approach), key modulation (5 algorithms via WindowedAnalysis), algorithmic composition (isobar 426 stars for Phase 3 melodies, arvo for procedural/counter-melody), post-tonal set theory. Key finding: all Phase 1-2 features need zero new dependencies — music21 already provides everything. isobar recommended for Phase 3 Melody/Bassline Generator.
- **Recent Decisions**: 2026-06-04 — New dashboard design (co-hero bento grid) replaces 4-page layout. All features on one screen. Design doc at `docs/design/new-dashboard.md`. Project concept and Idea Library expansion added to VISION.md.
- **Recent Decisions**: 2026-06-04 — Unified project flow: project is the container (always first). No branching UX — manual input, sample import, and theory generation converge into the same editable project state. Everything is overridable. Deterministic analysis core; AI limited to chat only. Documented in VISION.md (Design Philosophy) and dashboard design doc (Data Flow).
- **Recent Decisions**: 2026-06-04 — MIDI Expression Engine: added music theory-based velocity (by chord tone role, beat position, phrase arc, genre conventions, mood modifier), voicing (close/open/drop2), articulation gate length, arpeggiation (up/down/updown/trance), and full arrangement (bass + chords). Data models (`models.py`), expression rules (`theory.py`), pattern builders (`patterns.py`). Plugin schema extended with style/voicing/articulation/genre/mood/arpeggio_pattern/base_velocity fields. Frontend adds MIDI Style + Voicing dropdowns in Chord Progressions and Chord Generator tabs. 22 new tests, 82 total.
- **Recent Decisions**: 2026-06-04 — Chord Progression Generator (plugins/chord_generator/) replaces 10-template system with 50+ patterns across 7 moods, 2 modes. Supports all 24 keys, configurable length (4/8/16), complexity (simple/advanced with secondary dominants, deceptive cadences, tritone subs). Frontend: 5th tab in Music Theory with 5-column dropdowns. 10 new tests, 60 total.
- **Recent Decisions**: 2026-06-04 — Progression Library API uses dedicated router (backend/app/api/progressions.py) + DAO (backend/app/db/progressions.py), not a plugin, since it's a persistence layer not an analysis/generation feature. Three endpoints: POST (save), GET (list with sort), DELETE. Frontend Library page (Library.tsx) is a sortable table with date/mood/genre/key columns. Save button in Music Theory wired with loading/success state. 7 new tests, 43 total.
- **Recent Decisions**: 2026-06-04 — Sample Analyzer plugin (plugins/sample_analyzer/plugin.py) uses librosa 0.11.0 chroma_cqt + music21 10.3.0 s.analyze('key') for Krumhansl-Schmuckler key detection. Upload endpoint (backend/app/api/upload.py) validates file extension + mimetype before saving. EventBus fires 'sample.analyzed' only after successful analysis. Frontend api.ts as single HTTP boundary with separate types.ts. Tests use scipy.io.wavfile for synthetic audio generation.
- **Recent Decisions**: 2026-06-03 — librosa 0.11.0 beat_track returns np.ndarray (not scalar) — use float(np.atleast_1d(tempo)[0]). music21 10.3.0 KrumhanslSchmuckler uses s.analyze('key') returning Key object with .tonic (Pitch) and .mode (str) — not .solution.
- **Recent Decisions**: 2026-06-03 — BPM detection switched from librosa.beat.beat_track to librosa.feature.rhythm.tempo with std_bpm=2.0. beat_track's dynamic-programming beat tracker introduced errors for off-center tempos (174→107.7) by deriving BPM from median inter-beat-interval of poorly tracked beats. Direct autocorrelation via tempo() avoids this entirely. Click-track tests at 143 and 174 BPM added to prevent regression.
- **Recent Decisions**: 2026-06-03 — BPM detection further improved by switching from single-band onset envelope to multi-band onset (librosa.onset.onset_strength_multi) with per-band normalization to [0,1] before averaging. This gives quiet high-frequency bands (hi-hats carrying beat-rate periodicity) equal influence as loud low-frequency bands (kicks carrying half-time groove). Also increased frame rate (hop_length=512→256) for finer autocorrelation resolution. Click-track tests at 143 and 174 BPM confirmed no regression.
- **Recent Decisions**: 2026-06-03 — BPM detection replaced entirely with DeepRhythm CNN (deeprhythm 0.0.13, PyTorch-based). Achieves 95.91% Acc1 on CPU at 0.12s — significantly more accurate than librosa's signal-processing approach (66.84% Acc1). Falls back to librosa.feature.rhythm.tempo when confidence < 0.5. Model weights (~7 MB) cached at ~/.cache/deeprhythm/ on first use. Key/scale detection untouched.
- **Recent Decisions**: 2026-06-03 — Short audio (< 8s) tiled with np.tile to meet DeepRhythm's 8-second clip minimum. Prevents AttributeError crash in split_audio when audio is shorter than clip_length. The repeating preserves periodicity so DeepRhythm still detects the correct tempo. New test added for 3-second audio. Confidence-based fallback still active.
- **Recent Decisions**: 2026-06-04 — Tempo-doubling heuristic removed (fragile — autocorrelation couldn't reliably distinguish half-time from full-time). Replaced with user-selectable BPM range dropdown (Auto / 50–150 / 100–200 / 150–250). Backend: `SampleAnalyzerInput` has `min_bpm`/`max_bpm` fields — if detected BPM is outside range and doubling/halving fits, applies correction. Frontend: `<select>` dropdown above drop zone. Zero false positives since user opts in. All 17 tests pass.
- **Recent Decisions**: 2026-06-05 — Overall Musical Understanding research completed (docs/research/overall-musical-understanding.md). 9 sections covering: Omnizart (MIT, 1.9k ★, v0.6.3 May 2026 — full polyphonic AMT with 6 transcription modes), MSAF (MIT, 555 ★ — section boundary detection), energy/tension curves from librosa, genre/mood via musicnn (ISC, 704 ★), audio-to-MIDI comparison table, music similarity (Gaia reference + custom librosa approach), MIRFLEX unified extraction framework, 3-layer analysis pipeline architecture, phase-based recommendations. 26 references. Key finding: Omnizart is the biggest Phase 3+ unlock — single `pip install omnizart` gives chord/drum/beat/music/vocal transcription.
- **Recent Decisions**: 2026-06-05 — Search fallback chain implemented in opencode.json with 4 MCP servers. Order: websearch → Tavily (1k/mo) → Firecrawl (1k/mo) → Open-WebSearch (9 engines) → DuckDuckGo → webfetch. Tavily and Firecrawl use API keys (no CC, configured in opencode.json). Open-WebSearch and DuckDuckGo are zero-config. AGENTS.md now documents the fallback chain as agent instructions.
- **Recent Decisions**: 2026-06-05 — Search chain verified end-to-end. All 6 tiers confirmed working: (1) websearch delivers results, (2) Tavily remote MCP responds with 5 tools (search, extract, crawl, map, research), (3) Firecrawl remote MCP responds with 13 tools at `/mcp` (corrected from `/v2/mcpp`), (4) Open-WebSearch starts with 9 engines, (5) DuckDuckGo MCP v0.1.1 installed and starts, (6) webfetch fetches URLs. Firecrawl endpoint fixed from `/v2/mcpp` to `/mcp` in opencode.json.
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
| 2026-06-04 | MIDI Expression Engine | Done — music theory velocity, voicing, articulation, arpeggiation, full arrangement. 22 new tests, 82 total. |
| 2026-06-04 | New dashboard design + docs | Design — co-hero bento grid replaces 4-page nav. docs/design/new-dashboard.md created. VISION.md Phase 1 expanded with Project concept, Idea Library expansion, Global Search. |
| 2026-06-05 | Research Topic 3 — FL Studio Integration | Done — docs/research/fl-studio-integration.md with 9 sections (MIDI scripting API, piano roll/Edison, Flapi, virtual MIDI ports, JUCE VST3, drag-and-drop, tiered architecture). Splice Bridge case study added as section 10. 29 references. |
| 2026-06-05 | Research Topic 4 — Model Recommendations | Done — docs/research/model-recommendations.md. 20+ tools across 5 categories (analysis, stem sep, tagging, generation, LLM). Phase-based recommendation table. 20 references. |
| 2026-06-05 | Research Topic 5 — Music theory & algorithms (mathematical deep-dive) | Done — updated docs/research/music-theory-algorithms.md to 641 lines. 7 new sections: Tymoczko, Neo-Riemannian, Spiral Array, Lerdahl TPS, Forte set theory, K-S cognitive profiles, comma problem. 15 new references (13–27). |
| 2026-06-05 | Research Topic 6 — Advanced MIDI Generation | Done — docs/research/advanced-midi-generation.md with 7 sections (isobar deep-dive, swing, humanization, drums, basslines, MIDI infrastructure mapping, phase recommendations). 12 references. Committed (80b79f5). |
| 2026-06-05 | Research Topic 7 — Overall Musical Understanding | Done — docs/research/overall-musical-understanding.md with 9 sections (Omnizart AMT, MSAF structure analysis, energy/tension curves, genre/mood/instrumentation, audio-to-MIDI comparison, music similarity, MIRFLEX, 3-layer pipeline architecture, phase recommendations). 26 references. Key finding: Omnizart (MIT, v0.6.3, May 2026) is the biggest Phase 3+ unlock. |
| 2026-06-05 | docs/research/RULES.md — rotation strategy | Done — updated with alternation pattern: websearch (≤3) → webfetch → websearch. |
| 2026-06-05 | Search chain MCP servers (Tavily, Firecrawl, Open-WebSearch, DuckDuckGo) | Done — 4 MCP servers configured in opencode.json, fallback chain documented in AGENTS.md, DuckDuckGo MCP installed via pip.
| 2026-06-05 | Search chain end-to-end verification | Done — all 6 tiers tested and confirmed working. Firecrawl URL corrected from /v2/mcpp to /mcp.
| 2026-06-05 | Full codebase audit + v0.1 forward plan | Done — plan-v0.1-review.md written with 5 phases, 23 tasks, ~2,700 lines. AI Studio moved to last. Sample Analyzer upgrade added.

## Feature Status (v0.1)
- [x] Samples (analyze BPM, key, scale)
- [x] Theory Engine (scales, chords, intervals)
- [x] Chord Progression Generator
- [x] MIDI Export Engine
- [x] Progression & Melody Library (save, browse, sort — MIDI drag-and-drop stubbed)
- [ ] AI Studio (chat + analysis + composition assistant)

## v0.1 Build Plan (5 phases, 23 tasks)
See `plan-v0.1-review.md` for full details:
- **Phase A** — Foundation: Project concept, Ideas migration, state management
- **Phase B** — Sample Analyzer Upgrade: Multi-algo key, confidence, edge cases
- **Phase C** — Dashboard: Bento grid, Project Anchor, Chord Pads, absorb panels
- **Phase D** — Search & Voice Leading: Ctrl+K, voice-leading scoring, polish
- **Phase E** — AI Studio: Groq provider, chat endpoint, wire UI (last)

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
- [x] Research Topic 1 — Project-based tool patterns
- [x] Research Topic 2 — Note/chord recognition (16 sources)
- [x] Research Topic 3 — FL Studio integration (29 references)
- [x] Research Topic 4 — Model recommendations (20+ tools)
- [x] Research Topic 5 — Music theory & algorithms (27 references)
- [x] Research Topic 6 — Advanced MIDI generation (12 references)
- [x] Research Topic 7 — Overall musical understanding (26 references)

## Git Workflow
- `git add -A && git commit -m "scope: message"` after every meaningful change.
- Update AGENTS.md and ARCHITECTURE docs before each commit.
- Keep commits atomic: one feature or fix per commit.
- Always check `git status` and `git diff --staged` before committing.
- Use conventional commit prefixes: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.

## Next Actions
1. Project concept (projects table, API, session persistence) — Phase A1
2. Idea Library migration (progressions → ideas table) — Phase A2
3. Frontend state management (projectContext.tsx + useApi hook) — Phase A3
4. Sample Analyzer upgrade (multi-algo key, confidence, edge cases) — Phase B
5. Dashboard implementation (bento grid layout, Project Anchor, Chord Pads) — Phase C
6. Global search (Ctrl+K overlay) — Phase D1-D2
7. Voice-leading scoring — Phase D3
8. AI Studio integration — Phase E (last)
