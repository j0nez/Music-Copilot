from pydantic import BaseModel


class MidiNote(BaseModel):
    pitch: int
    velocity: int = 100
    start_beat: float = 0.0
    duration_beats: float = 1.0


class MidiTrack(BaseModel):
    program: int = 0
    notes: list[MidiNote] = []


class MidiFile(BaseModel):
    tracks: list[MidiTrack] = []
    bpm: int = 120
