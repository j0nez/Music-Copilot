# Melody & Bassline Generator — Implementation Plan

**Status:** All 7 batches implemented. All 13 Section 15 issues fixed. 154 tests passing (131 backend + 23 frontend). 0 TS errors.  
**Audit status:** Plan vs implementation cross-reference completed (Section 16). 15 remaining discrepancies found (2 HIGH, 8 MEDIUM, 5 LOW). Fix plan prioritized (Section 17, 5 batches, ~21h estimated).  
**Batch A (P0) done:** Audio playback (Web Audio API oscillator scheduling) wired in MIDIPlayer. Expression Engine integrated into melody_generator and bassline_generator (phrase arc velocity, articulation gate). DnB offbeat min velocity raised from 78 to 80.  
**Batch B (P1) done:** Swing wired into arrangement export endpoint (swing field on ArrangementExportInput, applied before MIDI conversion). SWING_PRESETS defined in types.ts with genre-based defaults; auto-sets slider when genre changes. _map_range fixed — centering replaces clamping, so energetic mood (72–96) distributes notes across full range instead of clamping all to C5. Bassline octave_jump fixed — alternating root/octave via PSequence replaces chromatic ascent. Trance test added.  
**Batch C (P2) done:** GeneratePanel receives `project` prop — `resolveSettings()` uses project key/scale when set to `Auto`, preset chips use project key as fallback. Preset chips now auto-trigger chord generation immediately after setting dropdowns (calls `onAutoGenerate`). MIDIPlayer has separate `onClear` prop — `clearAll()` clears state to `[]` instead of regenerating.  
**Batch D (P3) done:** Generation Hub fully expanded — Melody section (6 dropdowns + Generate), Bassline section (genre/pattern/length + Generate), Preview note grid with inline Play/Stop (Web Audio API), MIDI All export, Save to Library with editable name, Esc/click-outside dismiss. Ctrl+S now saves full arrangement (all 3 parts) via new POST /arrangement/save endpoint. Voice-leading score badge (green ≥7, amber <7) shown for 4s after chord generation. Generation history ring buffer (max 5 per part) wired with ⬆/⬇ cycle arrows in MIDIPlayer footer. 154 tests pass.  
**Target:** v0.1 MVP completion (Phase A–D done, Phase E deferred)  
**Last updated:** 2026-06-06 (v8 — Batch D done)

---

## 1. Overview

Replace the 4-tab Music Theory panel with a focused **Generate** panel. Replace Chord Pads with a horizontally-scrollable **MIDI Player** that shows all generated parts (chords, melody, bassline) in a time×pitch grid. Add a **Generation Hub** modal for detailed controls with a read-only piano roll preview. Build **Melody Generator** and **Bassline Generator** plugins using isobar (MIT, algorithmic, zero AI).

### Design Decisions

| Decision | Choice |
|----------|--------|
| Layout | **Revised 45/55 split.** Left column (45%): Project Anchor + Generate panel + Sample Analysis. Right column (55%): Project Summary (full height, transitions to collapsible header when Chat replaces it in Phase E). Bottom row: MIDI Player (~50%) + Session Notes (~50%). Sample Analysis moves up from bottom row to left column — frees horizontal space for MIDI Player. |
| Timing model | **BPM-based absolute timing.** All generators output `start_beat` + `duration_in_beats`. The player converts to seconds via `s = beats * 60 / bpm`. All parts play simultaneously on independent oscillators. |
| Defaults | **All generator params default to `Auto`.** Genre/mood/key/length all pre-filled from project state but overridable. No parameter blocks generation — `Auto` produces valid music without genre-specific flavor. Genre is guidance, not a gate. |
| Presets | **Preset Chips** replace text tag input. A row of clickable badges (`[Dark Techno]`, `[Uplifting Trance]`, etc.) that set all params at once without locking them. `[Surprise Me ✨]` randomizes all params for pure exploration. |
| MIDI format | Combined multi-track .mid file (separate tracks per part) + individual single-track .mid for each part. |
| Saving | Auto-name pre-fill `"{type} - {key} - {genre} - {len} bars"`, user can edit before save, renameable later in Library via double-click on name column. |
| Generation Hub | Large modal overlay (~85% × 85%) with piano roll preview as hero element. Includes "Peek" toggle to briefly see behind the modal. Hub reads same `GeneratorSettings` state as Generate panel — they never diverge. |
| Keyboard shortcuts | Space = Play/Stop, Ctrl+S = Save, Ctrl+Enter = Generate chords, Ctrl+Shift+M = Export MIDI All, Ctrl+K = Search |

### Revised Layout (vs. Current Dashboard)

```
Current layout:                          Proposed layout:
┌──────┬──────────────┐                  ┌──────┬────────────────┐
│ 40%  │  60%         │                  │ 45%  │  55%           │
│ Proj │ Chat (stub)  │                  │ Proj │  Project       │
│ Music│              │                  │ Gen  │  Summary       │
│ Theor│              │                  │ Samp │ (full height,  │
├──┬───┴──────┬───────┤                  │      │  transitions   │
│CP  │ SA     │ SN    │                  │      │  to collapsible│
│33% │ 33%    │ 33%   │                  │      │  header when   │
└───┴─────────┴───────┘                  │      │  Chat arrives) │
                                         ├──────┴──────────────┤
                                         │ MIDI Player │ Notes │
                                         │ (~50%)      │~50%  │
                                         └─────────────┴───────┘
```

**Key changes:**
- **Column split:** 45/55
- **Music Theory panel gone** → replaced by Generate panel (compact) + Generation Hub (modal)
- **Sample Analysis moves up** into left column below Generate panel
- **Right column:** Project Summary (key, BPM, mood, genre, part metadata, Download All MIDI). When Chat is implemented in Phase E, Summary collapses to a compact header and Chat takes the scrollable area below.
- **Bottom row:** now only 2 items (MIDI Player + Session Notes), each ~50% — MIDI Player gets ~1.5× more horizontal space without explicit widening, Session Notes also gets more room

### Left Column Panels (scrollable)

