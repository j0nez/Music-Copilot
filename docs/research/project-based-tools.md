# Project-Based Tool Patterns

How DAWs, creative software, and broader applications handle sessions, projects, templates, and state management. Researched 2026-06-04.

**Last updated:** 2026-06-04

---

## 1. FL Studio — Project Model

### File formats
- **`.flp`** (FL Studio Project) — proprietary binary format. Stores patterns, arrangement, mixer settings, plugin state, automation. **Does not embed samples** — references them by path. If a sample is missing on open, FL searches the original folder, then its own sample folders, then browser custom folders. Hold `ESC` during load to skip the search.
- **`.zip`** (Zipped Project Package) — wraps the `.flp` + all referenced samples and presets into a single archive. Used for archiving and transferring projects between systems.

### Project organization
- Projects are saved as single `.flp` files anywhere on disk.
- Users are expected to create their own folder structure (one folder per project).
- **Community best practice:** Each project gets its own folder with subfolders for `Samples/`, `Renders/`, `Presets/`, etc.

### Templates
- Save any `.flp` to a templates folder and reuse it.
- No built-in template manager (unlike Ableton's dedicated Templates section).

### Versioning
- `Ctrl + N` — "Save new version" (sequential: `project 01.flp`, `project 02.flp`, etc.)
- Automatic backups saved to `Documents\Image-Line\FL Studio\Projects\Backup\`
- Per-save incremental versioning is the recommended workflow.

### MIDI / Sync
- External MIDI clock sync available (master or slave).
- VST/AU plugin hosting allows FL Studio to run inside another DAW.
- IL Remote app for wireless controller functionality.

### Key takeaway
The `.flp` + loose samples model means **sample path fidelity is fragile** — a design constraint for any tool that references external media. The `.zip` archive format addresses this for sharing but not for live editing.

---

## 2. Ableton Live — Project Model

### File formats
- **`.als`** (Ableton Live Set) — gzip-compressed XML. Fully parseable and modifiable programmatically (open-source parsers exist). Contains all arrangement data: tracks, clips, devices, automation, tempo, time signature, locators.
- **`.asd`** (Ableton Sample Data) — proprietary binary. Analysis cache: detected BPM, warp markers, waveform peaks. Auto-generated alongside each analyzed sample.
- **`.alp`** (Ableton Live Pack) — archive format for distributing sets, samples, and presets.

### Project structure
```
Project Folder/
├── ProjectName.als          # The Live Set
├── Sample Analysis/         # .asd files (auto-generated)
├── Samples/                 # Recorded/imported audio (optional; often external)
├── ProjectName/             # "Project" is actually a folder containing the .als
│   └── (when "Collect All and Save" is used, samples are copied here)
```

Key distinction: in Ableton, a **Project** is a folder that contains one or more **Live Sets** (`.als` files) plus their resources. Multiple .als files can share a Project folder for versioning or arrangement variants.

### Templates
- **Default Set** — opens on launch. Can be customized (tracks, devices, routing) and saved as default.
- **Template Sets** — multiple named templates accessible from the browser (e.g. "Electronic Production", "Recording Session"). Create via `File > Save Live Set as Template`.

### Fused Session / Arrangement views
- **Session View** — non-linear clip launcher. Clips can be triggered in any order. Scenes group clips together. Used for live performance and idea sketching.
- **Arrangement View** — linear timeline. The final song structure.
- Clips in Session View can be recorded into Arrangement View.

### File management
- "Collect All and Save" copies all external samples into the Project folder, making it self-contained.
- "Manage Files" dialog shows unused files per project for cleanup.
- Analysis files (`.asd`) are auto-generated and cached.
- Decoding cache for compressed audio (MP3, AAC, FLAC) is auto-managed.

### Live Set Export SDK
Ableton provides an **iOS library** (`LiveSetExport`) for programmatic creation of `.als` files. Generates the project folder structure + ALS XML + copies resources. Does not support reading/parsing existing sets.

### Key takeaway
The **Project-folder-contains-one-or-more-Sets** model is worth noting: it allows multiple arrangement variants within the same project context. The gzip-XML format is open and well-understood, making interop possible. The Default Set + Template Sets pattern is a clean onboarding UX.

---

## 3. Broader Creative Software Patterns

### Project as container (Figma, VS Code, Notion)
Creative tools converge on a **folder-based project model**:
- **Figma:** Files live in a workspace. Projects are organizational folders. Design systems (shared components, variables) span multiple files.
- **VS Code:** "Workspace" = a folder (or multi-root folders). `.code-workspace` file stores settings. Project-level config stays in `.vscode/` within the project folder.
- **Notion:** Pages act as containers. No file system — everything is a database entry with relations.

### State management patterns
- **Memento pattern** — snapshot-based state saving (undo/redo). Three roles: Originator (creates snapshots), Memento (opaque state container), Caretaker (manages history stack).
- **Diff-based storage** — only changed attributes are recorded per snapshot (lighter than full clones). Used by git-like state managers.
- **Git-like versioning** — commit-based history with meaningful diffs, not automatic save-everything.

### Folder structure best practices (cross-DAW)
Industry consensus for music project folder organization:
```
Music/
├── Projects/        # DAW session files
│   ├── 2026/
│   │   ├── 2026-01-project-name/
│   │   └── 2026-02-another-project/
├── Bounces/          # Exported audio mixes
├── Stems/            # Per-track exports for collab/mix
├── Samples/          # Sample library (shared across projects)
└── Templates/       # DAW session templates
```

Principle: **organize by type (things that don't change), not by status (things that change constantly).** Track project status in a separate tool (spreadsheet, database), not in the filesystem.

### Creative work is not task work
Creative project management differs from task management:
- Creative work is **iterative**, not linear.
- Rounds and revisions replace binary checkboxes.
- The question is "is it good?" not "is it done?"
- Tools that model rounds and revision history fit better than linear Gantt charts.

---

## 4. DAW Collaboration Patterns

### Cross-DAW handoff (Dry MIDI + Wet Stems)
A common 2026-era collaboration pattern:
1. **MIDI** is shared as standard `.mid` files (DAW-agnostic, no plugin dependencies).
2. **Audio** is shared as stems (individual track renders).
3. Project metadata (BPM, key, arrangement markers) is shared separately (text file, or embedded in file names).

This approach avoids plugin compatibility issues — the most common reason cross-DAW collabs break.

### Ableton Link
Real-time tempo sync over local network. Open protocol. Now used beyond Ableton — available in iOS apps, hardware, and some DAWs. Could be relevant for FL Studio sync in Phase 7.

### DAW Collaboration Framework (DAF)
An evolving standard (submitted 2024 to MIDI Association) for structured multi-DAW collaboration. Still early stage but worth watching for Phase 7+.

---

## 5. Implications for Music Copilot

| Pattern | Source | Apply to Music Copilot |
|---------|--------|----------------------|
| Project as container | Ableton, FL, VS Code, Figma | `projects` table = the container. Everything is within a project. |
| One Project, multiple sets | Ableton | Each project can have multiple saved states / snapshots. |
| "Save New Version" | FL Studio | Sequential versioning for project iterations (`Ctrl+N`). |
| Templates | Ableton | Save any project state as a reusable template (e.g. "House Template", "Dark Techno Template"). |
| Auto-detect + suggest, never overwrite | Ableton `.asd` analysis | Sample analysis suggests BPM/key/mood; user accepts or overrides. |
| Session View (non-linear) | Ableton | Chord Pads are Music Copilot's equivalent — playable cells in any order. |
| Gzip-XML project format | Ableton `.als` | Our SQLite DB is the project file. When we need exportable project files (Phase 7+), a single-file format may be worth considering. |
| Undo/redo via Memento | General software design | Snapshot project state before destructive operations (save progression, delete idea). Store diffs, not full state clones. |
| Organize by type, not status | Mixvisor, community | Our Library already does this (ideas table with `type` field). Keep it. |
| Creative rounds model | Project management theory | Chat history + ideas table naturally tracks iterations. No linear task system needed. |
| Dry MIDI + Wet Stems | Cross-DAW collab | MIDI export is already done. Stem export would be a natural Phase 7 addition. |

### Open questions — answered 2026-06-04

| Question | Answer |
|----------|--------|
| Template system? | Not needed now. Defer to post-v0.1 if requested. |
| Single-file export? | **Yes** — projects should be exportable/backup-able as a single file (`.mcproj` or similar). |
| Snapshots / versioning? | Minimal. One active state per arrangement with a single auto-save. No deep history. |
| Multiple arrangements per project? | **Yes** — like Ableton's "Project folder, multiple Sets" model. A Music Copilot project can have multiple saved Chord Pad states / arrangement variants. Each arrangement shares the project's BPM/key/scale but has its own progression and analysis data. |

**Implementation sketch:**
- `projects` table stores shared metadata (name, BPM, key, scale)
- `arrangements` table (new) stores per-variant state: chord pads, analysis results, mood/genre
- `ideas` (Library) remain cross-project — any arrangement can save to the Library
- Export: serialize project + all arrangements into a single archive (e.g. zip with JSON metadata)
