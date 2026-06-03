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