```
┌─ Project Anchor ──────────────────────┐
│ Name (editable)                       │
│ BPM · Key · Scale (editable chips)    │
│ FL Live Sync badge (stub)             │
└───────────────────────────────────────┘
┌─ Generate ────────────────────────────┐
│  Quick Presets:                        │
│  [Dark Techno] [Uplifting Trance]     │ ← clickable chips, set all params at once
│  [Deep House]  [Melodic DnB]         │
│  [Surprise Me ✨]                      │ ← randomizes all params for exploration
│                                        │
│  Key [Auto ▼]  Mood [Auto ▼]         │ ← all default to Auto — no param is required
│  Genre [Auto ▼]  Length [8 ▼]        │ ← genre never blocks generation
│  Complexity [Simple ▼]                │
│                                        │
│  [Chords ⟳] [Melody ⟳] [Bass ⟳]    │ ← spinner while generating
│                                        │
│  [🎵 Open Generation Hub →]           │ ← opens modal with full controls + piano roll
│                                        │
│  ── 📖 Reference (▼ tap to expand) ── │ ← collapsed: Scale/Chord/Interval tools
└───────────────────────────────────────┘
┌─ Sample Analysis ─────────────────────┐
│ drop zone + BPM range selector        │
│ compact result cards (BPM/Key/Scale)  │
│ [Apply to Project]                    │
└───────────────────────────────────────┘
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/Stop MIDI Player |
| `Ctrl+S` | Save current arrangement (auto-named) |
| `Ctrl+Enter` | Generate primary part (chords if empty, otherwise next unfilled part) |
| `Ctrl+Shift+M` | Export MIDI All |
| `Ctrl+K` | Global search overlay |
| `Esc` | Close modal / stop playback |

---

## 2. Bug Fixes (pre-requisite)

| File | Fix | Est. |
|------|-----|------|
| `backend/app/api/progressions.py` | Remove unused `import json` | 1m |
| `backend/app/api/projects.py` | Remove dead `CREATE_FIELDS` constant | 2m |
| `backend/app/db/database.py` | Remove unused `from pathlib import Path` | 1m |
| `backend/app/db/projects.py` | Remove unused `import json` | 1m |
| `plugins/sample_analyzer/plugin.py` | Add `import librosa` (submodule-only import is fragile) | 1m |
| `backend/app/core/config.py` | Migrate `class Config` to `model_config = ConfigDict(...)` (Pydantic v2) | 2m |
| `frontend/src/renderer/store/projectContext.tsx` (line 73) | Revert project state on save failure | 10m |
| `frontend/src/renderer/components/MIDIPlayer.tsx` (new) | 8-bar playback fixed by design — BPM-based absolute timing replaces fixed-gap scheduling. Silent catch fixed by design — `fetchJson()` helper in api.ts already returns structured `ApiResponse` with user-visible errors. | 0m (built into new components) |
| `AGENTS.md` | Remove duplicate VL entry, fix task count 23→25 | 3m |
| `plan-v0.1-review.md` | Mark D5 ✅ | 2m |
| `README.md` | Full rewrite for current state (dashboard, 116+13 tests, offline-first) | 20m |

---

## 3. New Dependency

```
pip install isobar   # MIT, 426★, algorithmic melody/bass/drum generation
```

Add to `requirements.txt`.

---

## 4. Melody Generator Plugin

**File:** `plugins/melody_generator/plugin.py` (replaces current stub)

### Input Schema

```python
class MelodyGeneratorInput(BaseModel):
    key: str = "A Minor"
    scale: str = "Natural Minor"
    mood: str = "dark"
    genre: str = "techno"
    length: int = 8
    complexity: str = "simple"
```

### Algorithm

- Use isobar `PDegree(PSeries(…), Scale)` as the primary pattern for stepwise scalar motion in key:
  - `"simple"`: pentatonic scale (`Scale(…, pentatonic=True)`), `PSeries(0, 1, 4)` for 4-note scalar phrases
  - `"advanced"`: full scale with `PMarkov(order=2, values=Scale)` for controlled-random melodic contour
- `PWalk(start, maxStep=3, min=middleC, max=highC)` for occasional random-walk segments (ambient/transitional sections)
- `PDegree(PSeries(···), Scale)` ensures all notes stay in key; `PNearestNoteInKey(pattern, key)` snaps any outliers
- Narrow intervals for dark moods, wider for uplifting
- `PDuration` for note timing (quarter/eighth/half notes per genre convention)
- **Key/scale auto-fill from project state** — defaults to project key, overridable
- Notes are constrained to the chosen scale (isobar `Scale` object filters out non-diatonic pitches)

### Swing and Note Variety

- **Swing timing:** `PSwing(0.3)` shifts alternate note onsets by 30% of duration — creates shuffle feel while staying musical at any level
- **Passing tones:** `PProbability(0.2, PPassingTone(scale))` for chromatic approach notes (advanced mode only)
- **No structural limits on note count:** Each generator produces an independent isobar `Sequence`. Chords produce 3–4 simultaneous notes per bar. Melody can do 8–16 notes per bar. Bass can do 2–4 notes per bar. Note density is per-genre (Energetic = more notes, Dark = fewer).
- All notes stay in-key (isobar `Scale` filters)

### Output Format (Beat-Based)

```python
{
  "notes": [
    {"pitch": 60, "velocity": 100, "start_beat": 1.0, "duration_in_beats": 0.5},
    {"pitch": 64, "velocity": 85,  "start_beat": 1.5, "duration_in_beats": 0.25},
  ],
  "length_bars": 8
}
```

All timing in beat units. Player converts to seconds via project BPM.

### Tests: 4 (simple major, simple minor, advanced, edge cases)

---

## 5. Bassline Generator Plugin

**File:** `plugins/bassline_generator/plugin.py` (new plugin — no stub currently exists)

### Input Schema

```python
class BasslineGeneratorInput(BaseModel):
    key: str = "A Minor"
    scale: str = "Natural Minor"
    genre: str = "techno"
    length: int = 8
    pattern: str = "auto"
