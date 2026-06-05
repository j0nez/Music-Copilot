# FL Studio Integration & VST Plugin Development

FL Studio integration approaches for Music Copilot. Covers the built-in Python API, virtual MIDI ports, remote control bridges, JUCE-based VST3 plugins, and browser-to-DAW drag-and-drop.

**Last updated:** 2026-06-05 (Splice Bridge case study added)

## Overview

FL Studio is the primary DAW target for Music Copilot. Integration spans multiple layers of depth, from simple drag-and-drop MIDI file export to deep bidirectional communication via a custom VST3 plugin. This document evaluates each layer for feasibility, effort, and Music Copilot's needs.

---

## 1. FL Studio Python MIDI Controller Scripting API

### Architecture

FL Studio has a built-in Python scripting engine for MIDI controller support. Scripts are placed in `...\Documents\Image-Line\FL Studio\Settings\Hardware\<devicename>\device_<devicename>.py` and appear as a selectable device in FL Studio's MIDI Settings.

| Property | Value |
|----------|-------|
| Language | Python 3.6+ (bundled with FL Studio) |
| API version | ~22 (varies by FL Studio version) |
| Modules | 14 (transport, mixer, channels, arrangement, patterns, playlist, device, ui, general, plugins, screen, launchMapPages, utils, callbacks) |
| Total functions | 427+ |
| Script location | `Documents\Image-Line\FL Studio\Settings\Hardware\` |
| Naming convention | `device_<name>.py` (mandatory prefix `device_`) |
| Entry point | `# name=<devicename>` in first line |

### Callback System

```python
def OnInit():
    """Called when script starts / device is selected."""
    pass

def OnDeInit():
    """Called when script stops / device is deselected."""
    pass

def OnMidiMsg(event):
    """Called for all incoming MIDI messages (notes, CC, pitch bend)."""
    pass

def OnNoteOn(event):
    """Called specifically for note-on messages."""
    pass

def OnNoteOff(event):
    """Called specifically for note-off messages."""
    pass

def OnControlChange(event):
    """Called specifically for CC messages."""
    pass

def OnPitchBend(event):
    """Called for pitch bend events."""
    pass

def OnRefresh(flags):
    """Called when FL Studio's internal state changes."""
    pass

def OnIdle():
    """Called during idle time — used for polling or UI updates."""
    pass

def OnUpdateMidiLEDs():
    """Called when script should update hardware LEDs."""
    pass
```

### Available Modules

| Module | Functions | Controls |
|--------|-----------|----------|
| `transport` | 20 | Play, stop, record, position, tempo, looping |
| `mixer` | 69 | Track volume/pan/mute/solo, EQ, routing, effects |
| `channels` | 48 | Channel rack, grid bits, step sequencer, notes |
| `arrangement` | 23 | Arrangement view, track selection |
| `patterns` | 35 | Pattern selection, cloning, naming |
| `playlist` | 18 | Playlist tracks, clips, arrangement |
| `device` | 25 | MIDI port configuration, LED feedback |
| `ui` | 30 | Hint messages, window management, menu items |
| `general` | 12 | API version, global settings, user data paths |
| `plugins` | 50+ | Plugin parameter access, preset navigation |
| `screen` | 8 | Screen coordinates, DPI awareness |
| `launchMapPages` | 5 | LaunchPad-specific grid control |
| `utils` | 10 | Utility functions (math, MIDI helpers) |
| `callbacks` | ~80 | Event handler registration for advanced use |

### Strengths for Integration

- **Direct DAW control**: Can start/stop transport, change patterns, adjust mixer volumes, arm tracks, add notes to piano roll.
- **Bidirectional**: FL Studio can send data back to external devices via MIDI output (LEDs, display text).
- **No external dependencies**: Python interpreter is bundled with FL Studio — scripts work on any installation.
- **FL Studio API Stubs**: Official `FL-Studio-API-Stubs` package on PyPI (maintained by Image-Line) provides intellisense and type hints. `pip install FL-Studio-API-Stubs`.
- **Universal Controller Script**: MaddyGuthridge's open-source framework (1,397 commits, GPL-3.0) provides device abstraction, LED management, and plugin control — useful reference architecture.

### Limitations

- **No audio access**: Scripts cannot read/write audio streams. MIDI and control data only.
- **No filesystem access**: Cannot read/write arbitrary files from the script context.
- **No network access**: Scripts cannot make HTTP requests or open sockets directly.
- **Single-threaded**: All callbacks execute on FL Studio's main thread — blocking will freeze the UI.
- **No GUI**: Scripts cannot create windows or custom UI elements.
- **Hardware-focused design**: Intended for MIDI controller support, not as a general automation API.
- **No direct VST3 plugin parameter introspection**: Must use `plugins.getParamName()` etc. via known index.
- **Unloading/rescan**: Changing scripts requires restarting or re-selecting the device in MIDI settings.

### Two-File Architecture Pattern

