# Music Copilot — Vision & Roadmap

## Core Identity

An AI-powered music production assistant for electronic music producers.
A producer, teacher, music theorist, sample librarian, and idea generator.

**Primary DAW Target:** FL Studio 24 (Windows first, macOS future)

**The goal is not merely generating music.**
The goal is helping producers:
- Learn
- Finish tracks
- Analyze music
- Find inspiration
- Improve workflow

## Immutable Architecture Rules

These must never be violated without a project-wide discussion:

1. **Never call AI models directly.** Always use `llm.generate(prompt)` via the Provider Layer.
2. **Every feature is a plugin.** Each plugin lives under `/plugins/` and subclasses the `Plugin` ABC.
3. **Offline-first for analysis.** Audio/MIDI analysis must work without internet.
4. **Provider-agnostic AI.** Switch providers (OpenAI, Groq, GLM, OpenRouter) via config — no code changes.
5. **Modular, expandable indefinitely.** No hard dependencies between features. Plugins auto-discover.

## Design Philosophy — Unified Project Flow

Music Copilot is a single creative environment, not a collection of separate tools. Every feature feeds into and reads from the same project state.

**One container, many entry points.**
A project is always the starting point (name, BPM, key, scale). From there you can type data manually, import a sample to auto-fill parameters, generate progressions from the Theory Engine — or any combination, in any order. There are no modes or branching paths. You are always in the same project; what you choose to feed into it is up to you.

**Everything is overridable at any time.**
If a sample analysis detects 128 BPM but you want 130, change it. If the Theory Engine suggests a mood you disagree with, override it. No field is locked. Every auto-detected value is a suggestion, not a commitment. Full creative freedom.

**Deterministic core, optional AI.**
Analysis (BPM, key, scale) works offline with signal processing and music theory — no AI required. The Co-Producer Chat is the only AI-powered feature. It answers questions, explains theory, and suggests completions based on your project state. AI is a plug-in layer, not the foundation.

**Everything saves to the project.**
Analyzed samples, generated progressions, chord pads, mood selections — all stored in the project's SQLite record. The Library and Ideas are cross-project collections; the dashboard always reflects the current project.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript + Electron + Tailwind |
| Backend | Python + FastAPI + SQLite |
| Audio Analysis | librosa, deeprhythm, music21 |
| MIDI | pretty_midi, mido, music21 |
| AI | Provider abstraction (OpenAI, Groq, GLM, OpenRouter) |

## Roadmap — 9 Phases, 30 Features

### Phase 1 — MVP Foundation
Ship useful software immediately.

- [x] Sample Analyzer — BPM, key, scale, length from .wav/.mp3/.flac
- [x] Theory Engine — scales, chords, intervals, functions (no AI)
- [x] Chord Progression Generator — key + mood + genre → progressions
- [x] MIDI Export Engine — chords, melody, bassline, arpeggio → .mid files
- [x] Progression & Melody Library — save, browse, sort, search, preview, drag-and-drop MIDI into FL Studio
- [x] **Single-Screen Bento Dashboard** — replace 4-page nav with co-hero bento grid. All features on one screen. Project Anchor, Music Theory panel, Chord Pads, Sample Analysis, expanded Co-Producer Chat. See `docs/design/new-dashboard.md`.
- [x] **Project Concept** — user-declared project (name, BPM, key, scale). New `projects` SQLite table. Session persistence. DAW sync stubbed until Phase 7.
- [x] **Idea Library Expansion** — migrate `progressions` table to polymorphic `ideas` table. Supports progression, melody, bassline, drum_pattern, arpeggio, phrase. Backward-compatible migration.
- [x] **Global Search** — `Ctrl+K` search overlay across Library, samples, and plugins.
- [ ] Producer Chat — ask production questions via AI layer
- [ ] Why Does This Sound Good? — AI explains tension, resolution, harmony
- [ ] Finish My Idea (basic) — analyze loop/MIDI, suggest structure

### Phase 2 — AI Foundation
- [ ] Theory Teacher — user asks theory questions, AI explains with examples