```

### Genre → Pattern Mapping

| Genre | Default pattern | Characteristics |
|-------|----------------|----------------|
| Techno | root_fifth | Sparse, on-beat root/fifth, 808-ish |
| House | walking | Walking root-fifth-root-octave |
| Trance | octave_jump | Root-octave jumps, eighth notes |
| Deep House | walking | Smoother, more passing tones |
| Drum & Bass | syncopated | Off-beat, fast, sub-heavy roots |
| Melodic Techno | root_fifth | Pad-like sustained roots |

### Algorithm

- isobar `PWalk(scale, root, steps=3)` for root-fifth patterns
- `PAccent` for syncopated off-beat emphasis
- `PDuration` from genre-appropriate note lengths
- **Key/scale auto-fill from project state** — bassline root matches tonic
- Output uses same beat-based `Note` format as melody generator

### Velocity & Dynamics

- Each bass note receives velocity via the existing MIDI Expression Engine (`compute_velocity()`) based on:
  - **Beat position:** Strong beat (1, 3) = louder (100–110), weak beat (2, 4) = softer (75–85)
  - **Genre conventions:** Techno → flat dynamics on root hits, House → walking accent on beat 1, DnB → ghost notes on offbeats
  - **Phrase arc:** first 2 bars = establish root confidently, last 2 bars = slight emphasis for phrase end
- `PAccent` applies genre-specific accent patterns before velocity post-processing
- Default velocity range: 80–110 (louder than melody to anchor the bass register)
- Bass notes use the existing articulation rules from the Expression Engine (`apply_articulation()`) — staccato for percussive genres (House, DnB), legato for sustained genres (Techno, Melodic Techno)

### Tests: 4 (root_fifth, walking, syncopated, edge cases)

---

## 6. Generate Panel (replaces Music Theory panel)

**File:** `frontend/src/renderer/components/GeneratePanel.tsx`

**Location:** Left column (45%), replaces `MusicTheoryPanel.tsx`. Compact panel with Preset Chips for quick setup, dropdown controls with `Auto` defaults, generate buttons with loading spinners, and access to the full Generation Hub modal.

### Visual Layout

```
┌─ Generate ────────────────────────────┐
│  Quick Presets:                        │
│  [Dark Techno] [Uplifting Trance]     │ ← clickable chips, set all params at once
│  [Deep House]  [Melodic DnB]         │
│  [Surprise Me ✨]                      │ ← randomizes all params for pure exploration
│                                        │
│  Key [Auto ▼]  Mood [Auto ▼]         │ ← all default to Auto — no param is required
│  Genre [Auto ▼]  Length [8 ▼]        │ ← genre never blocks generation
│  Complexity [Simple ▼]                │
│                                        │
│  [Chords ⟳] [Melody ⟳] [Bass ⟳]    │ ← spinner while generating
│                                        │
│  [🎵 Open Generation Hub →]           │ ← opens modal with full controls + piano roll
│                                        │
│  ── 📖 Reference (▼ tap to expand) ── │ ← collapsed: Scale/Chord/Interval tools
└───────────────────────────────────────┘
```

- Key/mood/genre/length/complexity dropdowns all default to `Auto` — no parameter is required. `Auto` produces valid music without genre-specific flavor.
- Genre is **guidance, not a gate** — setting Techno at 174 BPM for a DnB track works perfectly. The chord progression is tempo-independent; only the MIDI Player uses BPM.
- Each Generate button triggers a quick generation with current settings. A spinner `⟳` replaces the button text while the 1–2s API call is in-flight, and the button is disabled to prevent double-submit:
  - [Chords] → existing chord generator (key + mood + genre + length + complexity)
  - [Melody] → melody generator (key + scale + mood + genre + length + complexity)
  - [Bass] → bassline generator (key + scale + genre + length + pattern=auto)
- Voice-leading score badge shown briefly in a toast after chord generation
- **API failure handling:** If the generation API call fails (network error, server error), the spinner reverts, the button re-enables, and a red error toast shows the error message from the `ApiResponse` (`fetchJson()` in `api.ts` already returns structured errors). The previous output for that part (if any) is preserved — it is NOT cleared on failure.
- Result chords/melody/bass are sent directly to the MIDI Player below

### Auto-Fill from Project State

- Generate panel pre-fills key/scale/BPM from the project state
- When project key/scale changes in Project Anchor, Generate panel updates
- Generators use the project key as default (overridable per-generation)
- When all dropdowns are `Auto`, generators produce output based only on key/scale from project state — mood defaults to neutral, genre defaults to a balanced middle pattern, length defaults to 8

### Preset Chips (replace text tag input)

A row of clickable badges in the Generate panel header. Each chip sets all parameters at once without locking the user — every dropdown remains editable afterward.

| Chip | Pre-fills |
|------|-----------|
| `[Dark Techno]` | mood=Dark, genre=Techno, key=Auto (project key), length=8, complexity=Simple |
| `[Uplifting Trance]` | mood=Uplifting, genre=Trance, key=Auto, length=16, complexity=Advanced |
| `[Deep House]` | mood=Neutral, genre=Deep House, key=Auto, length=8, complexity=Simple |
| `[Melodic DnB]` | mood=Neutral, genre=DnB, key=Auto, length=16, complexity=Advanced |
| `[Surprise Me ✨]` | Randomizes key, mood, genre, length, complexity — for pure exploration |

Clicking a chip: fills dropdowns, then triggers generation on the primary part (chords by default). User can override any dropdown and regenerate.

**No lookup table needed** — chips are hardcoded presets. Adding a new chip is a one-line config change in the component.

### Generator Settings State

The Generate panel and Generation Hub share a single `GeneratorSettings` state object, lifted to the Dashboard component:

```typescript
interface GeneratorSettings {
  key: string;           // "Auto" | key name
  scale: string;
  mood: string;          // "Auto" | mood name
  genre: string;         // "Auto" | genre name
  length: number;
  complexity: string;    // "simple" | "advanced"
}
```

Changes made in the Generate panel are immediately reflected when the Hub opens, and vice versa. Closing and re-opening the Hub shows the same state.

### Reference Tools (collapsed + TopBar popovers)

Two access paths to the old Scale Generator, Chord Builder, Interval Analyzer:

1. **Collapsed section in Generate panel** — `[📖 Reference ▾]` at the bottom of the panel. Expand reveals the three tools inline. Same behavior as current Music Theory panel tabs, but hidden by default.
2. **TopBar icon buttons** — Three small icon buttons in the TopBar: `[🎼]` (Scale), `[🎸]` (Chord), `[📏]` (Interval). Each opens a small popover/tooltip with the tool directly. Accessible from anywhere on the dashboard — no scrolling needed.

---

## 7. MIDI Player (replaces Chord Pads)

**File:** `frontend/src/renderer/components/MIDIPlayer.tsx`

**Location:** Bottom row left slot (~50% width). Sample Analysis moved to left column, so bottom row has only 2 items (MIDI Player + Session Notes). Wing mirrors go from ~33% to ~50% width without explicit widening — a natural consequence of removing one bottom-row item.

### Grid Layout (Read-Only, Horizontally Scrollable)

```
┌───────────────────────────────────────────────────────────────────┐
│  MIDI Player  {part type} · {N} bars  ⬆ ⬇ (history)              │ ▷ ▶ ◀ │
├────────┬──────┬──────┬──────┬──────┬─── scroll ─────────┬────────┤
│  Ch    │  i   │ VII  │  VI  │ VII  │  VI  →             │        │
│  Mel   │ C4   │  —   │ D4   │ E4   │  —   │ D5         │        │
│ Vel    │ ████ │      │ ███░ │ ████ │      │ ███░        │        │
│  Bas   │ C2   │  —   │ G2   │  —   │ C2   │ —           │        │
│ Vel    │ ████ │      │ ████ │      │ ███░ │              │        │
├────────┴──┬───┴──┬───┴──┬───┴──┬───┴──┬───┴──────────────┴────────┤
│ Solo: [☑ Ch] [☑ Mel] [☑ Bass] [+ Add Part ▾]                     │
│ [▶ Play] [■ Stop] [MIDI ▼] [Save] [Clear]                        │
└───────────────────────────────────────────────────────────────────┘
```

### Features

- **Rows per part:** Chords (purple, shows roman numeral + name), Melody (green, shows pitch + velocity bar), Bassline (blue, shows pitch + velocity bar)
- **Horizontal scrolling:** `overflow-x-auto` with scrollbar. At ~50% width, visible width shows ~5–6 bars at a time (~50% more than the planned 33%). Left/right arrow buttons in the title bar for keyboard-style navigation.
- **Auto-scroll during playback:** A ref tracks the current playhead bar. During playback, `scrollIntoView({ behavior: 'smooth', inline: 'center' })` advances the viewport automatically. Works for any bar count (4, 8, 16).
- **Note grid:** Each column = one bar. Colored fill for active notes. Velocity bar height reflects loudness. Read-only (no interactive editing in this view).
- **Solo/Mute toggles:** Each part has a checkbox. Only checked parts play and export.
- **Playhead cursor:** A vertical red line in the NoteGrid that advances with playback position. Uses the same playback ref that drives auto-scroll. Visible only during playback.
- **Per-part regenerate:** Each part row header has a `[↻]` button. Clicking re-generates that part only with current GeneratorSettings and replaces it in-place. While the API call is in-flight, `[↻]` shows a spinner and is disabled (same pattern as Generate panel buttons — prevents double-submit). On failure, the old output is preserved and an error toast appears. Generation history still captures the old output.
- **Clear controls:** `[Clear All]` button in the footer removes all generated parts. Each part row header also has an `[✕]` to remove that part only.
- **Generation history cycling:** Each part header row gets ⬆ / ⬇ arrows. Cycling keeps last 5 generated outputs per part in a ring buffer. Arrows swap the displayed output without re-generating. No undo system — just a simple ring buffer.
- **MIDI dropdown:**
  - MIDI All (combined multi-track .mid — one track per part)
  - MIDI Chords Only
  - MIDI Melody Only
  - MIDI Bass Only
- **Extensibility:** `[+ Add Part ▾]` with placeholder entries for future parts (Drums, Arpeggios, FX). Selecting one adds a new row to the grid. Mute/solo and MIDI export auto-include all parts. Adding a new instrument requires: create plugin, add entry to part list — no architecture changes.
- **Title bar:** Left side shows the first non-empty part's type and bar count (e.g. `"Chords · 8 bars"`) rather than a static bar count. When no parts exist, shows `"MIDI Player — nothing generated yet"` with a subtle placeholder.
- **Empty state:** When no parts are generated, the grid area shows a centered placeholder: `"Generate chords, melody, or bassline to get started"` with a muted icon. All controls except footer buttons are hidden.

### Saving (MIDI Player footer)

| What | Type field in `ideas` table | Data stored |
|------|---------------------------|-------------|
| All parts together | `"arrangement"` | `{chords: [...], melody: [...], bassline: [...]}` |
| Chords only | `"progression"` | `chords[]` (existing) |
| Melody only | `"melody"` | `melody_notes[]` |
| Bassline only | `"bassline"` | `bass_notes[]` |

**Save flow:**
1. User clicks [Save] → small inline popover appears above the Save button (not blocking the footer row)
2. Name is **pre-filled automatically**: `"{Type} - {Key} - {Genre} - {Len} bars"` (e.g. `"Progression - A Minor - Techno - 8 bars"`)
3. User can: (a) hit Enter to save with auto-name, (b) edit the name then Enter, (c) click away to save as-is
4. In Library modal, the name column is **double-clickable** to rename at any time — renames update the ideas table in-place
5. When saving from Generation Hub, same flow applies (hub has its own Save button)

**Loading:** An `"arrangement"` saved from Library restores all parts to their grid rows — chords, melody, bassline each get their own row with the correct data.

### BPM-Based Timing Model

All generators output in **beat units**, not seconds:

```typescript
interface Note {
  pitch: number;          // MIDI pitch (60 = C4)
  velocity: number;       // 0-127
  start_beat: number;     // beat position from bar 1 (e.g., 1.0, 1.5, 2.0)
  duration_in_beats: number;  // note length in beats (0.5 = eighth, 1.0 = quarter, 4.0 = whole)
}
```

**Player conversion at runtime:**
```
seconds = beats * 60 / project.bpm
```

At 128 BPM in 4/4 time, 1 bar = 4 beats = 1.875s. A melody note at `start_beat=1.5` fires at `1.5 * 60 / 128 = 0.703s`.

**Simultaneous multi-part playback:** All parts (chords + melody + bassline) schedule their oscillators against the same AudioContext timeline. Each note gets its own oscillator + gain node with independent timing. No chunking — everything plays at once based on beat positions.

### State Shape

```typescript
interface Note {
  pitch: number;
  velocity: number;
  start_beat: number;
  duration_in_beats: number;
}

