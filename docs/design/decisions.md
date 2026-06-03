# UI/UX Design Decisions

This document records the rationale behind user-facing design choices. Add entries whenever significant UI/UX decisions are made.

---

## 1. Page Consolidation (2026-06-03)

**Decision:** Reduce from 7 pages to 4 by consolidating related features.

| Old Pages | Consolidated Into |
|-----------|-----------------|
| Producer Chat, Why Does This Sound Good?, Finish My Idea | **AI Studio** — single chat interface with context panel |
| Theory Engine, Chord Generator | **Music Theory** — tabbed interface (Scales, Chords, Intervals, Progressions) |
| Sample Analyzer | **Samples** — renamed for future expansion (Splice scanner, library tools) |
| Dashboard | **Dashboard** — unchanged |

**AI Studio Layout:**

```
┌──────────────┬─────────────────────────┬──────────────┐
│    Sidebar   │      Chat Area          │  Context     │
│              │                         │  Panel       │
│  Dashboard   │  AI messages            │  Active File │
│  Music Theory│  User messages           │  Analysis    │
│  AI Studio   │                         │  Suggestions │
│  Samples     │  [Input bar]            │  [Drop zone] │
└──────────────┴─────────────────────────┴──────────────┘
```

**Rationale:**
- AI features share the same interaction pattern (message in → response + data out). Having them in one page removes context-switching.
- The context panel (right sidebar) gives a home for structured data — analysis results, MIDI previews, suggestions — that doesn't fit cleanly into a chat bubble.
- File dropping into the chat feels natural and is a common pattern (ChatGPT, Claude).
- Theory tools are parameter-input forms, not chat — tabs make more sense.
- Fewer nav items = less cognitive load.

**Impact:** 7 page components deleted, 2 new ones created, Layout/App simplified. Build size unchanged (~247 KB).

---

## 2. Dark Theme with Surface Color System (2026-06-03)

**Decision:** Use a custom dark palette with named surface colors instead of Tailwind's defaults.

```js
colors: {
  primary: { 50..900 },    // Blue accent
  surface: { 50, 100, 200, 700, 800, 900 },  // Neutrals
}
```

**Rationale:**
- Music production software is always dark-themed (FL Studio, Ableton, Logic Pro).
- Named `surface-*` colors are more intention-revealing than `gray-*` — "surface" implies the foundation layer, not a color.
- Primary blue matches the "copilot" brand hint without being aggressive.

**Impact:** Consistent dark look across all pages. Future light theme support would require adding surface light variants.

---

## 3. Hash-Based Routing for Electron (2026-06-03)

**Decision:** Use `HashRouter` from react-router-dom instead of `BrowserRouter`.

**Rationale:**
- Electron loads files via `file://` protocol in production.
- `BrowserRouter` requires a server to handle URL rewrites — impossible with `file://`.
- `HashRouter` works universally with both dev server (HTTP) and production (file://).

**Impact:** URLs use `#/path` format instead of `/path`. No practical difference for users.
