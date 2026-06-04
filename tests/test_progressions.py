import json
from pathlib import Path

import pytest

from backend.app.core.config import settings
from backend.app.db.database import init_db
from backend.app.db.progressions import (
    delete_progression,
    list_progressions,
    save_progression,
)


@pytest.fixture
def temp_db(tmp_path: Path):
    original = settings.db_path
    settings.db_path = tmp_path / "test.db"
    init_db()
    yield
    settings.db_path = original


def test_save_and_list_progression(temp_db):
    chords = [
        {"roman": "i", "name": "A", "notes": ["A", "C", "E"], "quality": "minor"},
        {"roman": "VII", "name": "G", "notes": ["G", "B", "D"], "quality": "major"},
    ]
    row_id = save_progression("A minor", "dark", "techno", chords)
    assert row_id > 0

    items = list_progressions()
    assert len(items) == 1
    assert items[0]["key"] == "A minor"
    assert items[0]["mood"] == "dark"
    assert items[0]["genre"] == "techno"
    assert items[0]["chords"] == chords
    assert items[0]["id"] == row_id


def test_list_multiple_progressions(temp_db):
    save_progression("C major", "uplifting", "house", [{"roman": "I", "name": "C", "notes": ["C", "E", "G"], "quality": "major"}])
    save_progression("A minor", "dark", "techno", [{"roman": "i", "name": "A", "notes": ["A", "C", "E"], "quality": "minor"}])
    save_progression("G major", "energetic", "trance", [{"roman": "I", "name": "G", "notes": ["G", "B", "D"], "quality": "major"}])

    items = list_progressions()
    assert len(items) == 3


def test_list_sorted_by_key(temp_db):
    save_progression("C major", "", "", [])
    save_progression("A minor", "", "", [])
    save_progression("G major", "", "", [])

    items = list_progressions(sort_by="key", sort_order="ASC")
    assert items[0]["key"] == "A minor"
    assert items[1]["key"] == "C major"
    assert items[2]["key"] == "G major"

    items = list_progressions(sort_by="key", sort_order="DESC")
    assert items[0]["key"] == "G major"
    assert items[2]["key"] == "A minor"


def test_delete_progression(temp_db):
    row_id = save_progression("C major", "uplifting", "house", [])
    assert delete_progression(row_id) is True
    assert len(list_progressions()) == 0


def test_delete_nonexistent_returns_false(temp_db):
    assert delete_progression(999) is False


def test_list_empty_returns_empty_list(temp_db):
    assert list_progressions() == []


def test_list_invalid_sort_falls_back(temp_db):
    save_progression("C major", "", "", [])
    items = list_progressions(sort_by="invalid_column", sort_order="ASC")
    assert len(items) == 1