interface PlayerState {
  chords: Note[];         // chord notes (multiple per chord)
  melody: Note[];
  bassline: Note[];
  solo: { chords: boolean; melody: boolean; bassline: boolean };
  bpm: number;            // from project state
}
```

---

## 8. Generation Hub (large overlay)

**File:** `frontend/src/renderer/components/GenerationHub.tsx`

**Trigger:** Button in Generate panel `[🎵 Open Generation Hub →]`

**UX approach:** Large **non-modal** overlay (~85% × 85%). Backdrop is dimmed but the MIDI Player is faintly visible underneath — user can maintain awareness of what's in their player while tweaking. Clicking outside the overlay or pressing Esc dismisses it. A "Peek" toggle in the header temporarily drops overlay opacity to ~20% so user can see the full dashboard behind.

### Visual Layout

```
┌────────────── Generation Hub ───────────────────────────────────┐
│ [✕] [Peek]  [Send to Player]  [MIDI ▼]  [Save]  (history ⬆/⬇)│
├──────────────────────────────────────────────────────────────────┤
│  ┌─ Melody ───────────────────────────────────────────────────┐  │
 │  │ Key: [Auto ▼] Scale: [Natural Minor ▼]                     │  │
 │  │ Mood: [Auto ▼] Genre: [Auto ▼] Length: [8 bars ▼]        │  │
│  │ Complexity: [Simple ▼]  [Generate]   ⬆/⬇ history           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌─ Bassline ─────────────────────────────────────────────────┐  │
│  │ Genre: [Techno ▼] Pattern: [auto ▼]  [Generate]            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌─ Preview (NoteGrid, full width) ───────────────────────────┐  │
│  │ (shared NoteGrid component — used here at full size,        │  │
│  │  used in MIDI Player at compact size. Same render logic.)   │  │
│  │                                                            │  │
│  │  Piano roll: time × pitch, colored by part (Ch=purple,     │  │
│  │  Mel=green, Bas=blue). Read-only, horizontally scrollable. │  │
│  │                                                            │  │
│  │  [▶ Play] [■ Stop]  ← plays selected part or all          │  │
│  └──────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│ [Send to Player] [MIDI All] [MIDI Chords] [MIDI Mel] [MIDI Bass]│
│ [Save to Library]                                                │
└──────────────────────────────────────────────────────────────────┘
```

### Sections

| Section | Content | Default state |
|---------|---------|---------------|
| Melody | Full controls (key, scale, mood, genre, length, complexity) + Generate + history cycle | Visible |
| Bassline | Genre, pattern selector + Generate | Visible |
| Preview | Read-only piano roll (time × pitch, colored by part) — uses same `NoteGrid` component as MIDI Player | Visible |

**Empty state:** When no parts have been generated, the Preview section shows `"Nothing yet — generate something above"` centered in the piano roll area. The footer buttons (Send to Player, MIDI, Save) are disabled until at least one part has data.

The `NoteGrid` component is shared between the MIDI Player (compact, horizontal scroll, ~50% width) and the Generation Hub (larger, full-width). Same rendering logic, different container sizing — both receive the same `Note[]` arrays.

The Generation Hub reads from the same `GeneratorSettings` state as the Generate panel (lifted to the Dashboard component). Changes made in the Generate panel are immediately reflected when the Hub opens, and vice versa. Opening the Hub always shows the current settings — they can never diverge.

---

## 9. Post-Processing Pipeline

After any generator (chord, melody, bassline) produces raw note data, the output passes through a shared post-processing pipeline before being displayed in the MIDI Player or exported to MIDI.

### Expression Engine Integration

The existing MIDI Expression Engine (`plugins/midi_export/expression/`) processes all generated parts:

| Step | What it does | Applied to |
|------|-------------|------------|
| **Velocity by role** | `compute_velocity(note, chord_role, beat_position, phrase_position, genre, mood)` — assigns velocity based on chord-tone role (root/third/fifth), metric position, and phrase arc | Chords, Melody, Bassline |
| **Voicing** | `voice_chord(chord, style)` — applies close/open/drop2 voicing per style setting | Chords only |
| **Articulation** | `apply_articulation(notes, gate_length)` — adjusts note-off timing for staccato/legato per genre | Melody, Bassline |
| **Arpeggiation** | `arpeggiate(chord_notes, pattern)` — time-stretches chord tones into sequential notes per pattern | Chords only |

**How the flow works:**

```
Generator output (raw pitch/beat/velocity)
    ↓
Expression Engine: compute_velocity() ← genre, mood, beat pos from project
    ↓
Expression Engine: voice_chord() (chords) / apply_articulation() (melody/bass)
    ↓
Universal Swing + Humanization (see below)
    ↓
Display in MIDI Player + available for export/save
```

### Universal Swing & Humanization

Applied as a frontend-side post-processor after generation and expression processing, before display in the MIDI Player. Affects all parts equally so the groove stays locked.

| Feature | What it does | Control |
|---------|-------------|---------|
| **Swing** | Delays offbeat sixteenths by `swing_amount × 0.25` beats (0–100%, default 30%). Player-only effect — exported MIDI is clean, unswung. | Swing slider in MIDI Player title bar (0–100%) |
| **Timing jitter** | ±3ms Gaussian → subtle desynchronization | On by default, no user control |
| **Duration jitter** | ±5% Gaussian on note duration (capped to prevent overlap) | On by default, no user control |
| **Velocity jitter** | ±5 from base velocity (on top of Expression Engine velocity) | On by default, no user control |

Swing is a player-only effect applied in the frontend at scheduling time (no export baking):
```typescript
function applySwing(notes: Note[], swingAmount = 0.30): Note[] {
  return notes.map(note => {
    const sixteenthIndex = Math.floor((note.start_beat % 1) * 4);
    if (sixteenthIndex === 1 || sixteenthIndex === 3) {
      return { ...note, start_beat: note.start_beat + swingAmount * 0.25 };
    }
    return note;
  });
}
```

**Swing presets by genre:**
- House: 30% (offbeat 16th shuffle)
- Techno: 20% (subtle groove)
- DnB: 40% (heavier swing on offbeats)
- Deep House: 35%
- Trance: 15% (mostly straight)
- Melodic Techno: 25%

---

## 10. Data Flow

```
Panel inputs        → Generator          → Expression Engine → MIDI Player → Web Audio
────────────          ──────────            ─────────────────    ───────────   ─────────
Sample (via SA)       Chord Generator      velocity_by_role    Row: Chords   oscillators
Preset Chips          Melody Generator     voicing (chords)    Row: Melody   per note
Manual select         Bassline Generator   articulation/gate   Row: Bassline at BPM time
                                           swing + humanize

