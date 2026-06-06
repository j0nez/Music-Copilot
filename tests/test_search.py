from pathlib import Path

import pytest

from backend.app.core.config import settings
from backend.app.db.database import init_db
from backend.app.db.projects import create_project
from backend.app.db.progressions import save_progression
from backend.app.db.search import search_all


@pytest.fixture
def temp_db(tmp_path: Path):
    original = settings.db_path
    settings.db_path = tmp_path / "test.db"
    init_db()
    yield
    settings.db_path = original


def test_search_finds_project_by_name(temp_db):
    create_project("My Demo Track", 128, "C", "Major")
    results = search_all("Demo")
    assert any(r["source_type"] == "project" and "Demo" in (r.get("name") or "") for r in results)


def test_search_finds_idea_by_key(temp_db):
    save_progression("C Major", "uplifting", "house", [{"roman": "I", "name": "C", "notes": ["C4", "E4", "G4"], "quality": "major"}])
    results = search_all("C Major")
    assert any(r["source_type"] == "idea" for r in results)


def test_search_finds_idea_by_name(temp_db):
    save_progression("A Minor", "dark", "techno", [{"roman": "i", "name": "A", "notes": ["A3", "C4", "E4"], "quality": "minor"}], name="Dark Techno Loop")
    results = search_all("Dark Techno")
    assert any("Dark Techno" in (r.get("name") or "") for r in results)


def test_search_empty_query_returns_results(temp_db):
    results = search_all("")
    assert len(results) == 0


def test_search_no_match_returns_empty(temp_db):
    results = search_all("xyznonexistentvalue")
    assert len(results) == 0


def test_search_matches_mood(temp_db):
    save_progression("G Minor", "emotional", "trance", [{"roman": "i", "name": "G", "notes": ["G3", "Bb3", "D4"], "quality": "minor"}])
    results = search_all("emotional")
    assert any(r["source_type"] == "idea" for r in results)


def test_search_limit_respected(temp_db):
    for i in range(30):
        create_project(f"Project {i}", 120 + i, "C", "Major")
    results = search_all("Project")
    assert len(results) <= 20
