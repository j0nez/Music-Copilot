import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProjectProvider } from "../store/projectContext";
import Dashboard from "../pages/Dashboard";

vi.mock("../api", () => ({
  getLastProject: vi.fn().mockResolvedValue({ success: true, data: { project: null }, error: null }),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  listProjects: vi.fn().mockResolvedValue({ success: true, data: { projects: [] }, error: null }),
  searchAll: vi.fn().mockResolvedValue({ success: true, data: { results: [] }, error: null }),
  getProject: vi.fn(),
  uploadFile: vi.fn(),
  analyzeSample: vi.fn(),
  theoryEngine: vi.fn(),
  chordGenerator: vi.fn(),
  saveProgression: vi.fn(),
  listProgressions: vi.fn(),
  deleteProgression: vi.fn(),
  exportMidi: vi.fn(),
  downloadMidiUrl: vi.fn(() => ""),
  melodyGenerator: vi.fn(),
  basslineGenerator: vi.fn(),
  exportArrangement: vi.fn(),
  saveArrangement: vi.fn(),
  downloadFromUrl: vi.fn(),
  listProviders: vi.fn().mockResolvedValue({ success: true, data: { providers: [] }, error: null }),
  getChatHistory: vi.fn().mockResolvedValue({ success: true, data: { history: [] }, error: null }),
  clearChatHistory: vi.fn(),
  sendChat: vi.fn(),
}));

describe("Dashboard", () => {
  it("renders without crashing", async () => {
    render(
      <ProjectProvider>
        <Dashboard />
      </ProjectProvider>,
    );

    expect(screen.getByText("Music Copilot")).toBeInTheDocument();
    expect(screen.getByText("v0.1.0")).toBeInTheDocument();
  });

  it("shows create project prompt when no project loaded", async () => {
    render(
      <ProjectProvider>
        <Dashboard />
      </ProjectProvider>,
    );

    expect(screen.getByText("No project loaded")).toBeInTheDocument();
  });

  it("renders all panel titles", async () => {
    render(
      <ProjectProvider>
        <Dashboard />
      </ProjectProvider>,
    );

    expect(screen.getByText("Generate")).toBeInTheDocument();
    expect(screen.getByText("Sample Analysis")).toBeInTheDocument();
    expect(screen.getAllByText("Chat").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("MIDI Player").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Project Summary").length).toBeGreaterThanOrEqual(1);
  });
});