Preset Chip flow: click [Dark Techno] → fills key/mood/genre/length + triggers generate
  Surprise Me: randomizes all params → triggers generate
  Manual: set all dropdowns from Auto → generate any part

Left column layout:
  Top: Project Anchor (name, BPM, key, scale — source of truth for state)
  Middle: Generate panel (reads project state, pushes results to MIDI Player)
  Bottom: Sample Analysis (can auto-fill project BPM/key from audio)

Right column layout:
  Full height: Project Summary (key, BPM, mood, genre, part metadata,
    Download All MIDI). Transitions to collapsible header when
    Co-Producer Chat arrives in Phase E.

Bottom row:
  Left (~50%): MIDI Player (reads PlayerState, plays via Web Audio)
  Right (~50%): Session Notes (textarea, auto-saves to project state)

Player: project.bpm → seconds = beats * 60 / bpm → AudioContext scheduling
Mute/solo state  → excludes unchecked parts from play + export
GeneratorSettings state → shared between Generate panel + Generation Hub

Export (via POST /api/plugins/midi_export/arrangement):
  Body: { chords: Note[], melody: Note[], bassline: Note[], bpm, solo }
  Action: writes multi-track .mid with one track per part (ch 0, ch 1, ch 2)
  Returns: { midi_url, download_url }
    Per-part export: single-track .mid, selected via MIDI dropdown

Save → ideas table (type: "arrangement" for all parts,
       "progression"/"melody"/"bassline" for individual)
Load (Library) → restore parts to grid rows by type

Generation Hub overlay:
  Opens from Generate panel [🎵 Open Generation Hub →]
  Shows full controls + NoteGrid preview (same data as MIDI Player, larger view)
  Hub reads same GeneratorSettings as Generate panel — they never diverge
  "Peek" toggle shows dashboard behind
  ⬆/⬇ history per part cycles through last 5 generated outputs
  [Send to Player] pushes generated notes to MIDI Player state