### Phase 3 — Creative Generation
- [ ] Melody Generator — genre + key + energy → MIDI
- [ ] Bassline Generator — per genre (house, techno, trance, dubstep, DnB)
- [ ] Arpeggiator Generator — up/down/random/trance patterns
- [ ] Idea Generator — "Give me 20 drop ideas" with hooks/arrangements

### Phase 4 — Finish My Idea
- [ ] Finish My Idea (full) — audio/MIDI in → full song structure
- [ ] Arrangement Planner — intro → build → drop → breakdown → outro
- [ ] Track Completion Suggestions — detect missing bass, FX, tension

### Phase 5 — Reference Track Intelligence
- [ ] Reference Analyzer — BPM, key, structure, energy curve from reference
- [ ] Arrangement Breakdown — section timestamps with labels
- [ ] Recreation Guide — AI explains how to recreate the track

### Phase 6 — Sample Library Intelligence
- [ ] Library Scanner — scan Splice folder, index to SQLite
- [ ] AI Sample Search — "find dark techno kicks" via natural language
- [ ] Project-Aware Suggestions — analyze project, suggest FX/drums/transitions

### Phase 7 — FL Studio Integration
- [x] Drag-and-Drop MIDI — generate and drop .mid files into FL (framework in Phase 1, polished here)
- [ ] FL Template Generator — genre-specific project templates
- [ ] Project Analyzer — analyze FLP export data and stems
- [ ] JUCE-Based Bridge Plugin — deep DAW integration like Splice Bridge

**Splice Bridge-style deep integration (research):** A standalone C++ application using the JUCE framework that connects Music Copilot to FL Studio at a deeper level. Approaches ranked by difficulty:
- **Easy:** Virtual MIDI port — backend writes to loopback MIDI port, FL Studio reads it as MIDI controller input (BPM sync, chord previews)
- **Medium:** FL Studio Python Scripting — can run scripts reacting to transport changes (limited, no GUI or audio)
- **Hard (Splice-level):** Full VST3 bridge plugin via JUCE — allows audio streaming from FL Studio's master channel, real-time BPM/position from the DAW host, and MIDI output back into the project. This is a 3-6 month standalone C++ project requiring knowledge of audio plugin development.

### Phase 8 — Producer Coach
- [ ] Mix Feedback — analyze export, detect mud/harshness/dynamics
- [ ] Practice Mode — generate creative challenges
- [ ] Skill Tracking — track harmony, arrangement, mixing progress

### Phase 9 — Advanced Intelligence
- [ ] Stem Separation — drums, bass, vocals, instruments
- [ ] Genre Detector — classify track genre
- [ ] Sound Design Assistant — "I want an Afterlife lead" → Serum/Vital settings
- [ ] Project Memory — remembers user preferences, tailors suggestions

## v0.1 Release Scope

Build only these for the first release (5 phases, 23 tasks):

1. Sample Analyzer
2. Theory Engine
3. Chord Progression Generator
4. MIDI Export Engine
5. Progression & Melody Library (save, browse, sort, preview, drag-and-drop MIDI)
6. **Project Concept** — name, BPM, key, scale, session persistence
7. **Idea Library Expansion** — polymorphic `ideas` table
8. **Sample Analyzer Upgrade** — 5-algorithm key ensemble (Krumhansl-Schmuckler, Aarden-Essen, Bellman-Budge, Temperley-Kostka-Payne, Simple-Weights), confidence scores, edge-case robustness, "Apply to Project" button
9. **Single-Screen Bento Dashboard** — replaces 4-page navigation. Project Anchor, Music Theory panel, Chord Pads, Sample Analysis
10. **Global Search** — `Ctrl+K` overlay across Library, samples, and plugins
11. **Voice-Leading Scoring** — music21 VoiceLeadingQuartet for progression quality
12. **Producer Chat** — AI chat via Groq provider (Phase E — last)

Deferred to Phase 2+: Why Does This Sound Good?, Finish My Idea, Basic-Pitch note transcription, musicnn genre tagging.

This alone is a genuinely useful tool for FL Studio producers and creates the foundation for every future feature without architectural rewrites.
