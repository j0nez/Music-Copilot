from pathlib import Path

import pytest

from backend.app.core.config import settings
from backend.app.db.database import init_db
from backend.app.db.projects import (
    create_project,
    delete_project,
    get_last_project,
    get_project,
    list_projects,
    save_last_project,
    update_project,
)


@pytest.fixture
def temp_db(tmp_path: Path):
    original = settings.db_path
    settings.db_path = tmp_path / "test.db"
    init_db()
    yield
    settings.db_path = original


def test_create_project(temp_db):
    pid = create_project("My Track", 128, "C", "Major")
    assert pid > 0

    project = get_project(pid)
    assert project is not None
    assert project["name"] == "My Track"
    assert project["bpm"] == 128
    assert project["key"] == "C"
    assert project["scale"] == "Major"


def test_create_project_creates_default_arrangement(temp_db):
    pid = create_project("Test", 120, "A", "Minor")
    from backend.app.db.database import get_connection

    conn = get_connection()
    rows = conn.execute(
        "SELECT id, name, data FROM arrangements WHERE project_id = ?", (pid,)
    ).fetchall()
    conn.close()
    assert len(rows) == 1
    assert rows[0]["name"] == "Arrangement 1"


def test_list_projects(temp_db):
    pid1 = create_project("Track 1", 128, "C", "Major")
    pid2 = create_project("Track 2", 140, "D", "Minor")
    pid3 = create_project("Track 3", 174, "F", "Dorian")

    items = list_projects()
    assert len(items) >= 3
    ids = {p["id"] for p in items}
    assert pid1 in ids
    assert pid2 in ids
    assert pid3 in ids


def test_list_projects_ordered_by_updated_at(temp_db):
    create_project("Oldest", 120, "C", "Major")
    pid2 = create_project("Middle", 120, "C", "Major")
    pid3 = create_project("Newest", 120, "C", "Major")

    items = list_projects()
    assert items[0]["id"] == pid3
    assert items[1]["id"] == pid2


def test_get_project_nonexistent(temp_db):
    assert get_project(999) is None


def test_update_project_name(temp_db):
    pid = create_project("Original", 120, "C", "Major")
    updated = update_project(pid, name="Renamed")
    assert updated is True

    project = get_project(pid)
    assert project["name"] == "Renamed"
    assert project["bpm"] == 120


def test_update_project_bpm_and_key(temp_db):
    pid = create_project("Test", 120, "C", "Major")
    updated = update_project(pid, bpm=140, key="D")
    assert updated is True

    project = get_project(pid)
    assert project["bpm"] == 140
    assert project["key"] == "D"
    assert project["scale"] == "Major"


def test_update_project_nonexistent_returns_false(temp_db):
    assert update_project(999, name="Ghost") is False


def test_update_project_no_valid_fields_returns_false(temp_db):
    pid = create_project("Test", 120, "C", "Major")
    assert update_project(pid, invalid_field="value") is False


def test_delete_project(temp_db):
    pid = create_project("To Delete", 120, "C", "Major")
    assert delete_project(pid) is True
    assert get_project(pid) is None


def test_delete_project_cascades_to_arrangements(temp_db):
    pid = create_project("Cascade Test", 120, "C", "Major")
    from backend.app.db.database import get_connection

    conn = get_connection()
    rows_before = conn.execute(
        "SELECT COUNT(*) as cnt FROM arrangements WHERE project_id = ?", (pid,)
    ).fetchone()
    conn.close()
    assert rows_before["cnt"] > 0

    delete_project(pid)

    conn = get_connection()
    rows_after = conn.execute(
        "SELECT COUNT(*) as cnt FROM arrangements WHERE project_id = ?", (pid,)
    ).fetchone()
    conn.close()
    assert rows_after["cnt"] == 0


def test_delete_nonexistent_returns_false(temp_db):
    assert delete_project(999) is False


def test_save_and_get_last_project(temp_db):
    pid = create_project("Last Session", 128, "C", "Major")
    save_last_project(pid)
    assert get_last_project() == pid


def test_get_last_project_none(temp_db):
    assert get_last_project() is None


def test_get_last_project_after_delete(temp_db):
    pid = create_project("Gone", 120, "C", "Major")
    save_last_project(pid)
    delete_project(pid)
    assert get_last_project() is None
