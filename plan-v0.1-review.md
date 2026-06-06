# Music Copilot — v0.1 Review & Forward Plan

> **Temporary planning document.** Will be finalized and merged into VISION.md/AGENTS.md once approved.
> Based on full codebase audit (Jun 2026), 7 research topics, 82 passing tests, and architectural analysis.

---

## 1. Current State Summary

### 1.1 Works Today (4 fully implemented plugins)
| Area | Status | Tech | Tests |
|------|--------|------|-------|
| Sample Analyzer (BPM/key/scale/length) | ✅ Complete | DeepRhythm CNN + librosa + music21 K-S | ✅ 17 tests |
| Theory Engine (scales/chords/intervals) | ✅ Complete | music21 + manual pentatonics | ✅ 19 tests |
| Chord Progression Generator (50+ templates) | ✅ Complete | music21 + secondary dominants + substitutions | ✅ 10 tests |
| MIDI Export Engine (5 styles, velocity, voicing, arpeggiation) | ✅ Complete | pretty_midi + custom theory engine | ✅ 22+7 tests |
| Progression Library API (save/list/delete) | ✅ Complete | FastAPI + SQLite DAO | ✅ 7 tests |
| **Total** | **82 tests** | **All green** | |

### 1.2 Frontend Pages
| Page | Status | Reality |
|------|--------|---------|
| **Samples** | ✅ Fully wired | Drag-drop upload + BPM range + result cards |
| **Music Theory** | ✅ Fully wired | 5 tabs, all 4 API calls connected |
| **Library** | ✅ Fully wired | Sortable table, MIDI download, delete |
| **Dashboard** | ❌ Placeholder | 3 static FeatureCards, bento grid not started |
| **AI Studio** | ❌ Placeholder | 195 lines of fake chat responses, no API wiring |

### 1.3 Stubs (empty directories — no code)
| Plugin | Purpose | Phase |
|--------|---------|-------|
| `finish_my_idea/` | "Why Does This Sound Good?" + Finish My Idea | v0.1 Plan / Phase 4 |
| `melody_generator/` | Phase 3 melody/bass/drum generation | Phase 3 |
| `producer_coach/` | Mix feedback, practice mode, skill tracking | Phase 8 |
| `reference_analyzer/` | Reference track analysis | Phase 5 |
| `splice_library/` | Splice integration / sample library scanner | Phase 6 |