Community convention (from NFXTemplate and Universal Controller Script) separates device registration from logic:

```
MusicCopilot/
  device_MusicCopilot.py     # FL Studio entry point (thin wrapper)
  main.py                    # Actual logic (imported by device file)
```

The `device_` file implements callbacks that delegate to `main.py` functions. This allows modifying logic without changing the FL Studio-facing interface.

---

## 2. Piano Roll Scripting

### Architecture

Separate from MIDI Controller Scripting. Piano Roll scripts are invoked once per activation from FL Studio's Tools > Scripts menu.

| Property | Value |
|----------|-------|
| Modules | `flpianoroll`, `enveditor` |
| Execution | Runs once when invoked by user |
| Access | Note properties, markers, selection, score data |

### Capabilities

```python
import flpianoroll

score = flpianoroll.score()

# Iterate and modify notes
for note in score.notes:
    note.velocity = int(note.velocity * 1.1)  # Increase velocity
    note.pitch += 2  # Transpose up a whole step

# Access selection
selection = flpianoroll.getSelection()
for note in selection:
    note.start += 10  # Nudge note position
```

### Relevance to Music Copilot

- Can programmatically generate or modify MIDI notes in the piano roll from a script.
- Limited by manual invocation — no real-time or automated triggering without user action.
- Could be used for "Finish My Idea" feature (analyze existing notes → suggest modifications).

---

## 3. Edison Audio Scripting

| Property | Value |
|----------|-------|
| Module | `enveditor` |
| Execution | Runs once within Edison's context |
| Access | Audio sample data, envelopes, markers |

### Capabilities

- Access audio sample data buffers.
- Read/write automation envelopes.
- Detect zero-crossings, slice points, region markers.

### Relevance to Music Copilot

- Limited use case for MVP. Could be used in Phase 6 (Sample Library Intelligence) for sample slicing and analysis within FL Studio.
- Sample Analyzer plugin already handles audio analysis outside FL Studio — this would be an alternative entry point if audio is already in Edison.

---

## 4. Flapi — Remote Control Server

