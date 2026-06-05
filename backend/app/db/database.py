import sqlite3
from pathlib import Path

from backend.app.core.config import settings

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS samples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    format TEXT NOT NULL,
    bpm REAL,
    key TEXT,
    scale TEXT,
    length_seconds REAL,
    analyzed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS progressions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL,
    mood TEXT,
    genre TEXT,
    chords TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS midi_exports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    filepath TEXT NOT NULL,
    parameters TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sample_library (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL UNIQUE,
    bpm REAL,
    key TEXT,
    tags TEXT,
    genre TEXT,
    length_seconds REAL,
    indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS preferences (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    message TEXT NOT NULL,
    provider TEXT,
    model TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT 'Untitled Project',
    bpm INTEGER DEFAULT 120,
    key TEXT DEFAULT 'C',
    scale TEXT DEFAULT 'Major',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS arrangements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Arrangement 1',
    bpm INTEGER,
    mood TEXT,
    genre TEXT,
    data TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'progression' CHECK(type IN (
        'progression', 'melody', 'bassline', 'drum_pattern', 'arpeggio', 'phrase'
    )),
    name TEXT,
    data TEXT NOT NULL DEFAULT '{}',
    key TEXT,
    mood TEXT,
    genre TEXT,
    bpm INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""


def init_db() -> None:
    settings.db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = get_connection()
    try:
        conn.executescript(SCHEMA_SQL)
        _migrate_progressions_to_ideas(conn)
        conn.commit()
    finally:
        conn.close()


def _migrate_progressions_to_ideas(conn: sqlite3.Connection) -> None:
    existing = conn.execute("SELECT COUNT(*) FROM ideas").fetchone()[0]
    if existing > 0:
        return

    rows = conn.execute(
        "SELECT id, key, mood, genre, chords, created_at FROM progressions"
    ).fetchall()
    for r in rows:
        conn.execute(
            """INSERT INTO ideas (type, name, data, key, mood, genre, created_at, updated_at)
               VALUES ('progression', ?, ?, ?, ?, ?, ?, ?)""",
            (
                f"Progression {r['id']}",
                r["chords"],
                r["key"],
                r["mood"],
                r["genre"],
                r["created_at"],
                r["created_at"],
            ),
        )


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(settings.db_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn
