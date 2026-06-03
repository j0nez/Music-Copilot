# Database Schema

Music Copilot uses SQLite for local state. No external database dependencies.

## Core Tables

```sql
-- Track analyzed samples and their results
CREATE TABLE samples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    format TEXT NOT NULL,           -- wav, mp3, flac
    bpm REAL,
    key TEXT,                       -- e.g., "Fm"
    scale TEXT,                     -- e.g., "natural_minor"
    length_seconds REAL,
    analyzed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cached chord progressions
CREATE TABLE progressions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL,
    mood TEXT,                      -- emotional, dark, uplifting
    genre TEXT,                     -- techno, house, trance
    chords TEXT NOT NULL,           -- JSON array: ["Fm", "Db", "Ab", "Eb"]
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MIDI export history
CREATE TABLE midi_exports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,             -- chords, melody, bassline, arpeggio
    filepath TEXT NOT NULL,
    parameters TEXT,                -- JSON: generation parameters used
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample library index (Splice scan results)
CREATE TABLE sample_library (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL UNIQUE,
    bpm REAL,
    key TEXT,
    tags TEXT,                      -- JSON array: ["kick", "dark", "techno"]
    genre TEXT,
    length_seconds REAL,
    indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User preferences (key-value store for flexibility)
CREATE TABLE preferences (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Chat history
CREATE TABLE chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,             -- user, assistant
    message TEXT NOT NULL,
    provider TEXT,                  -- which AI provider was used
    model TEXT,                     -- which model
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Database Setup

```python
# backend/app/db/database.py
import sqlite3
from pathlib import Path

DB_PATH = Path("data/db/music_copilot.db")

def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

def init_db():
    conn = get_connection()
    conn.executescript(SCHEMA_SQL)  # CREATE TABLE statements above
    conn.commit()
```

## Key Design Decisions

- **No ORM.** Raw SQLite with `sqlite3.Row` for simplicity and zero dependencies.
- **WAL mode** for concurrent reads during analysis.
- **JSON columns** for flexible data like tags, parameters, and chord lists.
- **Key-value preferences** table to avoid schema migrations for simple settings.