```

---

## 11. Files Changed/Created

| Action | Path | Purpose |
|--------|------|---------|
| ✅ Fix | `backend/app/api/progressions.py` | Remove unused import |
| ✅ Fix | `backend/app/api/projects.py` | Remove dead constant |
| ✅ Fix | `backend/app/db/database.py` | Remove unused import |
| ✅ Fix | `backend/app/db/projects.py` | Remove unused import |
| ✅ Fix | `backend/app/core/config.py` | Pydantic v2 migration |
| ✅ Fix | `plugins/sample_analyzer/plugin.py` | Add missing import |
| ✅ Fix | `frontend/src/renderer/components/ChordPads.tsx` | Silent catch + 8-bar bug |
| ✅ Fix | `frontend/src/renderer/store/projectContext.tsx` | Revert on failure |
| 🆕 Create | `plugins/melody_generator/plugin.py` | Melody generation (isobar) |
| 🆕 Create | `plugins/bassline_generator/plugin.py` | Bassline generation (isobar) |
| 🆕 Create | `frontend/src/renderer/components/GeneratePanel.tsx` | Replaces MusicTheoryPanel — Preset Chips, Auto defaults, loading spinners |
| 🆕 Create | `frontend/src/renderer/components/ProjectSummary.tsx` | Right column: project metadata (key/BPM/mood/genre), part summary, Download All MIDI. Transition path to collapsible header when Chat lands. |
| 🆕 Create | `frontend/src/renderer/components/MIDIPlayer.tsx` | Replaces ChordPads — wider (~50%), generation history arrows |
| 🆕 Create | `frontend/src/renderer/components/GenerationHub.tsx` | Large overlay with piano roll preview + Peek toggle |
| 🆕 Create | `frontend/src/renderer/components/NoteGrid.tsx` | Shared piano roll visualization (used by Player + Hub) |
| 🆕 Create | `frontend/src/renderer/components/ReferencePopover.tsx` | Scale/Chord/Interval popover tooltip (TopBar access) |
| 🆕 Update | `frontend/src/renderer/types.ts` | Add `Note`, `PlayerState`, `GeneratorSettings`, generation history types |
| 🆕 Update | `frontend/src/renderer/api.ts` | Add melody/bassline API calls, save with auto-name |
| 🆕 Create | `frontend/src/renderer/__tests__/MIDIPlayer.test.tsx` | Component tests |
| 🆕 Create | `frontend/src/renderer/__tests__/GeneratePanel.test.tsx` | Component tests |
| ✅ Update | `frontend/src/renderer/pages/Dashboard.tsx` | Wire new components, change column split (40/60 → 45/55), move SampleAnalysisPanel to left column |
| 🆕 Update | `requirements.txt` | Add isobar |
| 🆕 Update | `tests/test_melody_generator.py` | Backend tests |
| 🆕 Update | `tests/test_bassline_generator.py` | Backend tests |
| 🆕 Update | `AGENTS.md` | Status + task history |
| 🆕 Update | `plan-v0.1-review.md` | Acceptance criteria |
| 🆕 Update | `README.md` | Full rewrite |
| ✅ Fix | `backend/app/main.py` | Register arrangement router |
| 🆕 Create | `backend/app/api/arrangement.py` | `POST /api/arrangement/export` (multi-part multi-track) + `POST /api/arrangement/per-part` (single part export) |
| 🆕 Create | `plugins/midi_export/expression/swing.py` | Universal swing post-processor applying to all parts |
| 🆕 Update | `plugins/midi_export/expression/__init__.py` | Export `apply_swing` from new swing module |

---

## 12. Tests

| Test file | What | Count |
|-----------|------|-------|
| `tests/test_melody_generator.py` | Basic generation, genre mapping, error cases | 4 |
| `tests/test_bassline_generator.py` | Pattern mapping, genre defaults, error cases | 4 |
| `MIDIPlayer.test.tsx` | Render, solo toggle, mute/unmute interaction, swing slider | 4 |
| `GeneratePanel.test.tsx` | Renders Preset Chips, Auto defaults, Surprise Me, loading spinner | 3 |
| `ProjectSummary.test.tsx` | Renders project metadata, part summary, Download All MIDI | 2 |
| `tests/test_midi_export_arrangement.py` | Multi-part arrangement export with expression engine integration | 3 |

**Total new tests:** ~23  
**Backend total after:** 129 (13 new: 4 melody, 4 bassline, 5 arrangement)  
**Frontend total after:** 23 (10 new across GeneratePanel, MIDIPlayer, ProjectSummary)

---

## 13. Deferred From This Phase

- **AI Studio / Producer Chat** (Phase E — last). Architecture already scaffolded: Plugin `input_schema` (Pydantic) maps to LLM tool-calling JSON schema. Every plugin becomes an AI-addressable tool. Phase E builds `ToolBridge` that exposes plugin `execute()` + project state mutation as callable tools, plus 3 new API endpoints (`POST /api/project/settings`, `POST /api/player/set-part`, `POST /api/player/clear-part`). No plugin rewrites needed.
- Interactive piano roll editing (read-only preview is sufficient for v0.1)
- Drum Pattern Generator (future `[+ Add Part]` slot)
- Arpeggiator Generator (future `[+ Add Part]` slot)
- Song snippet playback analysis (Basic-Pitch, Phase 2)
- Reference Analyzer (Phase 5)

---

## 14. Implementation Order

### Batch 1 — Prerequisites (all parallel, no deps)
1. `pip install isobar` + add to `requirements.txt`
2. Fix unused imports (`progressions.py`, `projects.py`, `database.py`, `db/projects.py`)
3. Add `import librosa` to `plugins/sample_analyzer/plugin.py`
4. Migrate `backend/app/core/config.py` to `model_config = ConfigDict(...)`
5. Fix `frontend/src/renderer/store/projectContext.tsx` revert-on-failure

### Batch 2 — Backend Plugins
6. Build `plugins/midi_export/expression/swing.py` (swing post-processor)
7. Build `plugins/bassline_generator/plugin.py` (isobar-based, new plugin)
8. Build `plugins/melody_generator/plugin.py` (isobar-based, replace stub)
9. Add arrangement export endpoint to `plugins/midi_export/plugin.py`

### Batch 3 — Backend Tests
10. `tests/test_melody_generator.py` — 4 tests
11. `tests/test_bassline_generator.py` — 4 tests
12. `tests/test_midi_export_arrangement.py` — 3 tests

### Batch 4 — Frontend Components (mostly parallel)
13. Build `NoteGrid.tsx` (shared piano roll, no deps)
14. Build `ReferencePopover.tsx` (Scale/Chord/Interval popovers, no deps)
15. Build `ProjectSummary.tsx` (right column, no deps)
16. Update `types.ts` — add `Note`, `PlayerState`, `GeneratorSettings`, history types
17. Update `api.ts` — add melody/bassline API calls, auto-name save
18. Build `GeneratePanel.tsx` (Preset Chips, Auto defaults, loading, error handling)
19. Build `MIDIPlayer.tsx` (playhead, per-part regenerate, history, empty states)
20. Build `GenerationHub.tsx` (large overlay, NoteGrid preview, Peek toggle)

### Batch 5 — Dashboard Wiring
21. Update `Dashboard.tsx`: 45/55 column split, wire new component tree, move SampleAnalysisPanel to left column
22. Hook ProjectSummary to right column (reads project state)
23. Hook Generate → MIDI Player data flow (GeneratorSettings shared state)

### Batch 6 — Frontend Tests
24. `GeneratePanel.test.tsx` — 3 tests (Preset Chips, Auto defaults, Surprise Me, loading spinner)
25. `MIDIPlayer.test.tsx` — 4 tests (render, solo toggle, swing slider, empty state)
26. `ProjectSummary.test.tsx` — 2 tests (metadata render, part summary, Download MIDI)

### Batch 7 — Documentation
27. Update `AGENTS.md` — status, task history, feature status, test counts
28. Update `plan-v0.1-review.md` — mark D5 ✅, note melody-bassline completed, update Phase E pre-reqs
29. Full `README.md` rewrite

---

## 15. Post-Implementation Audit — 13 Issues Found

After all 7 batches were implemented, a comprehensive code audit was performed (2026-06-06). **13 issues were identified** across backend plugins, frontend components, and API wiring.

### 🔴 Critical (3)

| # | Issue | File | Description |
|---|-------|------|-------------|
| 1 | **All notes at same pitch** | `plugins/melody_generator/plugin.py:86-88` → `plugins/bassline_generator/plugin.py:86-87` | `PDegree` outputs raw MIDI pitches (0-12), not scale degrees. Clamp `[60, 84]` maps everything to C4 (melody) or C1 (bassline). Need +48 octave offset before genre/mood adjustments. |
| 2 | **api.ts missing generic type params** | `frontend/src/renderer/api.ts:197,209,221` | `melodyGenerator`, `basslineGenerator`, `exportArrangement` call `post(...)` without type arg → `res.data` is `unknown`, compilation error. |
| 3 | **Ctrl+Enter shortcut broken** | `frontend/src/renderer/pages/Dashboard.tsx:77-83` | `document.querySelector('[data-gen="chords"]')` targets nonexistent attributes. Buttons in `GeneratePanel.tsx` have no `data-gen` attributes. |

### 🟡 Medium (6)

| # | Issue | File | Description |
|---|-------|------|-------------|
| 4 | **Harmonic/Melodic Minor = Natural Minor** | `plugins/melody_generator/plugin.py:23-24` | `Scale.minor` used for both. Should define custom semitone lists via `Scale([0,2,3,5,7,8,11])` and `Scale([0,2,3,5,7,9,11])`. |
| 5 | **Mood overrides Genre octave** | `plugins/melody_generator/plugin.py:116-121` | Dark mood (octave 3) unconditionally overwrites DnB genre (octave 5). Should take max or be additive. |
| 6 | **Duplicate swing state** | `frontend/src/renderer/components/MIDIPlayer.tsx:23` vs `Dashboard.tsx:30` | MIDIPlayer has local `useState(0)` for swing; Dashboard passes separate swing to ProjectSummary. Two independent sliders. |
| 7 | **Chord data discarded** | `frontend/src/renderer/pages/Dashboard.tsx:37` | `handleGenerateChords` ignores `ProgressionChord[]` and voice_leading score. Only stores raw notes. Ctrl+S saves empty array. |
| 8 | **Regenerate only clears** | `frontend/src/renderer/components/MIDIPlayer.tsx:77-81` | Clicking "Regenerate" calls `onRegenerate` which sets `setChords([])` — clears without triggering new generation. |
| 9 | **Surprise Me ✨ doesn't randomize scale** | `frontend/src/renderer/components/GeneratePanel.tsx:46` | Scale hardcoded to `'major'`. Should randomly pick between `'major'` and `'minor'`. |

### 🟢 Minor (4)

| # | Issue | File | Description |
|---|-------|------|-------------|
| 10 | **Dead code in `_map_range`** | `plugins/melody_generator/plugin.py:124` | `note == 0` guard is unreachable — clamp already handles it. |
| 11 | **Duplicate response fields** | `backend/app/api/arrangement.py:76-77` | `midi_url` and `download_url` return identical values. |
| 12 | **Fallback pitches are chromatic** | `plugins/melody_generator/plugin.py:85-86` | Chromatic fallback sequence violates specified key/scale. |
| 13 | **No request timeout on API calls** | `frontend/src/renderer/components/GeneratePanel.tsx:77-123` | If backend hangs, loading spinner runs forever. No `AbortController`. |

### Fix Plan (Priority Order)

1. **🔴 C1** — Add base octave offset (+48) in melody/bassline generators before genre/mood adjustments
2. **🔴 C2** — Add type parameters to `post()` calls in `api.ts`
3. **🔴 C3** — Add `data-gen` attributes to generate buttons in `GeneratePanel.tsx`
4. **🟡 M1** — Define custom `Scale(...)` for Harmonic/Melodic Minor
5. **🟡 M2** — Make genre octave adjustment additive (not overwritten by mood)
6. **🟡 M3** — Lift swing state to Dashboard, pass down to both MIDIPlayer and ProjectSummary
7. **🟡 M4** — Wire chord data + voice_leading through Dashboard state
8. **🟡 M5** — Fix Regenerate to actually call generation API, not just clear
9. **🟡 M6** — Randomize scale in Surprise Me preset

**Status:** All 13 issues fixed (2026-06-06). 152 tests pass (129 backend + 23 frontend), 0 TS errors.  
**Fix verification:** Backend `pytest tests/` = 129/129 passed. Frontend `tsc --noEmit` = clean. `vitest run` = 23/23 passed.

---

## 16. Plan vs Implementation Cross-Reference Audit

A comprehensive cross-reference audit was performed (2026-06-06) comparing the plan specification against the actual implementation, and cross-checking both against research docs (`docs/research/advanced-midi-generation.md`).

### 16.1 Research Doc Alignment (advanced-midi-generation.md)

| Research Recommendation | Implementation | Status |
|------------------------|---------------|--------|
| isobar `PDegree(PSeries/PWalk/PMarkov, scale) + octave` | `PDegree` + `PRandomWalk`/`PMarkov` + +60 offset | ✅ Core approach followed |
| `PRandomWalk` for bassline passing tones | `PRandomWalk` used in walking/syncopated/root_fifth patterns | ✅ |
| Swing as tick-offset post-processor | `apply_swing()` defined but never called | ⚠️ Defined but unwired |
| No ML dependencies | Zero ML imports | ✅ |
| No GPU needed | Zero GPU code | ✅ |
| Beat-based Note format | `{pitch, velocity, start_beat, duration_in_beats}` | ✅ |
| Custom swing (no external lib) | Pure arithmetic on beat values | ✅ |
| Genre swing presets (House 30%, Techno 20%, etc.) | `SWING_PRESETS` dict defined | ✅ |

### 16.2 Post-Audit Fix Verification (Section 15)

All 13 issues verified resolved:

| # | Issue | Resolution | Verified |
|---|-------|-----------|----------|
| C1 | All notes at same pitch | `melody_generator/plugin.py:90` adds +60 offset; `bassline_generator/plugin.py:86` uses `octave * 12` | ✅ |
| C2 | api.ts missing generic type params | `post<...>()` on melody/bassline/arrangement calls | ✅ |
| C3 | Ctrl+Enter shortcut broken | `data-gen="chords/melody/bassline"` on generate buttons | ✅ |
| M1 | Harmonic/Melodic Minor = Natural Minor | Custom `Scale([...])` for both variants | ✅ |
| M2 | Mood overrides Genre octave | Additive offsets in `_map_range` | ✅ |
| M3 | Duplicate swing state | Lifted to Dashboard, single source of truth | ✅ |
| M4 | Chord data discarded | `progChords` state + `vlScore` state wired | ✅ |
| M5 | Regenerate only clears | `handleRegenerate` calls generation APIs | ✅ |
| M6 | Surprise Me no scale randomize | `randomScale()` from `['major', 'minor']` | ✅ |
| 10 | Dead code in `_map_range` | `if note == 0` guard removed | ✅ |
| 11 | Duplicate response fields | Only `download_url` + `filename` returned | ✅ |
| 12 | Chromatic fallback pitches | Diatonic `[0,2,4,5,7,9,11]` fallback | ✅ |
| 13 | No request timeout | `withTimeout` helper + 30s `API_TIMEOUT` | ✅ |

### 16.3 Plan vs Implementation Discrepancies

#### HIGH Severity

| # | Issue | Plan Spec | Actual | Where |
|---|-------|-----------|--------|-------|
| H1 | **No audio playback** | "Simultaneous multi-part playback: All parts schedule oscillators against same AudioContext. Each note gets its own oscillator + gain node." | MIDI Player is visual-only — playhead animation only, zero `AudioContext`/`OscillatorNode` calls. No sound. | `MIDIPlayer.tsx` |
| H2 | **No Expression Engine integration** | Generators pass through Expression Engine (`compute_velocity`, `voicing`, `articulation`, `arpeggiation`). See data flow section 10. | Generators manage velocity/duration internally. Never import or call `plugins/midi_export/expression/`. | `melody_generator/plugin.py`, `bassline_generator/plugin.py` |

#### MEDIUM Severity

| # | Issue | Plan Spec | Actual | Where |
|---|-------|-----------|--------|-------|
| M1 | **`apply_swing()` never called** | Swing post-processor applied to all generated notes before display | `swing.py` has correct implementation + 7 presets but zero callers in entire codebase. Frontend swing slider stores state, never transforms notes. | `swing.py`, `MIDIPlayer.tsx` |
| M2 | **Bassline `octave_jump` = chromatic ascent** | "Root-octave jumps, eighth notes" for trance | `PSeries(0, 1, total)` produces ascending scale, not root/octave alternation. Zero test coverage for trance. | `bassline_generator/plugin.py:117` |
| M3 | **Energetic mood all same pitch** | Mood range `(72, 96)` should distribute notes | `+60` offset puts PDegree output at 60-72, then `_map_range` clamps everything below 72 → all notes = MIDI 72 (C5). | `melody_generator/plugin.py:90` |
| M4 | **"Clear All" regenerates instead of clearing** | "[Clear All] removes all generated parts" | `clearAll()` fires 3 simultaneous API calls via `handleRegenerate`. Creates new parts instead of removing. | `MIDIPlayer.tsx:84-88` |
| M5 | **Preset chips don't auto-trigger** | "Clicking a chip fills dropdowns, then triggers generation on the primary part" | Only calls `onChange(s)` to fill dropdowns. User must manually click generate button. | `GeneratePanel.tsx` `applyPreset()` |
| M6 | **No project state auto-fill** | "Pre-fills key/scale/BPM from project state" | `resolveSettings()` hardcodes `key='C'`, `scale='major'`. GeneratePanel doesn't receive project as prop. | `GeneratePanel.tsx:69-79` |
| M7 | **Generation Hub is a shell** | Full sections: Melody controls, Bassline controls, Preview, Play/Stop, Send to Player, MIDI, Save, history | Contains only NoteGrid + Peek toggle. No per-part controls, no generate buttons, no Play/Stop, no export/save. | `GenerationHub.tsx` |
| M8 | **Preset values differ from spec** | See section 6.6 preset table | Dark Techno: `advanced` (plan: `simple`). Uplifting Trance: `simple` (plan: `advanced`). Deep House: `happy`/`house` (plan: `Neutral`/`Deep House`). | `GeneratePanel.tsx:16-21` |

#### LOW Severity

| # | Issue | Plan Spec | Actual | Where |
|---|-------|-----------|--------|-------|
| L1 | **Ctrl+S saves chords only** | Saves full arrangement with all parts | Saves only `progChords` as `progression` type. Melody/bassline excluded. | `Dashboard.tsx` |
| L2 | **Voice-leading score undisplayed** | "Voice-leading score badge shown briefly in a toast" | `_vlScore` stored in Dashboard (`_` = unused prefix). No toast, badge, or UI element. | `Dashboard.tsx:32` |
| L3 | **Generation history is a noop** | "Cycling keeps last 5 per part in ring buffer" | `onPushHistory` = `() => {}`. `GenerationHistory` type exists but never populated. | `Dashboard.tsx:175` |
| L4 | **Bassline missing velocity features** | Phrase arc, `PAccent`, articulation, default 80-110 | No phrase arc awareness. No `PAccent`. No articulation call. DnB offbeats = 78 (<80). | `bassline_generator/plugin.py` |
| L5 | **Swing presets not wired to UI** | Genre-based swing amounts guide slider default | `SWING_PRESETS` exists in `swing.py` but never queried by any component. Slider always starts at 0. | `swing.py` |
| L6 | **Reference tools layout** | Collapsed section at bottom of Generate panel + TopBar icons | Always-visible icons at top-right of Generate panel (plus duplicates in TopBar). No collapsed section. | `GeneratePanel.tsx:137-141` |
| L7 | **"Open Hub" button in wrong location** | `[🎵 Open Generation Hub →]` in Generate panel | "Overview" button in TopBar only. No trigger inside Generate panel. | `Dashboard.tsx` |
| L8 | **MIDI export path wrong in plan** | `POST /api/plugins/midi_export/arrangement` | Actual: `POST /api/arrangement/export` (dedicated router, not under midi_export) | `plan-melody-bassline.md:563` (docs only) |

### 16.4 Test Coverage Gaps

| Gap | Detail |
|-----|--------|
| **Trance/octave_jump not tested** | Bassline test suite covers root_fifth, walking, syncopated — never passes `genre='trance'` |
| **No GenerationHub tests** | No test file exists for `GenerationHub.tsx` |
| **No NoteGrid tests** | No test file exists for `NoteGrid.tsx` |
| **No swing end-to-end test** | No test verifies `apply_swing()` is called during generation or export |
| **No voice-leading display test** | No test verifies VL badge/toast appears after chord generation |
| **No Surprise Me / randomization test** | No test for `randomScale()`, `randomMood()`, etc. |
| **No loading/error state tests** | No test for spinner `⟳` appearing during API call, or red error toast on failure |
| **No preset click → API call test** | No test that clicking a chip followed by a generate button triggers the correct API call |

---

## 17. Comprehensive Fix Plan (15 Items)

Priority-ordered based on impact and dependency chain. Items H1 and H2 unblock several downstream features (swing cannot be auditioned without audio playback; expression engine cannot be verified without being wired).

| Priority | Ref | Description | Est. | Dependencies |
|----------|-----|-------------|------|-------------|
| P0 | H1 | **Implement audio playback** — Add `AudioContext` + per-note oscillators + gain nodes in MIDIPlayer. Each note gets its own `OscillatorNode` scheduled at BPM-based time. | 4h | None |
| P0 | H2 | **Wire Expression Engine** — Call `compute_velocity()` and `apply_articulation()` in melody/bassline generators as post-processors. Import from `plugins/midi_export/expression/`. | 2h | None |
| P1 | M1 | **Wire swing into playback + export** — Call `apply_swing()` on notes before playback scheduling and before arrangement export. Connect frontend slider to actual timing transform. | 2h | H1 (swing needs audio to be audible) |
| P1 | M3 | **Fix energetic mood clamping** — Make `_map_range` transpose the sequence by mood range midpoint instead of clamping per-note. Or remove `+60` hardcode and compute base from mood range center. | 1h | None |
| P1 | M2 | **Fix bassline `octave_jump`** — Replace `PSeries(0, 1, total)` with `PRandomWalk([0, 7], min=1, max=1)` or explicit root/octave pattern. Add trance test. | 0.5h | None |
| P2 | M6 | **Auto-fill from project state** — Pass project key/scale/BPM as props from Dashboard to GeneratePanel. Use them before falling back to hardcoded defaults. | 1h | None |
| P2 | M5 | **Auto-trigger on preset chip** — After `applyPreset()` sets dropdowns, immediately call the chords generation function. | 1h | None |
| P2 | M4 | **Fix "Clear All" to clear, not regenerate** — Add a separate `handleClear(type)` callback that sets state to `[]` without calling any API. Keep `handleRegenerate` for the regenerate buttons. | 1h | None |
| P3 | M7 | **Complete Generation Hub** — Add Melody section (controls + generate), Bassline section, Play/Stop, Send to Player, MIDI export, Save to Library, click-outside dismiss. | 4h | H1 (play), M5/M6 (controls) |
| P3 | L1 | **Ctrl+S save all parts** — Extend save handler to create an `arrangement`-type idea with chords + melody + bassline data. | 1h | None |
| P3 | L2 | **Display voice-leading score** — Show badge or brief toast after chord generation with VL score. | 0.5h | None |
| P3 | L3 | **Wire generation history** — Populate `GenerationHistory` ring buffer from `onPushHistory`. Add ⬆/⬇ cycling in MIDIPlayer row headers. | 2h | None |
| P4 | M8 | **Fix preset values** — Swap Dark Techno/Uplifting Trance complexities. Decide on Deep House mood (pick `'chill'`/`'happy'` since `'neutral'` doesn't exist, or add `'neutral'` to mood list). | 0.5h | None |
| P4 | L4 | **Bassline velocity enhancements** — Add phrase arc awareness, bump DnB offbeat min to 80, add PAccent if isobar supports it. | 1h | H2 |
| P4 | L5 | **Wire swing presets to UI helper** — Pass genre from settings, query `SWING_PRESETS` dict, suggest swing slider default per genre. | 0.5h | M1 |

### Implementation Order

```
Batch A (P0) — Audio + Expression Engine
  A1. MIDIPlayer: Web Audio API oscillator scheduling
  A2. melody_generator: post-process through compute_velocity()
  A3. bassline_generator: post-process through compute_velocity()