### 1.4 Infrastructure
| Area | Status | Notes |
|------|--------|-------|
| Backend scaffold | ✅ | FastAPI + lifespan + CORS + config |
| SQLite (6 tables) | ✅ | WAL mode, Row factory |
| Plugin ABC + discovery | ✅ | Auto-scans `plugins/*/plugin.py` |
| EventBus | ✅ | on/off/emit with typing |
| AI Provider Layer | ✅ Stubs | OpenAI, Groq, GLM, OpenRouter — none configured |
| Error handling | ✅ | Hierarchy + rotating file logger + global handlers |
| Frontend scaffold | ✅ | Electron + Vite + React 19 + Tailwind 3 |
| Frontend api.ts | ✅ | 9 fetch functions, all working |
| **Frontend store/** | ❌ Empty | No state management pattern exists |
| **Frontend tests** | ❌ None | 0 frontend tests |
| **Search chain** | ✅ | 6 tiers confirmed working |

---

## 2. What to Change

### 2.1 CHANGE — Dashboard: Placeholder → Bento Grid

**Current:** `Dashboard.tsx` — 50 lines, 3 static FeatureCards, no interactivity.

**Target:** Full co-hero bento grid per `docs/design/new-dashboard.md`.

**Specific changes:**
- Rewrite `Dashboard.tsx` with the layout: TopBar (logo + Ctrl+K + Library button) → Project Anchor + Co-Producer Chat (enlarged) → Music Theory (collapsible) → Chord Pads + Sample Analysis + TBD panel
- Replace React Router's route-based navigation with a single-screen layout
- Update `Layout.tsx` sidebar to become the TopBar
- Wire up placeholder state for Project Anchor (reads from backend or local state)
- Wire up placeholder state for Co-Producer Chat (reads from AI provider or shows "coming soon")
- Wire up Chord Pads component (playable via Web Audio API, reorderable)
- Remove the 4-page routing structure (Dashboard, Music Theory, Samples, AI Studio as separate routes)

**Dependencies:** None new. Tailwind grid + pointer events for DnD + Web Audio API (all built-in).

**Estimate:** ~400 lines of TSX across new components.

### 2.2 CHANGE — AI Studio: Fake Chat → Real Provider Chat

**Current:** `AiStudio.tsx` — 195 lines, all responses are hardcoded: `"Thanks for your message! AI features will be wired to the provider layer in a future update."`

**Target:** Real chat via configured AI provider (Groq recommended).

**Specific changes:**
- Add `POST /api/chat` route in backend that calls `llm.generate()` via the active provider
- Wire `AiStudio.tsx` to actually send messages to the backend and display responses
- Add project context injection: send current project (BPM, key, scale, mood, genre) as system prompt context
- Keep the UI (chat bubbles, input, context panel) — it's clean — just replace the fake responses
- The context panel should actually read from the Project Anchor / Sample Analyzer results

**Dependencies:** Groq API key (already stubbed as provider).

**Estimate:** ~1 new API route + wire AiStudio.tsx (remove ~20 lines of stub, add ~30 lines of real calls).

### 2.3 CHANGE — Frontend State Management: Ad-Hoc → Pattern

**Current:** Every page uses `useState` + `useEffect` directly. No hooks, no query library, no store.

**Target:** Create a `useApi` hook wrapper and a simple store context for project state.

**Specific changes:**
- Create `src/renderer/hooks/useApi.ts` — wraps fetch with loading/error/success states
- Create `src/renderer/store/projectContext.tsx` — React Context for current project state (name, BPM, key, scale)
- Migrate `Samples.tsx` and `Library.tsx` to use `useApi` hook
- No external state library needed for v0.1 (Context + custom hooks is sufficient)

**Dependencies:** None. Standard React patterns.

**Estimate:** ~100 lines of new code across 2 files.

### 2.4 CHANGE — Firecrawl URL (already fixed)

`/v2/mcpp` → `/mcp` in `opencode.json:13`. Resolved.

### 2.5 CHANGE — Sample Analyzer: Single-Algorithm → Multi-Algorithm Ensemble with Project Integration

**Current:** Uses music21 Krumhansl-Schmuckler only for key detection (one algorithm, ~75% accuracy). No confidence scores exposed. No project auto-fill.

**Target:** Multi-algorithm key ensemble (4 music21 algorithms), confidence scores, project auto-suggest, robust edge-case handling.

**Specific changes:**

**Backend — `plugins/sample_analyzer/plugin.py`:**

1. **Multi-algorithm key detection**: Run all 4 music21 key-finding algorithms and use consensus voting:
   - Krumhansl-Schmuckler (current default — simple key profile correlation)
   - Aarden (Dutch folksong corpus profiles, ~5% better for minor keys)
   - Bellman-Budge (enhanced profiles with octave-weighting, ~8% better for modal ambiguity)
   - Temperley (David Temperley's harmonic-pitch profiles, better for pop/rock)
   - Voting: if ≥3 agree → use that. If 2-2 split → use K-S result + flag `confidence: "low"`.
   - All 4 are available in music21 via `key.algorithms` — no new deps.

2. **Confidence scores** in output:
   - `bpm_confidence`: already from DeepRhythm (0.0–1.0), just expose it
   - `key_confidence`: based on algorithm agreement (4/4 = "high", 3/4 = "medium", 2/4 = "low")
   - `bpm_range_applied`: boolean, true if range correction triggered

3. **Edge-case robustness**:
   - Silence detection: if RMS energy < threshold across entire sample → return error "Audio appears to be silent"
   - Extremely short audio (< 0.5s): return error "Audio too short to analyze"
   - Noisy audio warning: if spectral flatness > threshold, include `warning: "high_noise"` in output (user sees yellow banner — not blocked)
   - These use librosa features already loaded — no new deps.

4. **`sample.analyzed` event payload expanded**:
   - Add `bpm_confidence`, `key_confidence`, `key_algorithms` (array of individual results), `warning`
   - Frontend can react to warnings + confidence levels

**Frontend — `Samples.tsx` / Sample Analysis Panel:**

5. **Confidence indicator** next to BPM and key values (colored dot: green=high, yellow=medium, red=low, or tooltip)
6. **"Apply to Project" button** — sends detected values to the Project Anchor (user must click — never auto-overwrites)
7. **Warning banner** below result card if analyzer detected noisy/high-noise audio (yellow, dismissable)

**Dependencies:** None. All algorithms in music21 (`music21.key.algorithms`), silence/noise detection in librosa (already imported).

**Estimate (core):** ~100 lines changed in plugin.py, ~30 lines in frontend, ~30 new tests.

**Future expansion — instrument + chord detection from audio:**

The v0.1 upgrade above stays zero-new-deps, but the research identifies paths for the deeper analysis you described:

| Option | Adds | Tools | Deps | Weight | Phase |
|--------|------|-------|------|--------|-------|
| **A — Basic-Pitch** | Note-level transcription → actual chord detection (extract every note → feed to music21 → detect chords); pitched vs unpitched classification (drums vs guitar vs bass vs keys); instrument activity windows | `basic-pitch` (Apache-2.0, 5.1k ★) | ONNX runtime (lightweight, no TF/PyTorch) | ~50MB model | **Phase 2** |
| **B — musicnn + Basic-Pitch** | Full instrument tagging (50-class CNN: distorted guitar, kick drum, hi-hat, etc.) + mood/genre + emotion + chord detection | `basic-pitch` + `musicnn` (ISC, 704 ★) | TensorFlow (~500MB+) | Heavy | Phase 3 |
| **C — Omnizart** | Single-model full transcription — chords + drums + vocals + bass + melody simultaneously | `omnizart` (MIT, 1.9k ★, v0.6.3) | PyTorch (~2GB model) | Heavy, GPU rec. | Phase 3+ |

**Recommendation:** Start with the zero-dep upgrade in v0.1 (multi-algo key, confidence, edge cases, project integration). **Add Option A (Basic-Pitch) in Phase 2** — it's the single biggest unlock for your use case: upload a guitar loop → basic-pitch extracts every note → music21 detects the actual chords being played → mood/tone inferred from chord qualities + energy. All with a lightweight ONNX dependency (~50MB). Skip Options B and C until Phase 3 when TF/PyTorch weight is justified.

---

## 3. What to Add

### 3.1 ADD — Project Concept (Table + API + Session)

**Background:** The unified project flow vision requires a `projects` container. Everything feeds into this.

**Specific additions:**
- New `projects` table in `database.py` (name, BPM, key, scale, created_at, updated_at)
- New `arrangements` table for per-variant state (project_id, name, BPM, mood, genre, data JSON)
- New router `backend/app/api/projects.py` with CRUD endpoints:
  - `POST /api/projects/` — Create
  - `GET /api/projects/` — List
  - `GET /api/projects/{id}` — Get with current arrangement
  - `PUT /api/projects/{id}` — Update metadata
  - `DELETE /api/projects/{id}` — Delete cascade
- New DAO `backend/app/db/projects.py`
- Frontend: Project Anchor component in Dashboard with inline-editable name/BPM/key/scale chips
- Auto-saves to backend on change (debounced, 500ms)
- "New Project" dialog on first launch
- Session persistence: last-opened project ID in `preferences` table

**Dependencies:** None new.

**Estimate:** ~300 lines backend + ~200 lines frontend.

### 3.2 ADD — Ideas Table Migration (Polymorphic)

**Background:** Current `progressions` table holds only chord progressions. Need polymorphic `ideas` table.

**Specific additions:**
- New `ideas` table: `id, project_id (FK), type (progression|melody|bassline|drum_pattern|arpeggio|phrase), name, data (JSON), key, mood, genre, bpm, created_at, updated_at`
- Migration script: copy `progressions` rows into `ideas` with `type='progression'`
- Update `backend/app/api/progressions.py` to read/write from `ideas` table
- Update `backend/app/db/progressions.py` DAO to target `ideas` table
- Add `type` filter parameter to list endpoint
- Keep `progressions` table for backward compatibility during transition
- Update Library frontend to show type filter tabs

**Dependencies:** None new. Pure SQL + API changes.

**Estimate:** ~150 lines backend + ~50 lines frontend.

### 3.3 ADD — Global Search (Ctrl+K Overlay)

**Background:** Search across Library, samples, and plugins from anywhere.

**Specific additions:**
- New backend endpoint: `GET /api/search/?q={query}&types={csv}` — searches across `ideas` (name, data), `samples` (filename), and plugin results
- Frontend: SearchOverlay component mounted at app root level
  - `Ctrl+K` keyboard listener (not scoped to search input — app-wide)
  - Modal overlay with search input + results list
  - Debounced input (300ms)
  - Categories: Ideas, Samples, (future) Plugins
  - Arrow key navigation + Enter to select
  - Escape to close
- Uses existing `listProgressions`-style API but aggregated

**Dependencies:** None new. Standard React portal + keyboard events.

**Estimate:** ~100 lines backend + ~200 lines frontend.

### 3.4 ADD — Voice-Leading Scoring (Zero New Deps)

**Background:** research (topic 5) shows music21's `VoiceLeadingQuartet` already covers voice-leading analysis with 6 motion types.

**Specific additions:**
- New method in `plugins/chord_generator/plugin.py` or new `plugins/voice_leading/plugin.py`
- For each adjacent chord pair in a progression: create `VoiceLeadingQuartet`, score for parallel 5ths/octaves (negative), contrary motion (positive)
- Neo-Riemannian parsimony check: test if L/P/R maps adjacent chords → max 2 voices move by ≤1 semitone
- Add voice-leading score to progression output metadata
- Expose in frontend as a "Voice Leading" badge or score on generated progressions

**Dependencies:** None. Already in music21.

**Estimate:** ~80 lines.

### 3.5 ADD — Groq AI Provider Configuration

**Background:** research (topic 4) confirms Groq as best free-tier LLM provider. Provider layer already stubbed.

**Specific additions:**
- Configure Groq API key in backend `.env` or config
- Verify `POST /api/chat` works end-to-end via `GroqProvider.generate()`
- Wire to AI Studio frontend

**Dependencies:** Groq API key (free at groq.com). Zero code changes (provider layer is already abstracted).

**Estimate:** ~5 minutes of config + verification.

---

## 4. What to Improve

### 4.1 IMPROVE — Frontend Error Handling

**Current:** `api.ts` throws errors as `throw new Error(await res.text())` with no structured error handling. No loading skeletons on any page. No retry logic.

**Target:**
- Standardize error handling in `api.ts` with typed error objects
- Add `LoadingSkeleton` component for list/result states
- Add retry button component for failed API calls
- Show `ApiResponse.error.code` and `error.message` consistently

**Estimate:** ~100 lines across components.

### 4.2 IMPROVE — Stub Plugin Structure

**Current:** 5 empty directories with no `plugin.py`. They pollute the plugin discovery log at startup.

**Target:** Either add minimal `plugin.py` stubs (with `execute()` returning a "not yet implemented" message) or remove the empty directories until ready to implement them.

**Recommendation:** Keep the directories but add minimal stubs so they show up in `GET /api/plugins/` with status "planned" rather than being invisible.

**Estimate:** ~10 lines per stub × 5 = 50 lines.

### 4.3 IMPROVE — Tests

**Current:** 82 backend tests, 0 frontend tests.

**Target:** Add basic frontend component tests via Vitest:
- Test `api.ts` functions with mock fetch
- Test Dashboard renders correctly
- Test Music Theory tab switching

**Estimate:** ~50 lines of test code.

### 4.4 IMPROVE — Remove Dead Code

- `AiStudio.tsx` fake response logic (replace, as noted in §2.2)
- `Dashboard.tsx` FeatureCards (replace, as noted in §2.1)
- Remove unused imports across all files

---

## 5. What to Remove

### 5.1 REMOVE — 4-Page Routing Architecture

**Current:** 5 routes (`/`, `/theory`, `/library`, `/ai-studio`, `/samples`) with sidebar navigation.

**Target:** Single screen. The sidebar becomes a TopBar. Pages become panels.

**Migration path:**
1. Build the bento grid layout in `Dashboard.tsx` (already the `/` route)
2. Absorb Music Theory → collapsible panel in the grid
3. Absorb Samples → compact panel with upload + cards
4. Absorb AI Studio → expanded Co-Producer Chat panel
5. Absorb Library → modal overlay via TopBar button + Ctrl+K
6. Remove `/theory`, `/library`, `/ai-studio`, `/samples` routes from `App.tsx`
7. Keep route structure for one version (Pages → `<Panel>` components) then delete route files

### 5.2 REMOVE — Empty `store/` Directory

**Current:** `frontend/src/renderer/store/` is empty.

**Target:** Populate with `projectContext.tsx` (see §3.1) or remove if not used.

**Recommendation:** Keep and populate (see §3.1).

### 5.3 REMOVE — Dead Research Pending Items

- Remove empty stub plugin directories that won't be implemented in v0.1 (melody_generator, producer_coach, reference_analyzer, splice_library)
- OR add minimal stubs so they're tracked

---

## 6. v0.1 Implementation Order

### Phase A — Foundation (Week 1)
| # | Task | Depends On | Effort |
|---|------|-----------|--------|
| A1 | Project concept — `projects` table, API, session persistence | None | ~500 lines |
| A2 | Ideas table migration — `progressions` → `ideas` polymorphic table | A1 (project FK) | ~200 lines |
| A3 | Frontend state management — `projectContext.tsx` + `useApi` hook | A1 | ~100 lines |

### Phase B — Sample Analyzer Upgrade (Week 1–2)
| # | Task | Depends On | Effort |
|---|------|-----------|--------|
| B1 | Multi-algorithm key ensemble (4 music21 algorithms + voting) | None | ~60 lines |
| B2 | BPM + key confidence scores in output | B1 | ~20 lines |
| B3 | Edge-case robustness (silence/short/noise detection) | None | ~30 lines |
| B4 | "Apply to Project" button in Samples panel | A1 | ~30 lines |
| B5 | Frontend confidence indicators + warning banners | B1–B3 | ~30 lines |
| B6 | New sample analyzer tests (multi-algo, edge cases) | B1–B3 | ~30 lines |

### Phase C — Dashboard (Week 2–3)
| # | Task | Depends On | Effort |
|---|------|-----------|--------|
| C1 | Bento grid layout — TopBar + panels scaffold | A1 (project state) | ~400 lines |
| C2 | Project Anchor component (inline-editable chips) | A1 | ~150 lines |
| C3 | Chord Pads component (playable via Web Audio API) | None | ~150 lines |
| C4 | Absorb Music Theory → collapsible panel | C1 | ~50 lines (refactor) |
| C5 | Absorb Samples → compact panel (with "Apply to Project") | B4 + C1 | ~60 lines |
| C6 | Remove old route files + sidebar nav | C1–C5 | ~50 lines (cleanup) |

### Phase D — Search & Voice Leading (Week 3)
| # | Task | Depends On | Effort | Status |
|---|------|-----------|--------|--------|
| D1 | Global search endpoint `GET /api/search/` | A2 (ideas table) | ~100 lines | ✅ Done |
| D2 | Ctrl+K SearchOverlay component | D1 | ~200 lines | ✅ Done |
| D3 | Voice-leading scoring (music21) | None | ~80 lines | ✅ Done |
| D4 | Frontend error handling improvements | None | ~100 lines | ✅ Done |
| D5 | Frontend tests (Vitest) | None | ~50 lines | ⬜ Remaining |
| D6 | Stub plugin cleanup | None | ~50 lines | ✅ Done |

### Phase E — AI Studio (Week 4 — Last)
| # | Task | Depends On | Effort |
|---|------|-----------|--------|
| E1 | Groq provider configuration + verification | None | ~15 min |
| E2 | `POST /api/chat` route with project context injection | E1 | ~80 lines |
| E3 | Wire AI Studio chat UI to real backend | E2 | ~40 lines |
| E4 | Absorb AI Studio → Co-Producer Chat panel in dashboard | E3 + C1 | ~30 lines |

### Total v0.1 Remaining Effort: ~2,700 lines across ~23 tasks

---

## 7. What to Defer (Future Phases)

| Feature | Rationale | Target Phase |
|---------|-----------|-------------|
| Melody/Bassline Generator | Requires isobar (`pip install`) | Phase 3 |
| Why Does This Sound Good? | Requires Lerdahl TPS implementation (~200 lines + integration) | Phase 4 |
| Finish My Idea (basic) | Requires audio analysis pipeline | Phase 4 |
| Basic-Pitch note transcription | New dependency (Apache-2.0, ONNX, ~50MB), enables actual chord detection from audio | Phase 2 |
| musicnn genre/mood/instrument tagging | New dependency (ISC, TF), 50-class CNN for full instrument detection | Phase 3 |
| CREMA chord recognition | New dependency (BSD-2), dedicated chord model as alternative to Basic-Pitch | Phase 3 |
| Omnizart full transcription | New dependency (MIT, PyTorch, ~2GB), single-model chords+drums+vocals+bass | Phase 3+ |
| FL Studio MIDI scripting script | Requires loopMIDI + testing | Phase 3 |
| Reference Analyzer | Requires MSAF + musicnn | Phase 5 |
| Stem Separation | Requires Demucs (GPU recommended) | Phase 9 |
| JUCE VST3 Bridge | 3-6 month C++ project | Phase 7 |

---

## 8. Research-Based Recommendations Summary

| Source | Key Recommendation | Action |
|--------|-------------------|--------|
| **Note/Chord Recognition** | Keep music21 K-S for v0.1. Add CREMA in Phase 2, Omnizart in Phase 3 | Upgrade to 4-algo ensemble (§2.5) — still zero new deps |
| **FL Studio Integration** | Skip Tier 4 (VST3). Tiers 1-3 (static MIDI → live MIDI → controller script) provide 90% value | Defer all Tier 2+ |
| **Model Recommendations** | Keep deeprhythm + music21. Groq for LLM. Procedural over ML for Phase 1-3 | Add Groq config (§3.5) |
| **Music Theory Algorithms** | music21 already does everything for Phase 1-2 (voice leading, Roman numerals, Neo-Riemannian, modulation detection) | Add voice-leading (§3.4) |
| **Advanced MIDI Gen** | isobar is the single biggest Phase 3 unlock (melody + bass + drums in one `pip install`) | Defer to Phase 3 |
| **Overall Understanding** | 3-layer pipeline: Core (Phase 1), Analysis (Phase 2-3), Comprehension (Phase 4+) | Architecture already fits |
| **Project-Based Tools** | Folder-based model, `projects` as container, `arrangements` for variants, `ideas` cross-project | Already planned (§3.1-3.2) |

---

## 9. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Dashboard bento grid too complex for v0.1 | Medium | High | Start with simpler 3-column layout, iterate |
| AI Studio context panel requires project state | Low | Medium | Wire to backend project API, fall back gracefully |
| Groq rate limits during development | Low | Low | Provider layer makes switching trivial (change config) |
| Port number conflicts (5173, 8000) | Low | Low | Document in README, make configurable |
| Electron 34 issues with Vite 6 | Low | Medium | electron-vite v5 handles this — verify build works |
| Plugin discovery breaks on empty dirs | Low | Low | Already handled — `directory` filter skips non-py files |
| DeepRhythm model download (~7 MB) | Low | Low | Downloads once on first use, cached at `~/.cache/deeprhythm/` |

---

## 10. Acceptance Criteria for v0.1

- [x] Single-screen dashboard loads with all panels visible (no route navigation)
- [x] Project Anchor: create project, edit name/BPM/key/scale inline, persists across sessions
- [x] Music Theory panel with 4 inline tabs (Scale, Chord, Interval, Progressions — Generator merged)
- [x] Samples panel — upload + analyze + results with BPM/key confidence indicators
- [x] Sample Analyzer uses 5-algorithm key ensemble (Krumhansl-Schmuckler, Aarden-Essen, Bellman-Budge, Temperley-Kostka-Payne, Simple-Weights) with voting
- [x] Sample Analyzer detects and warns on silence, short audio, and high-noise content
- [x] "Apply to Project" button sends sample analysis values to Project Anchor (never auto-overwrites)
- [x] Chord Pads: play generated progression via Web Audio API, reorder by drag
- [ ] Co-Producer Chat: send message → real AI response via Groq (or configured provider) — **Phase E (last)**
- [x] Library: accessible via TopBar button and Ctrl+K, sortable table, type filter
- [x] Global search (Ctrl+K): searches ideas, projects from anywhere (samples table exists but currently empty)
- [x] All 116 backend tests pass
- [x] No 4-page routing — Dashboard is the only route
- [x] Stub plugin cleanup — 5 stubs with "not yet implemented" responses
- [x] Frontend store/ populated with project context

---

*Last updated: 2026-06-06*
*Next step: Phase E — AI Studio (last)*
