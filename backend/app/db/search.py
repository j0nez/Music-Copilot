import json
import logging

from backend.app.db.database import get_connection

logger = logging.getLogger("music_copilot.search")

MAX_RESULTS = 20


def search_all(query: str, limit: int = MAX_RESULTS) -> list[dict]:
    raw = f"%{query}%"
    results: list[dict] = []
    conn = get_connection()
    try:
        ideas = conn.execute(
            """SELECT id, 'idea' as source_type, type as subtype, name, data, key, mood, genre, created_at
               FROM ideas
               WHERE name LIKE ? OR key LIKE ? OR mood LIKE ? OR genre LIKE ? OR data LIKE ?
               ORDER BY created_at DESC LIMIT ?""",
            (raw, raw, raw, raw, raw, limit),
        ).fetchall()
        for r in ideas:
            row = dict(r)
            try:
                row["data"] = json.loads(row["data"]) if isinstance(row["data"], str) else row["data"]
            except (json.JSONDecodeError, TypeError):
                row["data"] = {}
            results.append(row)
    except Exception as e:
        logger.error("Search ideas failed: %s", e, exc_info=True)

    try:
        samples = conn.execute(
            """SELECT id, 'sample' as source_type, 'sample' as subtype, filename as name,
                      NULL as data, key, NULL as mood, NULL as genre, created_at
               FROM samples
               WHERE filename LIKE ? OR key LIKE ?
               ORDER BY created_at DESC LIMIT ?""",
            (raw, raw, limit),
        ).fetchall()
        for r in samples:
            results.append(dict(r))
    except Exception as e:
        logger.error("Search samples failed: %s", e, exc_info=True)

    try:
        projects = conn.execute(
            """SELECT id, 'project' as source_type, 'project' as subtype, name,
                      NULL as data, key, NULL as mood, NULL as genre, created_at
               FROM projects
               WHERE name LIKE ? OR key LIKE ?
               ORDER BY created_at DESC LIMIT ?""",
            (raw, raw, limit),
        ).fetchall()
        for r in projects:
            results.append(dict(r))
    except Exception as e:
        logger.error("Search projects failed: %s", e, exc_info=True)

    return results
