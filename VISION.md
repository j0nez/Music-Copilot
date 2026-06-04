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

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript + Electron + Tailwind |
| Backend | Python + FastAPI + SQLite |
| Audio Analysis | librosa, essentia, aubio |
| MIDI | pretty_midi, mido, music21 |
| AI | Provider abstraction (OpenAI, Groq, GLM, OpenRouter) |

## Roadmap — 9 Phases, 30 Features

### Phase 1 — MVP Foundation
Ship useful software immediately.

- [ ] Sample Analyzer — BPM, key, scale, length from .wav/.mp3/.flac
- [ ] Theory Engine — scales, chords, intervals, functions (no AI)
- [ ] Chord Progression Generator — key + mood + genre → progressions
- [ ] MIDI Export Engine — chords, melody, bassline, arpeggio → .mid files
- [ ] Progression & Melody Library — save, browse, sort, search, preview, drag-and-drop MIDI into FL Studio
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

Build only these for the first release:

1. Sample Analyzer
2. Theory Engine
3. Chord Progression Generator
4. MIDI Export Engine
5. Progression & Melody Library (save, browse, sort, preview, drag-and-drop MIDI)
6. Producer Chat
7. Why Does This Sound Good?
8. Finish My Idea (basic)

This alone is a genuinely useful tool for FL Studio producers and creates the foundation for every future feature without architectural rewrites.
