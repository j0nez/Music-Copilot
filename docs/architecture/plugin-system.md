# Plugin System

Every feature in Music Copilot is a self-contained plugin. The core application discovers plugins automatically, validates their inputs via schemas, and routes events between them through a shared event bus.

## Plugin ABC

All plugins must subclass `Plugin` and implement the `execute` method:

```python
# plugins/base.py
from abc import ABC, abstractmethod
from pydantic import BaseModel

class PluginResult(BaseModel):
    success: bool
    data: dict
    error: str | None = None

class Plugin(ABC):
    name: str                # Unique identifier, e.g., "sample_analyzer"
    description: str         # Human-readable description
    version: str = "0.1.0"
    input_schema: type[BaseModel] | None = None  # Pydantic model for input validation

    subscribes_to: dict[str, str] = {}  # event_name -> method_name

    @abstractmethod
    async def execute(self, **kwargs) -> PluginResult:
        ...
```

### `input_schema`

Each plugin declares what inputs it expects via a Pydantic model. The core validates inputs before execution and exposes the schema via the API so the frontend can auto-generate forms.

```python
class AnalyzeInput(BaseModel):
    filepath: str
    analyze_bpm: bool = True
    analyze_key: bool = True

class SampleAnalyzer(Plugin):
    name = "sample_analyzer"
    description = "Detects BPM, key, and scale from audio files"
    input_schema = AnalyzeInput
    ...
```

### `subscribes_to`

Plugins can listen to events emitted by other plugins. The core auto-wires these subscriptions during discovery.

```python
class ChordGenerator(Plugin):
    name = "chord_generator"
    description = "Generates chord progressions"
    subscribes_to = {"sample.analyzed": "on_sample_analyzed"}

    async def on_sample_analyzed(self, **data):
        key = data.get("key", "C")
        # generate chords matching this key
```

## Auto-Discovery

On startup, the backend scans the `/plugins/` directory for subdirectories containing a `plugin.py` that exports a class inheriting from `Plugin`.

Discovery flow:
1. Scan `/plugins/` for subdirectories with `plugin.py`
2. Import each module dynamically
3. Find `Plugin` subclasses and instantiate them
4. Register event subscriptions via `subscribes_to`
5. Add to `_registry` indexed by `name`

```python
# plugins/__init__.py
def discover_plugins() -> dict[str, Plugin]:
    plugins_dir = Path(__file__).parent
    for entry in sorted(plugins_dir.iterdir()):
        if not entry.is_dir() or entry.name.startswith("_"):
            continue
        plugin_file = entry / "plugin.py"
        if not plugin_file.exists():
            continue
        # ... dynamic import + registry ...
        instance = cls()
        _register_plugin_events(instance)
        _registry[instance.name] = instance
```

## Event Bus

Plugins never call each other directly. They communicate through a shared event bus:

```python
from plugins.events import event_bus

# Emit an event
await event_bus.emit("sample.analyzed", bpm=128, key="Fm")

# Listen to an event (or use subscribes_to on the Plugin class)
event_bus.on("sample.analyzed", my_handler)
```

The event bus is a simple dict-based implementation with `on()`, `off()`, and `emit()`. Events are strings, handlers are async functions, and data is passed as keyword arguments.

### Event Naming Convention

Events follow the pattern `{source}.{action}`:

| Event | When | Data |
|-------|------|------|
| `sample.analyzed` | Sample analysis complete | `SampleAnalysisResult` fields |
| `progression.generated` | Chord progression created | `ChordProgression` fields |
| `midi.exported` | MIDI file written | `MidiOutput` fields |
| `track.analyzed` | Full track analysis done | `TrackAnalysis` fields |

## Plugin Structure

Each plugin lives in its own directory under `/plugins/`:

```
plugins/
├── __init__.py          # Discovery + registry + schema
├── base.py              # Plugin ABC
├── events.py            # EventBus
└── sample_analyzer/
    ├── __init__.py
    └── plugin.py        # class SampleAnalyzer(Plugin): ...
```

A plugin can have its own submodules, data files, or configuration. Only the `plugin.py` with a `Plugin` subclass is required.

## Plugin Lifecycle

| Phase | When | What happens |
|-------|------|-------------|
| **Discovery** | App startup | `discover_plugins()` scans, instantiates, wires events |
| **Registration** | App startup | Plugins added to `_registry`, event handlers registered |
| **Execution** | On demand | `execute_plugin(name, **kwargs)` validates + runs |
| **Event emit** | During execution | Plugin calls `event_bus.emit()` → other plugins react |
| **Result** | After execution | `PluginResult` returned (success + data, or error) |

## API Endpoints

```python
GET  /api/plugins/                   # List all discovered plugins
GET  /api/plugins/{name}/schema      # Get input JSON Schema for a plugin
POST /api/plugins/{name}/execute     # Execute a plugin (validates via input_schema)
```

## Conventions

- Plugin names are `snake_case` and match their directory name.
- Plugins are stateless — all state should be persisted via the service layer or SQLite.
- Plugins that need AI call `llm.generate()` — never import a provider directly.
- Plugins communicate via the event bus — never import another plugin directly.
- Event names use `{source}.{action}` dot notation.
