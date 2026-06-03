# Key Design Decisions

This document records the rationale behind architectural decisions. Add new entries whenever a significant decision is made.

---

## 1. Offline-First for Analysis

**Decision:** Audio/MIDI analysis must work without internet access.

**Rationale:** Producers work in studios, on planes, or locations with unreliable internet. Core features (sample analysis, theory engine, MIDI export) should never require a network connection. Only AI-powered features (chat, "why does this sound good") need internet, and even those can be mocked or cached.

**Impact:** Audio analysis libraries (librosa, essentia, aubio) are local Python packages. No cloud dependency for core functionality.

---

## 2. Plugin-Based Feature System

**Decision:** Every feature is a self-contained plugin under `/plugins/`.

**Rationale:**
- Features can be developed, tested, and shipped independently.
- New contributors can add features without touching core code.
- Features can be enabled/disabled without code changes.
- The system is infinitely expandable — plugins are auto-discovered.

**Impact:** Slight overhead for the Plugin ABC and discovery mechanism, but eliminates tight coupling between features.

---

## 3. Provider-Agnostic AI Layer

**Decision:** Never call AI models directly. Always use `llm.generate(prompt)`.

**Rationale:**
- Prevents vendor lock-in — switch between OpenAI, Groq, GLM, or OpenRouter with a config change.
- Makes testing easy — mock the provider layer, not individual API calls.
- Future-proof — new model families can be added without touching feature code.
- Enables cost optimization — use cheap models for simple tasks, expensive models for complex ones.

**Impact:** Requires a well-defined Provider interface and registry, but eliminates AI provider coupling across the entire codebase.

---

## 4. SQLite for Persistence

**Decision:** Use SQLite with raw SQL. No ORM. No external database.

**Rationale:**
- Zero external dependencies — SQLite is built into Python.
- No database server to install, configure, or maintain.
- Single-file database makes backups and sharing trivial.
- Raw SQL keeps queries transparent and debuggable.
- WAL mode handles concurrent reads during analysis.

**Impact:** Not suitable for multi-user or server deployment, but this is a local desktop app. If multi-user is ever needed, the service layer abstraction makes migration to PostgreSQL feasible.

---

## 5. REST API (Not IPC) for Frontend-Backend Communication

**Decision:** Frontend communicates with backend via HTTP REST on localhost.

**Rationale:**
- Clear separation of concerns — frontend and backend are independent processes.
- Backend can be developed and tested with any HTTP client (curl, Postman, pytest).
- No Electron-specific IPC complexity for data operations.
- Standard tooling for debugging, logging, and error handling.

**Impact:** Slightly higher latency than in-process IPC, but negligible on localhost. File operations still go through Electron's preload bridge for security.

---

## 6. No Filesystem Access from Renderer

**Decision:** The renderer process never accesses the filesystem directly.

**Rationale:**
- Security — prevents arbitrary file access from UI code.
- Consistent architecture — all file operations go through the preload bridge.
- Testability — file operations can be mocked at the IPC boundary.

**Impact:** Slightly more boilerplate for file operations, but a standard Electron pattern.

---

## 7. FastAPI with Async Routes

**Decision:** Use FastAPI with async route handlers throughout.

**Rationale:**
- Native async support — ideal for I/O-bound operations (AI calls, file analysis).
- Automatic OpenAPI documentation — frontend devs can see the full API spec.
- Pydantic integration — request/response validation built in.
- High performance — competitive with Node.js for API throughput.

**Impact:** Requires async-compatible libraries. Most audio/MIDI libraries are sync, so they run in thread pools or are wrapped with `asyncio.to_thread`.

---

## 8. Phase-Based Development

**Decision:** Build in phases, shipping only v0.1 (7 features) first.

**Rationale:**
- Reduces time to working software — v0.1 is genuinely useful alone.
- Validates architecture before scaling — if the plugin system, provider layer, and REST API work for 7 features, they'll work for 30.
- Prevents analysis paralysis — build, ship, iterate.
- Each phase builds on the previous without architectural rewrites.

**Impact:** v0.1 features are a subset of the full vision. Every feature in later phases will slot into the existing architecture unchanged.

---

## 9. PYTHONPATH-Based Package Resolution

**Decision:** The project root is added to `PYTHONPATH` so `backend.`, `plugins.`, `providers.`, and `shared.` are all importable as top-level packages.

**Rationale:**
- The codebase spans multiple independent package directories (`backend/`, `plugins/`, `providers/`, `shared/`) that are siblings, not nested.
- A single `pyproject.toml` in `backend/` can't cover all of them.
- PYTHONPATH is the simplest cross-platform solution — no symlinks, no monorepo tooling.
- The dev script `scripts/dev.ps1` sets this automatically.

**Impact:** Requires setting `PYTHONPATH` before running the backend. The dev script handles this. For production builds, a proper package bundling step would resolve this differently, but that's a future concern.

---

## 10. Event Bus for Plugin Communication

**Decision:** Plugins communicate via a shared event bus (`event_bus.emit()` / `event_bus.on()`) — never by importing or calling another plugin directly.

**Rationale:**
- Prevents tight coupling between features — removing a plugin never breaks another.
- Enables loose orchestration: Sample Analyzer emits `sample.analyzed`, Chord Generator and Finish My Idea both react independently.
- Async by default — event handlers don't block the emitter.
- New plugins can integrate with existing workflows without modifying existing code.
- Based on common patterns in VS Code, Obsidian, and other plugin architectures.

**Impact:** Requires a lightweight EventBus implementation (~30 lines). `discover_plugins()` auto-wires `subscribes_to` declarations during startup. Event naming follows `{source}.{action}` convention.

---

## 11. Input Schemas for Every Plugin

**Decision:** Each plugin declares an `input_schema` (Pydantic model) that defines its expected inputs. The core validates inputs before execution and exposes the schema via the API.

**Rationale:**
- Frontend can auto-generate forms from the JSON Schema — no hardcoded UI per plugin.
- Backend validates inputs before they reach plugin code — consistent error handling.
- Self-documenting API — every plugin's capabilities are discoverable.
- Required for an eventual plugin marketplace or community plugins.

**Impact:** Adds `input_schema` field to `Plugin` ABC. `execute_plugin()` validates against it before calling `execute()`. `GET /api/plugins/{name}/schema` returns the JSON Schema representation. Existing plugins without a schema work fine (`input_schema = None`).

---

## 12. LLMs Never Handle Raw Audio

**Decision:** LLMs receive only structured JSON (BPM, key, spectral features, etc.) — never raw audio waveforms, MIDI bytes, or feature-extraction responsibilities.

**Rationale:**
- LLMs cannot reliably perceive audio — they hallucinate BPM, key, and timbre.
- Offline DSP libraries (librosa, pretty_midi) are deterministic, fast, and correct.
- Separating perception (DSP) from interpretation (LLM) keeps each layer clean and testable.
- Audio analysis works fully offline; only the interpretation step needs internet.

**Impact:** Hard architecture invariant documented in AGENTS.md and decisions.md. All audio/MIDI analysis pipelines must: audio → DSP → JSON → LLM. Violations are design errors.
