from pydantic import BaseModel


class TrackContext(BaseModel):
    bpm: float | None = None
    key: str | None = None
    genre: str | None = None
    energy: float | None = None
    mood: str | None = None


class SampleAnalysisResult(BaseModel):
    bpm: float | None = None
    key: str | None = None
    scale: str | None = None
    length_seconds: float | None = None
    format: str | None = None


class ChordProgression(BaseModel):
    key: str
    chords: list[str]
    mood: str | None = None
    genre: str | None = None


class MidiOutput(BaseModel):
    type: str
    filepath: str
    bpm: float | None = None
    length_bars: int | None = None


class TheoryScale(BaseModel):
    key: str
    scale: str
    notes: list[str]
    intervals: list[str]


class TheoryChord(BaseModel):
    root: str
    quality: str
    notes: list[str]
    function: str | None = None


class TheoryResult(BaseModel):
    scale: TheoryScale | None = None
    chords: list[TheoryChord] = []
    intervals: list[dict] = []


class ArrangementSection(BaseModel):
    label: str
    start_seconds: float
    end_seconds: float | None = None


class TrackAnalysis(BaseModel):
    context: TrackContext = TrackContext()
    sample: SampleAnalysisResult | None = None
    arrangement: list[ArrangementSection] = []
    energy_curve: list[float] = []
