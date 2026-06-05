# New Dashboard: Co-Hero Balanced Grid

## Status
**Draft** — 2026-06-04. Under active design, not yet implemented. Subject to change.

## Overview
Replace the current 4-page layout (Dashboard, Music Theory, Samples, AI Studio) with a single-screen bento grid dashboard. All functionality is visible at once — no page navigation. The dashboard *is* the app.

**Platform note:** Windows-first. All keyboard shortcuts use `Ctrl` (e.g. `Ctrl+K` for search), displayed with Windows-style key caps.

### Design philosophy — unified project flow

All panels read from and write to the same project state. There are no separate "tools" — every panel is a view into or input to the current project:

- **Project Anchor** declares the container (name, BPM, key, scale)
- **Sample Analysis** can auto-fill the project's key/mood/genre, but the user can override
- **Theory Engine** generates progressions that land in the project's Chord Pads
- **Chord Pads** are the project's current progression (playable, reorderable, exportable)
- **Library** is a cross-project collection of saved ideas
- **Co-Producer Chat** reads project state to give context-aware answers

No branching UX — the same dashboard regardless of how you start. Manual input, sample import, and theory generation all converge into the same editable project state.

**Target palette (Neon Mint):** base `#0d1b2a`, panels `#1b4332`, accents `#2dd4a8` / `#73ffb8`
**Fonts:** Outfit (headings), Figtree (body), JetBrains Mono (BPM/key/code values)
**Theme:** Dark by default

---

## Layout

```
┌───────────────────────────────────────────────────────────────┐
│ TopBar: logo · Ctrl+K Search… · Library btn · Open Project     │
├───────────────────────────┬───────────────────────────────────┤
│ Project Anchor (compact)  │ Co-Producer Chat (LARGER)          │
│ name · FL Studio Live     │ quick-action chips: Producer Chat  │
│ BPM/key/scale chips       │ · Why Does This Sound Good?        │
│ (editable on hover)       │ · Finish My Idea                   │
│ slim waveform strip       │ message thread + input             │
├───────────────────────────┤                                   │
│ Music Theory (collapsible)│                                   │
│ mode tabs: Scales /       │                                   │
│ Chords / Intervals /      │                                   │
│ Progressions + GENERATE   │                                   │
│ result display            │                                   │
├───────────────┬───────────┴───────────────────────────────────┤
│ Chord Pads    │ Sample Analysis    │ [TBD — Plugins replaced]  │
│ (playback +   │ recents + upload   │                          │
│  reorder)     │ compact cards      │                          │
│ + MIDI export │                    │                          │
└───────────────┴───────────────────┴───────────────────────────┘
```

---

## Modules

### 1. TopBar
- Logo (left)
- Search bar — `Ctrl+K` global keyboard shortcut, opens search overlay from anywhere. Searches Library, samples, and (future) plugins.
- "Library" button — opens Library as an overlay/modal (sortable table, same as current Library page). No separate route.
- "Open Project" button — creates or loads a project.

### 2. Project Anchor (compact)
- The **container** for the entire session. Everything feeds into this project.
- Project name (editable on hover — pencil icon)
- Pulsing "FL Studio • Live Sync" badge (stub for Phase 7)
- BPM / key / scale metadata chips (user-declared, editable on hover, can be auto-filled by sample analysis)
- Slim waveform strip (decorative; shows active sample analysis waveform when available)
- "New Project" dialog: enter name, BPM, key, scale (fields can be auto-filled by sample or left blank for defaults)

