import json
import logging

from backend.app.db.database import get_connection

logger = logging.getLogger("music_copilot.progressions")


def save_progression(key: str, mood: str | None, genre: str | None, chords: list[dict]) -> int:
    conn = get_connection()
    try:
        cur = conn.execute(
            "INSERT INTO progressions (key, mood, genre, chords) VALUES (?, ?, ?, ?)",
            (key, mood, genre, json.dumps(chords, ensure_ascii=False)),
        )
        conn.commit()
        row_id = cur.lastrowid
        logger.info("Saved progression %d: %s / %s / %s", row_id, key, mood, genre)
        return row_id
    finally:
        conn.close()


def list_progressions(
    sort_by: str = "created_at",
    sort_order: str = "DESC",
) -> list[dict]:
    allowed_sort = {"key", "mood", "genre", "created_at"}
    if sort_by not in allowed_sort:
        sort_by = "created_at"
    if sort_order.upper() not in ("ASC", "DESC"):
        sort_order = "DESC"

    conn = get_connection()
    try:
        rows = conn.execute(
            f"SELECT id, key, mood, genre, chords, created_at FROM progressions ORDER BY {sort_by} {sort_order}"
        ).fetchall()
        result = []
        for r in rows:
            row = dict(r)
            row["chords"] = json.loads(row["chords"])
            row["created_at"] = row["created_at"]
            result.append(row)
        return result
    finally:
        conn.close()


def delete_progression(progression_id: int) -> bool:
    conn = get_connection()
    try:
        cur = conn.execute("DELETE FROM progressions WHERE id = ?", (progression_id,))
        conn.commit()
        deleted = cur.rowcount > 0
        if deleted:
            logger.info("Deleted progression %d", progression_id)
        return deleted
    finally:
        conn.close()
