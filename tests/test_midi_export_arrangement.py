import pytest
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def _discover():
    from plugins import discover_plugins
    discover_plugins()
    return


class TestArrangementExport:
    ARRANGEMENT_URL = "/api/arrangement/export"
    PER_PART_URL = "/api/arrangement/per-part"

    def test_export_empty_returns_error(self):
        resp = client.post(self.ARRANGEMENT_URL, json={
            "chords": [],
            "melody": [],
            "bassline": [],
            "bpm": 120,
            "solo": {},
        })
        body = resp.json()
        assert not body["success"]
        assert body["error"]["code"] == "NO_PARTS"

    def test_export_chords_only(self):
        resp = client.post(self.ARRANGEMENT_URL, json={
            "chords": [
                {"pitch": 60, "velocity": 100, "start_beat": 1.0, "duration_in_beats": 4.0},
                {"pitch": 64, "velocity": 90, "start_beat": 1.0, "duration_in_beats": 4.0},
            ],
            "melody": [],
            "bassline": [],
            "bpm": 128,
            "solo": {"chords": True, "melody": False, "bassline": False},
        })
        body = resp.json()
        assert body["success"], f"Export failed: {body}"
        assert "midi_url" in body["data"]
        assert "filename" in body["data"]
        assert body["data"]["filename"].endswith(".mid")

    def test_export_all_parts(self):
        resp = client.post(self.ARRANGEMENT_URL, json={
            "chords": [
                {"pitch": 60, "velocity": 100, "start_beat": 1.0, "duration_in_beats": 4.0},
            ],
            "melody": [
                {"pitch": 72, "velocity": 90, "start_beat": 1.0, "duration_in_beats": 0.5},
                {"pitch": 74, "velocity": 85, "start_beat": 1.5, "duration_in_beats": 0.25},
            ],
            "bassline": [
                {"pitch": 36, "velocity": 105, "start_beat": 1.0, "duration_in_beats": 2.0},
            ],
            "bpm": 140,
            "solo": {"chords": True, "melody": True, "bassline": True},
        })
        body = resp.json()
        assert body["success"], f"Export failed: {body}"
        assert "midi_url" in body["data"]
        assert body["data"]["filename"].endswith(".mid")

    def test_per_part_export(self):
        resp = client.post(self.PER_PART_URL + "?bpm=120", json={
            "part": "melody",
            "notes": [
                {"pitch": 72, "velocity": 100, "start_beat": 1.0, "duration_in_beats": 0.5},
            ],
        })
        body = resp.json()
        assert body["success"], f"Per-part export failed: {body}"
        assert "midi_url" in body["data"]

    def test_per_part_missing_part_returns_error(self):
        resp = client.post(self.PER_PART_URL, json={"notes": []})
        body = resp.json()
        assert not body["success"]
        assert body["error"]["code"] == "INVALID_INPUT"
