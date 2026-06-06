import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MusicTheoryPanel from "../components/MusicTheoryPanel";

vi.mock("../api", () => ({
  theoryEngine: vi.fn().mockResolvedValue({ success: true, data: null, error: null }),
  chordGenerator: vi.fn().mockResolvedValue({ success: true, data: null, error: null }),
  exportMidi: vi.fn(),
  saveProgression: vi.fn(),
}));

describe("MusicTheoryPanel", () => {
  it("renders all four tabs", () => {
    render(<MusicTheoryPanel />);

    expect(screen.getByText("Scale Generator")).toBeInTheDocument();
    expect(screen.getByText("Chord Builder")).toBeInTheDocument();
    expect(screen.getByText("Interval Analyzer")).toBeInTheDocument();
    expect(screen.getByText("Progressions")).toBeInTheDocument();
  });

  it("starts on Scale Generator tab by default", () => {
    render(<MusicTheoryPanel />);

    expect(screen.getByText("Generate scales by key and type.")).toBeInTheDocument();
  });

  it("switches to Chord Builder on click", () => {
    render(<MusicTheoryPanel />);

    fireEvent.click(screen.getByText("Chord Builder"));
    expect(screen.getByText("Build chords by root and quality.")).toBeInTheDocument();
  });

  it("switches to Interval Analyzer on click", () => {
    render(<MusicTheoryPanel />);

    fireEvent.click(screen.getByText("Interval Analyzer"));
    expect(screen.getByText("Find the interval between two notes.")).toBeInTheDocument();
  });

  it("switches to Progressions on click", () => {
    render(<MusicTheoryPanel />);

    fireEvent.click(screen.getByText("Progressions"));
    expect(screen.getByText("Generate progressions by key, mood, genre, length, and complexity.")).toBeInTheDocument();
  });
});
