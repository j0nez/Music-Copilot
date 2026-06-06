import logging

from backend.app.db.database import get_connection

logger = logging.getLogger("music_copilot.projects")


def create_project(name: str, bpm: int, key: str, scale: str) -> int:
    conn = get_connection()
    try:
        cur = conn.execute(
            "INSERT INTO projects (name, bpm, key, scale) VALUES (?, ?, ?, ?)",
            (name, bpm, key, scale),
        )
        project_id = cur.lastrowid
        conn.execute(
            "INSERT INTO arrangements (project_id, name, data) VALUES (?, 'Arrangement 1', '{}')",
            (project_id,),
        )
        conn.commit()
        logger.info("Created project %d: %s", project_id, name)
        return project_id
    finally:
        conn.close()


def list_projects() -> list[dict]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT id, name, bpm, key, scale, created_at, updated_at FROM projects ORDER BY updated_at DESC, id DESC"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_project(project_id: int) -> dict | None:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id, name, bpm, key, scale, created_at, updated_at FROM projects WHERE id = ?",
            (project_id,),
        ).fetchone()
        if row is None:
            return None
        return dict(row)
    finally:
        conn.close()


def update_project(project_id: int, **kwargs) -> bool:
    allowed = {"name", "bpm", "key", "scale"}
    updates = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
    if not updates:
        return False

    sets = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [project_id]
    conn = get_connection()
    try:
        cur = conn.execute(
            f"UPDATE projects SET {sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            values,
        )
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def delete_project(project_id: int) -> bool:
    conn = get_connection()
    try:
        cur = conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def save_last_project(project_id: int) -> None:
    conn = get_connection()
    try:
        conn.execute(
            "INSERT OR REPLACE INTO preferences (key, value) VALUES ('last_project', ?)",
            (str(project_id),),
        )
        conn.commit()
    finally:
        conn.close()


def get_last_project() -> int | None:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT value FROM preferences WHERE key = 'last_project'"
        ).fetchone()
        if row is None:
            return None
        val = int(row["value"])
        project = get_project(val)
        return project["id"] if project else None
    finally:
        conn.close()
