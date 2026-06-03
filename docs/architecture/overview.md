# System Overview

Music Copilot is a desktop application with a decoupled frontend/backend architecture, a plugin-based feature system, and a provider-agnostic AI layer.

```

┌─────────────────────────────────────────────────────────┐
│                    Electron Shell                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Renderer Process (React)              │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐             │  │
│  │  │  Pages  │ │Components│ │  Hooks  │             │  │
│  │  └────┬────┘ └─────────┘ └─────────┘             │  │
│  │       │         State Management                   │  │
│  │       │         (React Context / Zustand)          │  │
│  │       │                                            │  │
│  │       ▼                                            │  │
│  │  ┌──────────┐                                      │  │
│  │  │ REST Client│──── HTTP ──────────────────────┐   │  │
│  │  └──────────┘                                   │   │  │
│  └─────────────────────────────────────────────────┘   │
│                        │                                │
│                        ▼                                │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Main Process (Electron)              │   │
│  │  - File system access (via preload bridge)        │   │
│  │  - Window management                              │   │
│  │  - MIDI file drag-and-drop                        │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP REST API (localhost:8000)
                           ▼
┌──────────────────────────────────────────────────────────┐
│                    FastAPI Backend                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                  │
│  │   API    │ │ Services │ │    DB    │                  │
│  │  Routes  │→│  (logic) │→│ (SQLite) │                  │
│  └──────────┘ └────┬─────┘ └──────────┘                  │
│                    │                                      │
│                    ▼                                      │
│  ┌───────────────────────────────────────────────────┐   │
│  │              Plugin System                         │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │   │
│  │  │ Sample   │ │  Chord   │ │  Theory  │  ...       │   │
│  │  │ Analyzer │ │Generator │ │  Engine  │            │   │
│  │  └──────────┘ └──────────┘ └──────────┘           │   │
│  └───────────────────────────────────────────────────┘   │
│                    │                                      │
│                    ▼                                      │
│  ┌───────────────────────────────────────────────────┐   │
│  │              AI Provider Layer                     │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │   │
│  │  │  OpenAI  │ │   Groq   │ │   GLM    │  ...       │   │
│  │  └──────────┘ └──────────┘ └──────────┘           │   │
│  └───────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

## Layer Responsibilities

| Layer | Role |
|-------|------|
| **Electron Main** | Window management, file system access, native features |
| **React Renderer** | UI rendering, user interaction, state management |
| **FastAPI Backend** | Business logic, data persistence, plugin orchestration |
| **Plugin System** | Feature isolation, auto-discovery, uniform interface |
| **AI Provider Layer** | Model abstraction, config-driven switching, prompt interface |
| **SQLite** | Local state, sample index, user preferences, project data |

## Communication Flow

1. User interacts with React UI
2. Renderer sends HTTP request to FastAPI backend
3. Backend route delegates to a service or plugin
4. Plugin executes (may call AI Provider Layer if needed)
5. Response flows back: plugin → service → route → HTTP → React UI
