import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MIDIPlayer from "../components/MIDIPlayer";
import type { Note } from "../types";

const noop = () => {};

describe("MIDIPlayer", () => {
  it("renders empty state when no notes", () => {
    render(
      <MIDIPlayer
        chords={[]} melody={[]} bassline={[]}
        bpm={120} bars={8}
        swing={0} onSwingChange={noop}
        onRegenerate={noop}
        onClear={noop}
      />,
    );

    expect(screen.getByText("Generate chords, melody, or bassline to get started")).toBeInTheDocument();
  });

  it("renders play button when chords exist", () => {
    const notes: Note[] = [{ pitch: 60, velocity: 100, start_beat: 1, duration_in_beats: 4 }];
    render(
      <MIDIPlayer
        chords={notes} melody={[]} bassline={[]}
        bpm={120} bars={8}
        swing={0} onSwingChange={noop}
        onRegenerate={noop}
        onClear={noop}
      />,
    );

    expect(screen.getByText(/▶/)).toBeInTheDocument();
  });

  it("shows bar count in title", () => {
    const notes: Note[] = [{ pitch: 60, velocity: 100, start_beat: 1, duration_in_beats: 4 }];
    render(
      <MIDIPlayer
        chords={notes} melody={[]} bassline={[]}
        bpm={120} bars={16}
        swing={0} onSwingChange={noop}
        onRegenerate={noop}
        onClear={noop}
      />,
    );

    expect(screen.getByText(/16 bars/)).toBeInTheDocument();
  });
});
