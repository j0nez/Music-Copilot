import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProjectSummary from "../components/ProjectSummary";
import type { Note, Project } from "../types";

const noop = (_v: number) => {};

vi.mock("../api", () => ({
  exportArrangement: vi.fn().mockResolvedValue({ success: true, data: { download_url: "/midi/test.mid" } }),
}));

describe("ProjectSummary", () => {
  it("renders empty state when no notes", () => {
    render(
      <ProjectSummary
        project={null} chords={[]} melody={[]} bassline={[]}
        solo={{ chords: true, melody: true, bassline: true }}
        swing={0} onSwingChange={noop}
      />,
    );

    expect(screen.getByText("Chords: —")).toBeInTheDocument();
    expect(screen.getByText("Melody: —")).toBeInTheDocument();
    expect(screen.getByText("Bassline: —")).toBeInTheDocument();
  });

  it("shows parts count when notes exist", () => {
    const notes: Note[] = [{ pitch: 60, velocity: 100, start_beat: 1, duration_in_beats: 4 }];
    render(
      <ProjectSummary
        project={null} chords={notes} melody={[]} bassline={[]}
        solo={{ chords: true, melody: true, bassline: true }}
        swing={0} onSwingChange={noop}
      />,
    );

    expect(screen.getByText("Chords: 1 notes")).toBeInTheDocument();
  });

  it("shows project info when project provided", () => {
    const project: Project = { id: 1, name: "Test", bpm: 128, key: "Am", scale: "Minor", created_at: "", updated_at: "" };
    render(
      <ProjectSummary
        project={project} chords={[]} melody={[]} bassline={[]}
        solo={{ chords: true, melody: true, bassline: true }}
        swing={0} onSwingChange={noop}
      />,
    );

    expect(screen.getByText("Am")).toBeInTheDocument();
    expect(screen.getByText("128")).toBeInTheDocument();
    expect(screen.getByText("Minor")).toBeInTheDocument();
  });

  it("enables download button when notes exist", () => {
    const notes: Note[] = [{ pitch: 60, velocity: 100, start_beat: 1, duration_in_beats: 4 }];
    render(
      <ProjectSummary
        project={null} chords={notes} melody={[]} bassline={[]}
        solo={{ chords: true, melody: true, bassline: true }}
        swing={0} onSwingChange={noop}
      />,
    );

    const btn = screen.getByText("Download MIDI");
    expect(btn).not.toBeDisabled();
  });
});
