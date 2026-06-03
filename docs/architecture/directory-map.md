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
│   │   │   ├── pages/         # Route-level page components
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   └── store/         # State management (context / Zustand)
│   │   ├── preload/           # Electron preload scripts (secure bridge)
│   │   └── App.tsx            # Root React component
│   ├── public/                # Static assets
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                   # Python + FastAPI
│   ├── app/
│   │   ├── api/               # Route handlers (endpoints)
│   │   ├── core/              # Config, dependency injection, app lifespan
│   │   ├── models/            # Pydantic schemas (request/response validation)
│   │   ├── services/          # Business logic layer
│   │   │   ├── audio/         # Audio analysis (librosa, essentia, aubio)
│   │   │   ├── midi/          # MIDI generation & export (pretty_midi, mido, music21)
│   │   │   ├── theory/        # Music theory engine (scales, chords, intervals)
│   │   │   └── chat/          # Chat service (AI-powered production advice)
│   │   ├── db/                # SQLite database setup, models, migrations
│   │   └── main.py            # FastAPI app entry point
│   ├── tests/                 # pytest suite
│   ├── requirements.txt
│   └── pyproject.toml
│
├── plugins/                   # Auto-discovered feature plugins
│   ├── __init__.py            # Plugin discovery logic
│   ├── base.py                # Plugin ABC — all plugins must subclass this
│   ├── sample_analyzer/       # BPM, key, scale, length detection
│   ├── chord_generator/       # Chord progression generation
│   ├── melody_generator/      # Melody generation (Phase 3)
│   ├── producer_coach/        # Mix feedback, practice mode (Phase 8)
│   ├── reference_analyzer/    # Reference track analysis (Phase 5)
│   ├── finish_my_idea/        # Track completion (Phase 4)
│   └── splice_library/        # Splice library scanner (Phase 6)
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
│   └── constants.py           # Enums, magic numbers, config keys
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
