import logging

from backend.app.db.database import get_connection

logger = logging.getLogger("music_copilot.db.chat")


def save_message(role: str, message: str, provider: str | None = None, model: str | None = None) -> int:
    conn = get_connection()
    try:
        cur = conn.execute(
            "INSERT INTO chat_history (role, message, provider, model) VALUES (?, ?, ?, ?)",
            (role, message, provider, model),
        )
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


def get_history(limit: int = 20) -> list[dict]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT id, role, message, provider, model, created_at FROM chat_history ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
        result = []
        for r in reversed(rows):
            result.append({
                "id": r["id"],
                "role": r["role"],
                "message": r["message"],
                "provider": r["provider"],
                "model": r["model"],
                "created_at": r["created_at"],
            })
        return result
    finally:
        conn.close()


def clear_history() -> None:
    conn = get_connection()
    try:
        conn.execute("DELETE FROM chat_history")
        conn.commit()
        logger.info("Chat history cleared")
    finally:
        conn.close()
