import json
import logging

from backend.app.db.database import get_connection

logger = logging.getLogger("music_copilot.progressions")


def save_progression(
    key: str,
    mood: str | None,
    genre: str | None,
    chords: list[dict],
    project_id: int | None = None,
    name: str | None = None,
) -> int:
    conn = get_connection()
    try:
        cur = conn.execute(
            """INSERT INTO ideas (project_id, type, name, data, key, mood, genre)
               VALUES (?, 'progression', ?, ?, ?, ?, ?)""",
            (
                project_id,
                name or "",
                json.dumps(chords, ensure_ascii=False),
                key,
                mood,
                genre,
            ),
        )
        conn.commit()
        row_id = cur.lastrowid
        logger.info("Saved progression %d: %s / %s / %s", row_id, key, mood, genre)
        return row_id
    finally:
        conn.close()


def save_idea(
    idea_type: str,
    key: str,
    mood: str | None,
    genre: str | None,
    data: dict | list,
    project_id: int | None = None,
    name: str | None = None,
    bpm: int | None = None,
    scale: str | None = None,
) -> int:
    conn = get_connection()
    try:
        cur = conn.execute(
            """INSERT INTO ideas (project_id, type, name, data, key, scale, mood, genre, bpm)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (project_id, idea_type, name or "", json.dumps(data, ensure_ascii=False), key, scale, mood, genre, bpm),
        )
        conn.commit()
        row_id = cur.lastrowid
        logger.info("Saved %s id=%d name='%s' project_id=%s key=%s", idea_type, row_id, name or "", project_id, key)
        return row_id
    finally:
        conn.close()


def save_arrangement(
    key: str,
    mood: str | None,
    genre: str | None,
    data: dict,
    project_id: int | None = None,
    name: str | None = None,
    bpm: int | None = None,
    scale: str | None = None,
) -> int:
    conn = get_connection()
    try:
        cur = conn.execute(
            """INSERT INTO ideas (project_id, type, name, data, key, scale, mood, genre, bpm)
               VALUES (?, 'arrangement', ?, ?, ?, ?, ?, ?, ?)""",
            (
                project_id,
                name or "",
                json.dumps(data, ensure_ascii=False),
                key,
                scale,
                mood,
                genre,
                bpm,
            ),
        )
        conn.commit()
        row_id = cur.lastrowid
        logger.info("Saved arrangement %d: %s", row_id, name)
        return row_id
    finally:
        conn.close()


def list_progressions(
    sort_by: str = "created_at",
    sort_order: str = "DESC",
    idea_type: str | None = None,
) -> list[dict]:
    allowed_sort = {"key", "mood", "genre", "created_at", "name"}
    if sort_by not in allowed_sort:
        sort_by = "created_at"
    if sort_order.upper() not in ("ASC", "DESC"):
        sort_order = "DESC"

    type_filter = "WHERE type = ?" if idea_type else ""
    params: list = [idea_type] if idea_type else []

    conn = get_connection()
    try:
        rows = conn.execute(
            f"SELECT id, project_id, type, name, data, key, scale, mood, genre, bpm, created_at FROM ideas {type_filter} ORDER BY {sort_by} {sort_order}",
            params,
        ).fetchall()
        result = []
        for r in rows:
            row = dict(r)
            row["data"] = json.loads(row["data"])
            row["created_at"] = row["created_at"]
            result.append(row)
        return result
    finally:
        conn.close()


def get_progression(progression_id: int) -> dict | None:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id, project_id, type, name, data, key, scale, mood, genre, bpm, created_at FROM ideas WHERE id = ? AND type = 'progression'",
            (progression_id,),
        ).fetchone()
        if row is None:
            return None
        r = dict(row)
        r["data"] = json.loads(r["data"])
        return r
    finally:
        conn.close()


def get_any_idea(idea_id: int) -> dict | None:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id, project_id, type, name, data, key, scale, mood, genre, bpm, created_at FROM ideas WHERE id = ?",
            (idea_id,),
        ).fetchone()
        if row is None:
            return None
        r = dict(row)
        r["data"] = json.loads(r["data"])
        return r
    finally:
        conn.close()


def delete_progression(progression_id: int) -> bool:
    conn = get_connection()
    try:
        cur = conn.execute("DELETE FROM ideas WHERE id = ?", (progression_id,))
        conn.commit()
        deleted = cur.rowcount > 0
        if deleted:
            logger.info("Deleted progression %d", progression_id)
        return deleted
    finally:
        conn.close()
