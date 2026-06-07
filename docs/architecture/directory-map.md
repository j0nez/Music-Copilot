# Directory Map

```
E:\Projects\Music-Copilot\
│
├── VISION.md                  # North star — core identity, architecture rules, full roadmap
├── AGENTS.md                  # Agent memory — session context, conventions, task tracking
├── README.md                  # Project overview, setup instructions
│
├── frontend/                  # Electron + React + TypeScript + Tailwind
│   ├── src/
│   │   ├── main/              # Electron main process — window management, native APIs
│   │   ├── renderer/          # React application
│   │   │   ├── components/    # Reusable UI components
│   │   │   │   ├── MusicTheoryPanel.tsx
│   │   │   │   ├── ChordPads.tsx
│   │   │   │   ├── SampleAnalysisPanel.tsx
│   │   │   │   ├── LibraryModal.tsx
│   │   │   │   ├── SearchOverlay.tsx
│   │   │   │   ├── LoadingSkeleton.tsx
│   │   │   │   └── RetryButton.tsx
│   │   │   ├── pages/         # Single page — Dashboard (bento grid)
│   │   │   ├── hooks/         # Custom React hooks (useApi)
│   │   │   ├── store/         # Project state (React Context)
│   │   │   ├── api.ts         # HTTP client (fetchJson helper)
│   │   │   └── types.ts       # TypeScript interfaces
│   │   ├── preload/           # Electron preload scripts (secure bridge)
│   │   └── App.tsx            # Root React component (single route)
│   ├── public/                # Static assets
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                   # Python + FastAPI
│   ├── app/
│   │   ├── api/               # Route handlers (endpoints)
│   │   │   ├── plugins.py     # GET /api/plugins/, POST /api/plugins/{name}/execute
│   │   │   ├── progressions.py # CRUD for ideas table (save/list/get/delete/midi)
│   │   │   ├── projects.py    # CRUD for projects table + /last endpoint
│   │   │   ├── search.py      # GET /api/search/?q=
│   │   │   ├── upload.py      # POST /api/upload/ (audio file)
│   │   │   └── exports.py     # MIDI file download
│   │   ├── core/              # Config, dependency injection, app lifespan
│   │   ├── models/            # Pydantic schemas (request/response validation)
│   │   ├── services/          # Business logic layer
│   │   │   ├── audio/         # Audio analysis (librosa, essentia, aubio)
│   │   │   ├── midi/          # MIDI generation & export (pretty_midi, mido, music21)
│   │   │   ├── theory/        # Music theory engine (scales, chords, intervals)
│   │   │   └── chat/          # Chat service (AI-powered production advice)
│   │   ├── db/                # SQLite database setup, models, migrations
│   │   └── main.py            # FastAPI app entry point
│   ├── requirements.txt
│   └── pyproject.toml
│
├── tests/                      # pytest suite (116 tests)
│   ├── test_event_bus.py
│   ├── test_plugin_discovery.py
│   ├── test_sample_analyzer.py
│   ├── test_theory_engine.py
│   ├── test_progressions.py
│   ├── test_midi_export.py
│   ├── test_midi_expression.py
│   ├── test_chord_generator.py
│   ├── test_projects.py
│   └── test_search.py
│
├── plugins/                   # Auto-discovered feature plugins
│   ├── __init__.py            # Plugin discovery logic
│   ├── base.py                # Plugin ABC — all plugins must subclass this
│   ├── events.py              # EventBus (on/off/emit)
│   ├── sample_analyzer/       # BPM, key, scale, length detection (5-algo key ensemble)
│   ├── theory_engine/         # Scales, chords, intervals
│   ├── chord_generator/       # Chord progression generation (50+ patterns, voice-leading)
│   ├── midi_export/           # MIDI file export (5 styles, voicing, articulation)
│   ├── finish_my_idea/        # **Stub** — Track completion (Phase 4)
│   ├── melody_generator/      # **Stub** — Melody generation (Phase 3)
│   ├── producer_coach/        # **Stub** — Mix feedback, practice mode (Phase 8)
│   ├── reference_analyzer/    # **Stub** — Reference track analysis (Phase 5)
│   └── splice_library/        # **Stub** — Splice library scanner (Phase 6)
│
├── providers/                 # AI provider layer
│   ├── __init__.py            # Provider registry
│   ├── interface.py           # Abstract provider interface
│   ├── openai_provider.py     # OpenAI implementation
│   ├── groq_provider.py       # Groq implementation
│   ├── glm_provider.py        # GLM implementation
│   └── openrouter_provider.py # OpenRouter implementation
│
├── shared/                    # Cross-boundary types & constants
│   ├── types.py               # Shared Pydantic models (used by both API & plugins)
│   └── music_theory.py        # Music theory constants (NOTE_TO_SEMITONE, CHORD_INTERVALS, DIATONIC_QUALITIES)
│
├── data/                      # Local runtime data (gitignored)
│   ├── db/                    # SQLite database files
│   ├── samples/               # User-uploaded sample files
│   └── exports/               # Generated MIDI exports
│
├── scripts/                   # Development & maintenance scripts
│   ├── setup.ps1              # One-command environment setup
│   ├── dev.ps1                # Launch both frontend & backend
│   └── seed_db.py             # Populate database with test data
│
├── docs/                      # Documentation
│   └── architecture/          # Architecture decision records & system design
│
└── .github/workflows/         # CI/CD pipelines
```