**Data model:** New `projects` table in SQLite. See [Data Model Changes](#data-model-changes) below.

### 3. Co-Producer Chat (enlarged)
- Larger panel occupying the right two-thirds of the top row.
- Quick-action chips: "Producer Chat", "Why Does This Sound Good?", "Finish My Idea"
- Message thread + input (same as current AI Studio, but visually prominent)
- Rearranged to the center-right as the hero panel.

### 4. Music Theory Panel (replaces 5-tab page)
- Collapsible section below Project Anchor
- Inline mode tabs: **Scales | Chords | Intervals | Progressions | Generator**
- Same full functionality as current Music Theory page — all 9 chord qualities, 11 scale types, 7 moods, 24 keys, etc.
- Generate button + result display inline (smaller footprint than the current page)
- Output feeds into Chord Pads below.

### 5. Chord Pads (renamed from Progression Builder)
- Displays the current generated progression as interactive pads (e.g. `Fm i · Db VI · Ab III · Eb VII`)
- Click-to-play via Web Audio API (browser's built-in oscillator — no extra dependencies)
- Drag-to-reorder via local state + pointer events (no heavy DnD library)
- MIDI export button
- "Send to Library" button

### 6. Sample Analysis Panel
- Drag-drop upload zone or file picker button
- Compact result cards: filename, BPM, key, genre tag, duration
- Same backend flow as today (upload → analyze → display)
- **Auto-fills project metadata** — detected BPM/key/mood can populate the Project Anchor. User can accept or override each value.
- Every detected value is a suggestion, not a lock. Full override at any time.

### 7. [TBD] — Bottom-right panel
- Currently planned to replace the Plugins panel. Potentials being considered:

| Option | Description |
|--------|-------------|
| Session Notes | Scratchpad textarea for the producer to jot down ideas |
| Quick Tools | One-click actions: Tap Tempo, Note-to-MIDI converter, Randomize progression |
| Recently Generated | History of MIDI exports and analyses in this session |
| Project Timeline | Placeholder for a future arrangement/structure view |

*Not yet decided — will be finalized after the core layout is built.*

### 8. Library (no longer a page)
- Accessible via TopBar "Library" button and global `Ctrl+K` search
- Opens as an overlay/modal — sortable table with type filter, same columns as current page
- Searches across all saved ideas (progressions, future melodies, patterns, etc.)

---

## Data Model Changes

### Projects table (new)
```sql
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT 'Untitled Project',
    bpm INTEGER DEFAULT 120,
    key TEXT DEFAULT 'C',
    scale TEXT DEFAULT 'Major',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

- User declares BPM/key/scale on project creation (or accepts auto-filled values from a sample).
- Editable at any time via inline hover edit — every auto-detected value is a suggestion, not a lock.
- Sample analysis can suggest updated values (BPM, key, mood), with user accept/override.
- No other feature auto-changes these values without user confirmation.
- Phase 7 (FL Studio integration) may pull BPM from the DAW for sync; key/scale remain user-declared or sample-detected.
- A project can have **multiple arrangements** (see Arrangements table below) — like Ableton's "Project folder, multiple .als files" model.

### Arrangements table (new)
```sql
CREATE TABLE arrangements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Arrangement 1',
    bpm INTEGER,
    mood TEXT,
    genre TEXT,
    data TEXT NOT NULL,  -- JSON: chord pads, analysis refs, MIDI state
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

- Each arrangement inherits project BPM/key/scale by default but can override.
- The active arrangement is what the dashboard displays.
- Switching arrangements swaps the Chord Pads, analysis cache, and MIDI state.
- Export serializes the project + all arrangements into a single archive (see research doc).

#### API endpoints (future)
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/projects/` | Create project |
| GET | `/api/projects/` | List projects |
| GET | `/api/projects/{id}` | Get current project |
| PUT | `/api/projects/{id}` | Update project metadata |
| DELETE | `/api/projects/{id}` | Delete project |
| POST | `/api/projects/{id}/arrangements/` | Create arrangement |
| GET | `/api/projects/{id}/arrangements/` | List arrangements |
| GET | `/api/projects/{id}/arrangements/{aid}` | Get arrangement state |
| PUT | `/api/projects/{id}/arrangements/{aid}` | Update arrangement |
| DELETE | `/api/projects/{id}/arrangements/{aid}` | Delete arrangement |
| GET | `/api/projects/{id}/export` | Download project archive |

### Ideas table (expansion of progressions)
The current `progressions` table holds chord progressions only. This will be migrated to a polymorphic `ideas` table supporting multiple idea types with shared metadata:

```sql
CREATE TABLE ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN (
        'progression', 'melody', 'bassline',
        'drum_pattern', 'arpeggio', 'phrase'
    )),
    name TEXT,
    data TEXT NOT NULL,  -- JSON: type-specific payload
    key TEXT,
    mood TEXT,
    genre TEXT,
    bpm INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Migration plan (immediate):**
1. Create `ideas` table
2. Copy all rows from `progressions` to `ideas` with `type='progression'`
3. Update save endpoint to write to `ideas`
4. Update list/delete endpoints to read from `ideas`
5. Keep `progressions` table for backward compatibility during transition, then drop it
6. Update Library API routes to accept `type` filter parameter

**Future idea types** (Phase 3+):
- `melody` — note sequences with expression data
- `bassline` — pattern data per genre
- `drum_pattern` — step sequencer data
- `arpeggio` — arpeggiation pattern data
- `phrase` — composite: melody + chords + bass

---

## Data Flow — How Panels Connect

All panels feed into and read from the same project state. There are no silos.

```
                 ┌─────────────────────┐
                 │  Project Anchor     │
                 │  (name, BPM, key,   │
                 │   scale, mood)      │
                 └──────────┬──────────┘
                            │
          ┌─────────────────┼──────────────────┐
          │                 │                   │
          ▼                 ▼                   ▼
 ┌────────────────┐ ┌──────────────┐  ┌────────────────┐
 │ Sample Import  │ │ Theory       │  │ FL Studio Sync │
 │ (auto-fill     │ │ Engine       │  │ (Phase 7 —     │
 │  key, BPM,     │ │ (generate    │  │  BPM/transport │
 │  mood)         │ │  progressions)│  │  sync)         │
 └───────┬────────┘ └──────┬───────┘  └────────┬───────┘
         │                 │                    │
         └─────────────────┼────────────────────┘
                           │
                           ▼
                  ┌────────────────┐
                  │  Chord Pads    │
                  │  (current      │
                  │   progression, │
                  │   editable,    │
                  │   playable)    │
                  └───────┬────────┘
                          │
                          ▼
                  ┌────────────────┐
                  │  MIDI Export   │
                  │  / Library     │
                  └────────────────┘
```

**Key rules:**
- The Project Anchor is the single source of truth for BPM, key, scale, and mood.
- Sample analysis can *suggest* values to the project, but never overwrites without user accept.
- Theory Engine reads the project's key/mood and writes progressions into Chord Pads.
- Chord Pads are always the project's "active progression" — what you hear, export, or send to FL Studio.
- Co-Producer Chat reads project state (key, genre, current progression) to give context-aware responses.
- No panel changes project state without the user seeing it (except MIDI export, which writes a file).

---

## Keyboard Shortcuts
- `Ctrl+K` — Global search (opens overlay from anywhere, not just when search bar is focused)
- All shortcuts use `Ctrl` key (Windows convention), never `⌘`

---

## Technical Notes

### Frontend (mockup phase)
- Pure frontend initially; placeholder constants for all data.
- Chord playback via browser Web Audio API (no extra dependencies).
- Drag-to-reorder via local state + pointer events (lightweight, no heavy DnD library).
- Search shortcut listener at app root level (not scoped to search input).
- Replace current `src/routes/index.tsx` with the dashboard layout.
- Force dark theme. Set page title/description in index.html.
- All design tokens centralized in `src/styles.css`.

### The four old pages become panels, not routes
- Music Theory → collapsible panel
- Samples → compact panel with upload + cards
- Library → modal overlay
- AI Studio → absorbed into the expanded Co-Producer Chat panel

---

## What This Replaces

| Current | New |
|---------|-----|
| Dashboard page | Bento grid (this doc) |
| Music Theory page | Collapsible panel in grid |
| Samples page | Compact panel in grid |
| AI Studio page | Expanded Co-Producer Chat panel |
| Library page | Modal overlay, accessed via button + search |
| 4 separate routes | 1 screen, no routing |

---

## Future Considerations
- FL Studio Live Sync badge is a stub until Phase 7 (JUCE bridge / virtual MIDI)
- Project BPM/key/scale sync from DAW is Phase 7
- Keyboard shortcut customization (user-configurable) could come later
- Search overlay scope will expand as more data types are added
