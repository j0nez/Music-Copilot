import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GeneratePanel from "../components/GeneratePanel";
import type { GeneratorSettings, Note, ProgressionChord } from "../types";

const DEFAULT_SETTINGS: GeneratorSettings = {
  key: "Auto", scale: "major", mood: "Auto", genre: "Auto",
  length: 8, complexity: "Auto",
};

const noop = (..._args: unknown[]) => {};
const noopPushHistory = (_type: 'chords' | 'melody' | 'bassline', _notes: Note[]) => {};

vi.mock("../api", () => ({
  chordGenerator: vi.fn().mockResolvedValue({ success: true, data: { key: "C", chords: [], mood: "uplifting", genre: "house" } }),
  melodyGenerator: vi.fn().mockResolvedValue({ success: true, data: { notes: [], length_bars: 8 } }),
  basslineGenerator: vi.fn().mockResolvedValue({ success: true, data: { notes: [], length_bars: 8 } }),
}));

describe("GeneratePanel", () => {
  it("renders preset chips", () => {
    render(
      <GeneratePanel
        settings={DEFAULT_SETTINGS}
        onChange={noop}
        onGenerateChords={noop as (c: ProgressionChord[], n: Note[], vl: number | undefined) => void}
        onGenerateMelody={noop}
        onGenerateBassline={noop}
        onPushHistory={noopPushHistory}
        disabled={false}
      />,
    );

    expect(screen.getByText("Dark Techno")).toBeInTheDocument();
    expect(screen.getByText("Surprise Me ✨")).toBeInTheDocument();
  });

  it("renders generator settings dropdowns", () => {
    render(
      <GeneratePanel
        settings={DEFAULT_SETTINGS}
        onChange={noop}
        onGenerateChords={noop as (c: ProgressionChord[], n: Note[], vl: number | undefined) => void}
        onGenerateMelody={noop}
        onGenerateBassline={noop}
        onPushHistory={noopPushHistory}
        disabled={false}
      />,
    );

    expect(screen.getAllByRole("combobox").length).toBeGreaterThanOrEqual(5);
  });

  it("renders generate buttons with proper labels", () => {
    render(
      <GeneratePanel
        settings={DEFAULT_SETTINGS}
        onChange={noop}
        onGenerateChords={noop as (c: ProgressionChord[], n: Note[], vl: number | undefined) => void}
        onGenerateMelody={noop}
        onGenerateBassline={noop}
        onPushHistory={noopPushHistory}
        disabled={false}
      />,
    );

    expect(screen.getByText("Chords")).toBeInTheDocument();
    expect(screen.getByText("Melody")).toBeInTheDocument();
    expect(screen.getByText("Bass")).toBeInTheDocument();
  });
});