| Property | Value |
|----------|-------|
| URL | https://github.com/MaddyGuthridge/Flapi |
| Stars | 47 |
| License | MIT |
| Status | **Unmaintained** (per author's statement) |
| Approach | MIDI scripting server + loopMIDI |

### Architecture

Flapi is a remote control server that bridges external Python code to FL Studio's MIDI Controller Scripting API:

```
┌─────────────┐     loopMIDI      ┌───────────────────┐
│  External    │ ◄──────► │  FL Studio          │
│  Python App  │  virtual MIDI    │  Flapi Server      │
│  (flapi pkg) │     ports        │  (device script)   │
└─────────────┘                   └───────────────────┘
```

### How It Works

1. **FL Studio side**: A `device_Flapi_Request.py` script runs inside FL Studio as a MIDI controller script. It listens on a loopMIDI port named "Flapi Request".
2. **External side**: The `flapi` Python package modifies FL Studio API stub functions to serialize call info and send it via MIDI.
3. **Communication**: MIDI SysEx messages carry serialized function calls (module, function, args) and return values.
4. **Two ports**: "Flapi Request" (external → FL) and "Flapi Response" (FL → external).

### Setup Requirements

- loopMIDI (Windows) or IAC Driver (macOS) for virtual MIDI ports.
- `pip install flapi` and `flapi install` to deploy the server script.
- Two loopMIDI ports: "Flapi Request" and "Flapi Response".
- FL Studio MIDI settings: configure input/output ports with matching numbers.

### Capabilities

```python
import flapi

flapi.enable()

# Control FL Studio remotely
import transport
transport.start()  # Start playback

import mixer
mixer.setTrackVolume(0, 0.8)  # Set master volume

import ui
ui.setHintMsg("Hello from Music Copilot!")
```

### Limitations

- **Unmaintained**: Author explicitly states the project is no longer maintained. Latest code is mid-refactor.
- **Fragile**: Relies on MIDI SysEx for serialization — limited message size, potential for corruption.
- **Latency**: MIDI bandwidth constraints mean complex operations are slow.
- **Windows**: Requires loopMIDI installation (third-party dependency).
- **FL Studio must be running**: No headless operation.

### Derivatives

- **FL Studio MCP Server** (karl-andres/fl-studio-mcp, 10 stars): An MCP (Model Context Protocol) server that builds on similar concepts to enable AI assistants (Claude, etc.) to control FL Studio. Uses the same loopMIDI + MIDI scripting approach. Also unmaintained but demonstrates the pattern.
- **fruityloops-mcp** (quinnjr): Another MCP server with a `flapi_bridge` module for communicating via Flapi.

### Relevance to Music Copilot

- **Architecture reference only** — not suitable for production use due to unmaintained status and fragility.
- The MIDI-scripting-server pattern is valuable but needs a more robust transport layer.
- Could be re-implemented with WebSocket transport instead of MIDI SysEx, using a custom FL Studio script that communicates via a local file or named pipe.

---

## 5. Virtual MIDI Ports

### loopMIDI (Current Standard)

| Property | Value |
|----------|-------|
| URL | https://www.tobias-erichsen.de/software/loopmidi.html |
| Version | 1.0.16.27 |
| License | Freeware |
| Platform | Windows 7–10 (Windows 11 25H2 has compatibility issues) |

**Key features:**
- Creates virtual loopback MIDI ports for inter-application MIDI communication.
- Ports exist only while loopMIDI is running (system tray app).
- Each port is unique per Windows user session.
- Uses Tobias Erichsen's `virtualMIDI` kernel driver.

**Known issues:**
- Windows 11 25H2 (2026) introduced a new MIDI stack that caused loopMIDI ports to disappear. Fixed by Microsoft via Windows Update (KB5053598), but some users still report issues.
- SysEx corruption reported after system restart (Morningstar Editor issue).
- Some users report BSOD on driver loading with certain hardware configurations.

### Windows MIDI Services (New — 2026)

| Property | Value |
|----------|-------|
| Status | Rolling out with Windows 11 26H1 (Feb 2026) |
| MIDI 2.0 support | Yes |
| Built-in loopback | Yes |
| Multi-client | Yes (all devices, even MIDI 1.0) |
| API | New WinRT API + backwards-compatible WinMM/WinRT |

**Key features:**
- **Built-in virtual loopback MIDI**: No third-party tools needed for app-to-app MIDI.
- **Multi-client by default**: Multiple apps can use the same MIDI device simultaneously.
- **MIDI 2.0**: Higher resolution, faster transport, bidirectional communication.
- **PowerShell scripting**: Built-in MIDI scripting via PowerShell cmdlets.
- **Lower jitter**: Timestamp-based message scheduling.
- **Better tooling**: `midi.exe` CLI + MIDI Settings GUI app.

**Rollout status (June 2026):**
- Phased rollout via KB update starting January 2026.
- Some compatibility issues with specific hardware/software that are being resolved.
- Steinberg, Image-Line, and other DAW vendors working on compatibility updates.
- Known issue: Certain inMusic brand drivers (M-Audio, AKAI) cause `midisrv` crashes — workaround is driver update or disabling Windows MIDI Services.

**Relevance to Music Copilot:**
- **Game-changer for Windows integration**: Eliminates the need for loopMIDI once FL Studio and all hardware drivers support it.
- Built-in virtual loopback means Music Copilot can connect to FL Studio without third-party software.
- Still in early rollout — expect stability improvements through 2026.
- Music Copilot should support both loopMIDI (current) and Windows MIDI Services (future) backends.

### Other Options

| Tool | Description | Relevance |
|------|-------------|-----------|
| **MIDI Yoke** | Older virtual MIDI driver, unmaintained since 2010 | Not recommended |
| **LoopBe1** | Simple single-port virtual cable, works on Win11 | Minimal alternative to loopMIDI |
| **virtualMIDI SDK** | Low-level SDK for creating custom virtual MIDI drivers | Overkill for Music Copilot |
| **RTP-MIDI** | Network MIDI over IP, native on macOS | Complicated setup on Windows |

---

## 6. JUCE-Based VST3 Bridge Plugin

### JUCE Framework Overview

| Property | Value |
|----------|-------|
| URL | https://github.com/juce-framework/JUCE |
| Stars | 7,500+ |
| License | Proprietary (free for open source, paid for commercial) |
| Language | C++17/20 |
| Supported formats | VST3, AU, AUv3, AAX, LV2 |
| Supported platforms | Windows, macOS, Linux, iOS, Android |
| Build tools | CMake (recommended) or Projucer |
| Key modules | `juce_audio_processors`, `juce_audio_basics`, `juce_gui_basics` |

### Architecture for a Bridge Plugin

A JUCE-based bridge plugin would act as a bidirectional communication gateway between FL Studio and Music Copilot's backend:

```
┌──────────────────────────────────────────────────────────┐
│  FL Studio                                              │
│  ┌────────────────────────────────────┐                 │
│  │  Music Copilot Bridge (VST3)       │                 │
│  │  ┌─────────────┐  ┌────────────┐  │                 │
│  │  │ Audio Input │  │ MIDI I/O   │  │                 │
│  │  │ (from DAW)  │  │ (to DAW)   │  │                 │
│  │  └──────┬──────┘  └─────┬──────┘  │                 │
│  │         │               │         │                 │
│  │  ┌──────┴───────────────┴──────┐  │                 │
│  │  │  Communication Layer        │  │                 │
│  │  │  (WebSocket / Named Pipe)   │  │                 │
│  │  └──────────────┬──────────────┘  │                 │
│  └─────────────────┼─────────────────┘                 │
└────────────────────┼───────────────────────────────────┘
                     │
                     │ localhost WebSocket
                     │
┌────────────────────┼───────────────────────────────────┐
│  Music Copilot     │  (Electron / FastAPI)              │
│  ┌─────────────────┴──────────────────┐                 │
│  │  Bridge Client (TypeScript/Python) │                 │
│  └────────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. AudioProcessor (PluginProcessor)
- Audio input: Capture master output or individual track audio from FL Studio.
- MIDI output: Send MIDI notes, CC, pitch bend to FL Studio's sequencer.
- MIDI input: Receive MIDI from FL Studio (notes played, controller movements).
- Parameter handling: Expose configurable parameters (host, port, buffer size).

#### 2. Communication Layer
- **WebSocket** (recommended): Persistent bidirectional connection. Low latency on localhost.
- **Named Pipes** (Windows alternative): Lower overhead but Windows-specific.
- **Shared Memory**: Highest performance but most complex.

#### 3. MIDI Message Handling
- Convert incoming WebSocket messages to `MidiBuffer` for DAW output.
- Send incoming DAW MIDI events back to Music Copilot via WebSocket.

### Reference Projects

| Project | Description | Stars |
|---------|-------------|-------|
| **Magenta DDSP-VST** | Real-time DDSP neural synth/effect as VST3/AU | ~400 |
| **RAVE VST** | Real-time audio processing with neural networks | ~300 |
| **Vocal2MIDI Live** | Real-time voice-to-MIDI VST3 plugin | Active |
| **MIDI Agent** | Commercial AI MIDI generator VST3 plugin | N/A (commercial) |
| **Arpligner** | Multi-track polyphonic arpeggiator plugin | 43 |
| **SmartGuitarAmp** | Neural network guitar amp simulator | 1,300 |

### Development Timeline Estimate

| Phase | Scope | Estimated Effort |
|-------|-------|------------------|
| Proof of concept | Simple VST3 that passes MIDI through WebSocket | 2–4 weeks |
| Alpha | Bidirectional MIDI, basic parameter sync | 4–8 weeks |
| Beta | Audio streaming, stable communication, error handling | 8–12 weeks |
| Production | Full feature set, optimization, testing across DAWs | 12–16 weeks |

### Key Challenges

1. **VST3 MIDI limitations**: VST3 has no native MIDI port support — MIDI is passed via `process()` as `MidiBuffer`. Steinberg has explicitly stated they will not add MIDI support to VST3. Workarounds:
   - Use CLAP format (supports MIDI natively) in addition to VST3.
   - Use silent audio channels as MIDI carriers.
   - Accept MIDI limitations and focus on parameter automation instead.

2. **Real-time audio processing**: Audio callbacks run on a real-time thread. No blocking calls allowed — all external communication must be non-blocking.

3. **Cross-DAW compatibility**: FL Studio handles plugins differently than Ableton or Cubase. Testing required for each.

4. **C++ expertise**: JUCE development requires C++17 knowledge. Music Copilot's current stack is Python/TypeScript.

### Alternatives to Full VST3 Plugin

- **Virtual MIDI port + MIDI scripting**: Already possible today, no C++ needed. See Flapi architecture.
- **CLAP format**: Supports native MIDI I/O. Growing adoption (Bitwig, Reaper, FL Studio in progress). Could be an alternative to VST3 for MIDI-focused plugins.
- **Standalone application**: Run Music Copilot alongside FL Studio, communicate via loopMIDI / Windows MIDI Services. No plugin needed for MVP.

---

## 7. Browser-to-DAW Drag-and-Drop

### Current Approach (v0.1)

Music Copilot already supports drag-and-drop MIDI export from the browser to FL Studio. The implementation uses the HTML5 Drag and Drop API with `text/uri-list` data type:

```typescript
// Existing approach: download link with drag-handler
const handleDragStart = (e: React.DragEvent, filename: string) => {
    e.dataTransfer.setData('text/uri-list', 
        `http://localhost:8000/api/exports/${filename}`);
};
```

### How FL Studio Handles MIDI Drag-and-Drop

- FL Studio accepts `.mid` files dropped from Windows File Explorer or a browser.
- The drop places the MIDI file into the Channel Rack (if pattern view) or as an audio clip (if playlist view).
- FL Studio copies the file to its own internal storage — it doesn't stream from the original URL.
- This means a static MIDI file download URL works perfectly.

### Requirements for Reliable Drag-and-Drop

1. **CORS headers**: Backend must allow cross-origin requests from the Electron app.
2. **Content-Type**: Serve `.mid` files with `audio/midi` or `application/octet-stream` MIME type.
3. **Direct download**: The URL must be a direct download (no redirect, no auth page).
4. **Filename**: Include a meaningful filename in the `Content-Disposition` header (e.g., `my-progression-C-major.mid`).

### Advanced Drag-and-Drop Options

| Approach | Description | When to Use |
|----------|-------------|-------------|
| **Static URL** | Serve MIDI file at predictable URL, drag from browser | v0.1 — already implemented |
| **Blob URL** | Create `URL.createObjectURL(blob)` for in-memory MIDI | v0.2 — faster, no server round-trip |
| **File System Access API** | Write directly to user's file system via `showSaveFilePicker` | Phase 7 — seamless save without "Save As" dialog |
| **Custom protocol** | Register `midi://` protocol handler | Phase 7 — deep integration |

---

## 8. Integration Architecture — Tiered Approach

Based on this research, Music Copilot should implement FL Studio integration in phases:

### Tier 1 — Simple MIDI Export (v0.1 — Done)
- Generate `.mid` files on the backend.
- Serve via REST endpoint.
- Drag-and-drop from browser to FL Studio Channel Rack.
- **Effort**: Already implemented. Zero FL Studio-specific code needed.

### Tier 2 — Live MIDI Output (Phase 2–3)
- Backend writes MIDI to a virtual MIDI port (loopMIDI).
- FL Studio reads from the same port.
- User enables a MIDI controller script to route Music Copilot's MIDI into the project.
- **Effort**: Low. Python `python-rtmidi` or `mido` can write to loopMIDI ports.
- **No C++/JUCE required**.

### Tier 3 — Remote DAW Control (Phase 4–5)
- Custom FL Studio MIDI Controller Script (`device_MusicCopilot.py`) that:
  - Receives commands via loopMIDI / Windows MIDI Services.
  - Controls transport, mixer, pattern selection.
  - Reports FL Studio state (current BPM, playing status).
- Backend communicates with the script via a protocol layered on MIDI SysEx or CC messages.
- **Effort**: Medium. Python scripting within FL Studio's API.
- **No C++/JUCE required**.

### Tier 4 — VST3 Bridge Plugin (Phase 7+)
- Full JUCE-based VST3 plugin for deep integration:
  - Audio streaming from FL Studio to Music Copilot.
  - Bidirectional MIDI with low latency.
  - Real-time analysis and feedback.
- **Effort**: High (2–4 months). Requires C++/JUCE expertise.
- **Only if Tier 2/3 prove insufficient**.

### Tier 5 — CLAP Plugin (Future)
- Follows same architecture as Tier 4 but uses CLAP format.
- Benefits: Native MIDI I/O, open standard, growing DAW support.
- Effort similar to VST3 but without MIDI workarounds.

### Current Recommendation

**Skip Tier 4 (VST3) for now.** Tiers 1–3 provide 90% of the value with 10% of the effort. The VST3 bridge should only be built if:
1. Users need real-time audio streaming into Music Copilot (for analysis).
2. The MIDI scripting approach proves too slow or unreliable.
3. Music Copilot has a dedicated C++ developer on the team.

---

## 9. Key Open Source References

| Project | Description | Relevance |
|---------|-------------|-----------|
| **FL-Studio-API-Stubs** | Official Image-Line API stubs for intellisense | Essential reference for any FL scripting |
| **Universal Controller Script** | Framework for FL MIDI controller integration | Architecture reference for Tier 3 script |
| **Flapi** | Remote control server via MIDI scripting | Architecture reference only (unmaintained) |
| **FL Studio MCP Server** | AI assistant DAW control | Reference for Tier 3 protocol design |
| **NFXTemplate** | Starter template for FL MIDI scripts | Two-file architecture pattern |
| **JUCE Framework** | C++ framework for VST3/AU/AAX | Required for Tier 4 |
| **awesome-juce** (sudara) | Curated list of JUCE resources | Reference for existing open-source plugins |
| **python-rtmidi** | Python MIDI I/O library | Required for Tier 2 virtual MIDI output |
| **mido** | Python MIDI message library | Alternative to python-rtmidi, simpler API |
| **pyfluidsynth** | FluidSynth bindings for MIDI rendering | MIDI preview/audition without external synth |

---

## 10. Case Study: Splice Bridge Plugin Architecture

Splice Bridge is a production-proven example of the exact kind of DAW integration plugin we've been designing. It's been in active use since 2021 (current version 5.1.1) and has evolved through three distinct architectural generations. This section reverse-engineers its architecture, compares it to Music Copilot's proposed VST3 bridge, and extracts actionable lessons.

### How Splice Bridge Works

Splice Bridge is not a single plugin — it's a **two-process system**:

```
┌────────────────────────────────────────────────────────────────┐
│  Splice Desktop App (Electron)                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Sample browser (React UI)                               │  │
│  │  Local SQLite sample cache                               │  │
│  │  Cloud sync engine (sample download, auth, licensing)    │  │
│  │  Audio engine (time-stretch, pitch-shift via Dirac LE)   │  │
│  │  Plugin communication layer (IPC to VST3/AU)             │  │
│  └──────────────────────┬───────────────────────────────────┘  │
└─────────────────────────┼──────────────────────────────────────┘
                          │ local IPC (named pipe / socket)
                          │
┌─────────────────────────┼──────────────────────────────────────┐
│  DAW (FL Studio, etc.)  │                                      │
│  ┌──────────────────────┴───────────────────────────────────┐  │
│  │  Splice Bridge VST3 / AU plugin (JUCE-based)            │  │
│  │  ┌─────────────────────────────────────────────────┐    │  │
│  │  │  Audio input from DAW (master mix)              │    │  │
│  │  │  Tempo / transport sync from DAW host           │    │  │
│  │  │  MIDI passthrough (keyboard note preview)       │    │  │
│  │  │  IPC client → Splice Desktop App                │    │  │
│  │  └─────────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

**Flow for a typical operation:**
1. User loads Splice Bridge VST3 on a MIDI track in DAW
2. VST3 reads host tempo + transport position via VST3 host callbacks
3. VST3 sends tempo/key info to Splice Desktop App via IPC (named pipe on Windows)
4. User clicks a sample in the Splice Desktop App
5. App sends audio stream back to VST3 (which plays it through the DAW's mixer)
6. VST3 applies time-stretch/pitch-shift in real-time during playback
7. User drags sample from Desktop App into DAW — or clicks "Copy modified sample" and pastes

**Key architectural details (reverse-engineered from behavior):**
- **Audio routing**: The VST3 receives audio from Splice Desktop (not from the DAW's own tracks). It acts as a sample playback instrument, not an effect.
- **Tempo sync**: VST3 reads host tempo from the VST3 `ProcessContext` structure and relays it to the Desktop App via IPC. The Desktop App's audio engine time-stretches on the fly.
- **Key detection**: Samples have metadata key tags from Splice's database. The Desktop App transposes on output based on user's key setting.
- **Copy modified sample**: The Desktop App renders the sample offline with time-stretch + transpose applied, writes it to a temp file, and copies to clipboard as `CF_WAVE` / file drop.

### Gen 1: Splice Bridge (2021–2025)

| Property | Detail |
|----------|--------|
| Formats | VST3, AU |
| UI | Splice Desktop App (Electron) — browser/preview UI outside DAW |
| Audio sync | VST3 reads host tempo via ProcessContext → IPC to Desktop App |
| Sample playback | Desktop app streams PCM audio to VST3 via IPC, VST3 outputs to DAW mixer |
| Drag-and-drop | From Desktop App to DAW (browser-style HTML5 drag) |
| Copy/paste | Desktop app renders modified sample → clipboard |
| DAW support | All major DAWs via VST3/AU (FL Studio, Ableton, Logic, Cubase, Studio One) |

**Technical highlights:**
- JUCE-based VST3/AU: Plugin is a thin IPC relay — no audio processing, no UI, no complex DSP. It's essentially a "remote control" that bridges the Desktop App to the DAW.
- Plugin has no visible GUI of its own — all user interaction happens in the Desktop App.
- The plugin is intentionally minimal: hostname + port config, tempo relay, audio relay. ~95% of logic lives in the Electron app.
- Author model: Plugin checks license via Desktop App every 3 days (OS-level auth token).

**Known issues with FL Studio:**
- Performance problems (glitches, timing errors, crashes) — Splice officially recommends enabling "Use fixed size buffers" in FL Studio's plugin wrapper settings.
- Some users report that the Bridge VST must be clicked/activated before the Desktop App will start auditioning samples.
- General VST3 MIDI instrument hosting quirks specific to FL Studio's plugin bridge (not to be confused with a VST bridge — FL Studio's internal plugin hosting architecture).

### Gen 2: Native DAW Integrations (2025–2026)

Starting in 2025, Splice moved beyond the plugin approach and negotiated **native integrations** directly inside DAWs:

| DAW | Version | Partnership Level |
|-----|---------|-------------------|
| **Ableton Live** | 12.3+ (Nov 2025) | Full SDK integration — Splice browser as native sidebar panel |
| **Pro Tools** | 2025.6+ (Aug 2025) | Full SDK integration — Splice as built-in browser tab |
| **Fender Studio One** | Pro 7+ | Full SDK integration — Splice as built-in browser |

These native integrations bypass the VST3 plugin entirely. Splice appears as a **first-class panel** in the DAW's native UI, rendered via Edge WebView2 (Ableton) or similar embedded web views. Benefits:
- No plugin latency or compatibility issues
- Native DAW drag-and-drop (no IPC hop)
- Better performance (DAW manages audio directly)
- Deeper integration (stem separation + Splice in Ableton 12.3)

**Key insight**: Splice achieved native DAW integration through direct commercial partnerships, not through a VST3 bridge. They built Bridge first (Gen 1) as a universal fallback, then used it to prove demand and negotiate native integrations.

### Gen 3: Splice Sounds Plugin (2026 Beta)

April 2026: Splice released the **Splice Sounds Plugin** — a new VST3/AU that brings the *full browse experience inside the DAW* (unlike Gen 1 Bridge which kept browsing in the Desktop App):

| Feature | Gen 1: Bridge | Gen 3: Sounds Plugin |
|---------|---------------|----------------------|
| UI location | Desktop App (outside DAW) | Inside DAW (plugin GUI) |
| Search | Desktop App | Plugin itself |
| Sample preview | Via IPC to DAW | Native plugin audio output |
| Drag-and-drop | From Desktop App | From plugin window |
| Variations (AI) | No | Yes |
| Search with Sound | No | Yes (upload audio → find matching samples) |
| Describe a Sound (AI) | No | Yes (describe sound in words → AI search) |

The Sounds Plugin represents a **full-circle evolution**: Gen 1 used an external app to keep the plugin simple; Gen 3 puts everything inside the plugin but uses the Desktop App as the backend engine. The communication architecture is similar — IPC between plugin and desktop app — but the plugin now renders a full WebView UI.

### Comparison to Music Copilot's Proposed VST3 Bridge

| Aspect | Splice Bridge | Music Copilot (Proposed) |
|--------|---------------|--------------------------|
| **Plugin format** | VST3, AU | VST3 (proposed) |
| **Framework** | JUCE (confirmed — Splice listed on JUCE website as user) | JUCE (proposed) |
| **Communication** | Named pipe IPC | WebSocket (proposed) |
| **Plugin complexity** | Thin IPC relay + audio passthrough | IPC relay + MIDI output + audio input |
| **UI** | Desktop App (Electron) or WebView within plugin | Electron app (existing) |
| **Plugin GUI** | None (Gen 1) or WebView (Gen 3) | None — all UI in Electron |
| **Audio direction** | Desktop → DAW (sample playback only) | DAW → Desktop (for analysis) + Desktop → DAW (for preview) |
| **MIDI direction** | DAW → Desktop (keyboard input for note preview) | Desktop → DAW (MIDI generation) |
| **Tempo sync** | VST3 reads ProcessContext | VST3 reads ProcessContext (or manual user input) |
| **Licensing** | Auth token every 3 days | N/A (open source) |
| **DAW-specific issues** | FL Studio needs fixed-size buffers | Expected similar issues |
| **Maturity** | Production (5 years, 5.1.1) | Design phase |

### Key Differences and Implications

1. **Simpler scope**: Splice Bridge only streams audio *into* the DAW. Music Copilot needs to stream audio *out of* the DAW (for real-time analysis) and MIDI *into* the DAW (for Arrangement generation). This is a fundamentally harder problem — audio output from DAW requires capturing the master mix or individual track outputs in real time.

2. **JUCE is proven**: Splice (listed as a JUCE user on juce.com) builds their VST3 with JUCE. This confirms JUCE is capable of production-grade DAW bridge plugins — the framework is not a theoretical limitation.

3. **IPC via named pipes**: Splice uses Windows named pipes for IPC (inferred from low-latency requirements and Windows-first architecture). This is a simpler, lower-overhead alternative to WebSocket for localhost communication. Consider named pipes over WebSocket for Gen 4/5.

4. **Desktop app as main process architecture**: Splice's architecture confirms our proposed design — Electron desktop app as the main process, thin VST3 as IPC relay. The VST3 shouldn't do anything beyond pass data between the DAW and the desktop app.

5. **Native DAW integration is the endgame**: Splice's Gen 2 integrations prove that the most seamless user experience comes from partnerships with DAW vendors, not VST3 plugins. Music Copilot should follow the same strategy: build the VST3 bridge (Tier 4) as a universal fallback, then pursue native FL Studio integration via Image-Line partnership.

### Lessons for Music Copilot

**What Splice Bridge does better than our current proposal:**
- **Minimal VST3 surface area**: The plugin does almost nothing — just IPC + tempo relay. This reduces bugs, improves compatibility, and makes updates easier (update desktop app, not the plugin).
- **Named pipes over WebSocket**: Lower latency, OS-native, no port conflicts. Windows named pipes are purpose-built for local IPC.
- **Audio buffer management**: Desktop app handles all audio processing (time-stretch, pitch-shift); VST3 just passes PCM buffers. This avoids real-time thread issues in the plugin.
- **License re-auth pattern**: 3-day token check prevents abuse without requiring always-online DRM.

**What our proposal handles that Splice Bridge doesn't:**
- **Bidirectional audio**: Splice Bridge only streams Desktop→DAW. Music Copilot needs DAW→Desktop for real-time analysis. This requires an audio input bus on the VST3, which adds complexity (real-time thread constraints, buffer management).
- **MIDI generation**: Splice Bridge receives MIDI from DAW (keyboard input). Music Copilot generates MIDI and sends it to the DAW. VST3 has no native MIDI output port — MIDI must be injected into the DAW's event queue via `process()`.
- **No cloud dependency**: Splice Bridge requires the Desktop App to be running and authenticated. Music Copilot should work fully offline.

**Revised recommendation after Splice Bridge analysis:**

- **Stick with the skip-Tier-4 strategy** for now. Tiers 1–3 cover Music Copilot's current needs without JUCE/C++.
- **If Tier 4 is built**, use JUCE + named pipes (not WebSocket). Keep the plugin as thin as possible — tempo relay + audio I/O + MIDI passthrough only.
- **UI stays in Electron** (like Splice Gen 1). Don't embed WebView in the plugin unless truly necessary.
- **Design for DAW-agnosticism** but optimize for FL Studio. Test heavily with FL Studio's plugin wrapper — Splice's "fixed size buffers" workaround suggests FL Studio is particularly picky.
- **Pursue native FL Studio integration as the long-term goal** — but this requires a commercial relationship with Image-Line. The VST3 bridge is the path to proving demand.
- **Don't build MIDI controller scripting (Tier 3) as a prerequisite to the VST3 bridge.** They solve different problems: MIDI scripting is for DAW control (transport, mixer), VST3 is for audio/MIDI streaming. Both are valuable independently.

---

1. Image-Line. *FL Studio MIDI Scripting Manual*. https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/midi_scripting.htm
2. IL-Group. *FL Studio API Stubs*. GitHub. https://github.com/IL-Group/FL-Studio-API-Stubs
3. MaddyGuthridge. *Universal Controller Script*. GitHub. https://github.com/MaddyGuthridge/Universal-Controller-Script
4. MaddyGuthridge. *Flapi: Remote Control Server for FL Studio*. GitHub. https://github.com/MaddyGuthridge/Flapi
5. Tobias Erichsen. *loopMIDI — Virtual Loopback MIDI Cable*. https://www.tobias-erichsen.de/software/loopmidi.html
6. Tobias Erichsen. *virtualMIDI SDK*. https://www.tobias-erichsen.de/software/virtualmidi.html
7. Microsoft. *Windows MIDI Services Documentation*. https://microsoft.github.io/MIDI/
8. Pete Brown (Microsoft). *Windows MIDI Services Rollout — Known Issues and Workarounds*. Feb 2026. https://devblogs.microsoft.com/windows-music-dev/windows-midi-services-rollout-known-issues-and-workarounds/
9. JUCE Framework. https://juce.com/
10. Steinberg. *VST3 SDK*. https://steinbergmedia.github.io/vst3_dev_portal/
11. CLAP Audio Plugin Format. https://cleveraudio.org/
12. karl-andres. *FL Studio MCP Server*. GitHub. https://github.com/karl-andres/fl-studio-mcp
13. nfxbeats. *NFXTemplate — FL Studio MIDI Script Template*. GitHub. https://github.com/nfxbeats/NFXTemplate
14. sudara. *awesome-juce*. GitHub. https://github.com/sudara/awesome-juce
15. MIDI.org. *MIDI 2.0 Coming to Windows 11*. https://midi.org/midi-2-0-coming-to-windows-11
16. Splice. *Splice Bridge — Features*. https://splice.com/tools/bridge
17. Splice. *What is Splice Bridge?* Help Center. https://support.splice.com/en/articles/8652855-what-is-splice-bridge
18. Splice. *How to install Splice Bridge*. Help Center. https://support.splice.com/en/articles/8652856-how-do-i-install-splice-bridge
19. Splice. *How to use Splice Bridge*. Help Center. https://support.splice.com/en/articles/8652857-how-do-i-use-splice-bridge
20. Splice. *Why is Bridge having issues in FL Studio?* Help Center. https://support.splice.com/en/articles/9824220-why-is-bridge-having-issues-in-fl-studio
21. Splice. *FAQ: Splice Sounds Plugin — now in Beta*. Help Center. https://support.splice.com/en/articles/12997860-faq-splice-sounds-plugin-now-in-beta
22. Splice Blog. *Make the most of Bridge: The workflow level-up*. https://splice.com/blog/how-to-use-splice-bridge/
23. Splice. *Splice Sounds Plugin (beta)*. https://splice.com/tools/sounds-plugin
24. DJ Mag. *Splice can finally talk to your DAW with their new Bridge plugin*. June 2021. https://djmag.com/news/splice-can-finally-talk-your-daw-their-new-bridge-plugin
25. Ableton. *Splice integration in Ableton Live FAQ*. https://help.ableton.com/hc/en-us/articles/22060471916316-Splice-integration-in-Ableton-Live-FAQ
26. Attack Magazine. *Splice Integration and Stem Separation Arrive in Ableton Live 12.3 Beta*. Sep 2025. https://www.attackmagazine.com/news/splice-integration-and-stem-seperation-arrive-in-ableton-live-12-3-beta
27. ProMedia Training. *Pro Tools Adds Splice Integration*. Aug 2025. https://www.protoolstraining.com/blog-help/pro-tools-blog/tips-and-tricks/541-pro-tools-adds-splice-integration
28. JUCE. *JUCE Framework — Homepage*. https://juce.com/ (Splice listed as JUCE user)
29. KVR Audio. *Splice Bridge — Product Page*. https://www.kvraudio.com/product/splice-bridge-by-splice