Batch B (P1) — Swing + Bugfixes
  B1. apply_swing() wired in playback + export pipeline
  B2. _map_range: remove clamping bug for high moods
  B3. bassline octave_jump: fix pattern + add tests

Batch C (P2) — Preset + Auto behavior
  C1. Project state auto-fill in GeneratePanel
  C2. Auto-trigger generation on preset chip click
  C3. Separate clear vs regenerate in MIDIPlayer

Batch D (P3) — Hub + Save + History
  D1. Generation Hub: full controls
  D2. Ctrl+S full arrangement save
  D3. Voice-leading badge
  D4. Generation history ring buffer

Batch E (P4) — Polish
  E1. Preset value corrections
  E2. Bassline velocity polish
  E3. Swing preset-driven defaults
```

**Batch A (DONE):** Audio playback + Expression Engine integration completed 2026-06-06. MIDIPlayer now schedules per-note triangle-wave oscillators via Web Audio API at BPM-based timing, with swing-aware note offsetting. melody_generator and bassline_generator both use `_resolve_phrase_multiplier` for velocity arc and `resolve_gate_length` for articulation-aware note durations. DnB offbeat bass velocity raised to 80.

**Batch B (DONE):** Swing + bugfixes completed 2026-06-06. apply_swing() wired into arrangement export (backend). SWING_PRESETS (7 genre defaults) defined in types.ts, auto-fills slider on genre change. _map_range uses centering instead of clamping — energetic mood now spans full 72–96 range. Bassline octave_jump pattern changed from chromatic ascent (PSeries) to root/octave alternation (PSequence). Trance test + swing export test added.

**Batch C (DONE):** Preset + Auto behavior completed 2026-06-06. GeneratePanel receives `project` prop, uses project key/scale in resolveSettings() when Auto. applyPreset() calls onAutoGenerate() after onChange() — preset chips now auto-trigger chord generation. MIDIPlayer has separate onClear prop — clearAll() clears state to [] instead of calling onRegenerate(). All 154 tests pass.

**Batch D (DONE):** Hub + Save + History completed 2026-06-06. GenerationHub fully expanded: Melody section (6 dropdowns + Generate), Bassline section (genre/pattern/length + Generate), Preview with inline Play/Stop (Web Audio API), MIDI All export, Save to Library with editable name input, Esc/click-outside dismiss. Ctrl+S now saves full arrangement as type='arrangement' idea via POST /arrangement/save. Voice-leading score badge appears for 4s after chord generation (green ≥7, amber <7). Generation history ring buffer (max 5 per part) pushes on every generate, MIDIPlayer shows ⬆/⬇ arrows for parts with >1 history entry. 154 tests pass.

**Estimated total effort:** ~5h remaining  
**Estimated batches:** 1 (E)  
**Tests to add:** ~5 (GenerationHub, NoteGrid, Surprise Me click → API)
