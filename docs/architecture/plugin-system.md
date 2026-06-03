# Plugin System

Every feature in Music Copilot is a self-contained plugin. The core application discovers plugins automatically and provides a uniform execution interface.

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

    @abstractmethod
    async def execute(self, **kwargs) -> PluginResult:
        """Execute the plugin's feature logic."""
        ...
```

## Auto-Discovery

On startup, the backend scans the `/plugins/` directory for subdirectories containing a `plugin.py` that exports a class inheriting from `Plugin`.

```python
# plugins/__init__.py
import importlib
import pkgutil
from pathlib import Path
from .base import Plugin

_registry: dict[str, Plugin] = {}

def discover_plugins():
    plugins_dir = Path(__file__).parent
    for entry in plugins_dir.iterdir():
        if entry.is_dir() and (entry / "plugin.py").exists():
            spec = importlib.util.spec_from_file_location(
                f"plugins.{entry.name}.plugin",
                entry / "plugin.py"
            )
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            for attr in dir(mod):
                cls = getattr(mod, attr)
                if isinstance(cls, type) and issubclass(cls, Plugin) and cls is not Plugin:
                    instance = cls()
                    _registry[instance.name] = instance
```

## Plugin Structure

Each plugin lives in its own directory under `/plugins/`:

```
plugins/
├── __init__.py          # Discovery logic
├── base.py              # Plugin ABC
└── sample_analyzer/
    ├── __init__.py
    └── plugin.py        # class SampleAnalyzer(Plugin): ...
```

A plugin can have its own submodules, data files, or configuration. There are no restrictions on internal structure — only the `plugin.py` with a `Plugin` subclass is required.

## Plugin Lifecycle

| Phase | When | What happens |
|-------|------|-------------|
| **Discovery** | App startup | `plugins/__init__.py` scans and instantiates all plugins |
| **Registration** | App startup | Plugins added to `_registry` dict, indexed by `name` |
| **Execution** | On demand | Backend route calls `plugins.execute(name, **kwargs)` |
| **Result** | After execution | `PluginResult` returned (success + data, or error) |

## API Endpoints

```python
GET  /api/plugins              # List all discovered plugins
POST /api/plugins/{name}/execute  # Execute a specific plugin
```

## Conventions

- Plugin names are `snake_case` and match their directory name.
- Plugins are stateless — all state should be persisted via the service layer or SQLite.
- Plugins that need AI call `llm.generate()` — never import a provider directly.
