# Music Copilot

An AI-powered music production assistant for electronic music producers.
Targets FL Studio 24 on Windows (macOS future).

## Overview

Music Copilot functions as a producer, teacher, music theorist, sample librarian, and idea generator — helping producers learn, finish tracks, analyze music, find inspiration, and improve workflow.

## Architecture

```
Music Copilot
├── Frontend    — Electron + React + TypeScript + Tailwind
├── Backend     — Python + FastAPI + SQLite
├── Modules     — Audio Analysis, MIDI Generation, Theory Engine, AI Layer, etc.
├── Plugin System — every feature is a self-contained plugin
└── Provider Layer — OpenAI, Groq, GLM, OpenRouter (switchable via config)
```

Detailed architecture docs: [`docs/architecture/`](./docs/architecture/)

## Getting Started

### Prerequisites
- Node.js 20+
- Python 3.11+
- FL Studio 24 (for DAW integration features)

### Setup

```bash
# Backend
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### Development

```bash
# Run backend (http://localhost:8000)
cd backend
.\venv\Scripts\activate
uvicorn app.main:app --reload

# Run frontend (Electron dev mode)
cd frontend
npm run dev
```

## v0.1 Features

- Sample Analyzer — BPM, key, scale detection
- Theory Engine — scales, chords, intervals, functions
- Chord Progression Generator
- MIDI Export Engine
- AI Studio — Producer Chat, educational analysis, composition assistant (in progress)

## Plugin System

Features are auto-discovered plugins in `/plugins/`. Each plugin implements:

```python
class Plugin:
    name: str
    description: str
    async def execute(self, **kwargs) -> dict
```

## License

[To be decided]
