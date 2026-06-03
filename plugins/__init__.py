import importlib.util
from pathlib import Path
from typing import Any

from plugins.base import Plugin, PluginResult
from plugins.events import event_bus

_registry: dict[str, Plugin] = {}


def discover_plugins() -> dict[str, Plugin]:
    plugins_dir = Path(__file__).parent
    for entry in sorted(plugins_dir.iterdir()):
        if not entry.is_dir() or entry.name.startswith("_"):
            continue
        plugin_file = entry / "plugin.py"
        if not plugin_file.exists():
            continue
        spec = importlib.util.spec_from_file_location(
            f"plugins.{entry.name}.plugin",
            plugin_file,
        )
        if spec is None or spec.loader is None:
            continue
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        for attr_name in dir(mod):
            cls = getattr(mod, attr_name)
            if (
                isinstance(cls, type)
                and issubclass(cls, Plugin)
                and cls is not Plugin
            ):
                instance = cls()
                _register_plugin_events(instance)
                _registry[instance.name] = instance
    return _registry


def _register_plugin_events(plugin: Plugin) -> None:
    for event, method_name in plugin.subscribes_to.items():
        handler = getattr(plugin, method_name, None)
        if handler is not None:
            event_bus.on(event, handler)


def get_plugin(name: str) -> Plugin | None:
    return _registry.get(name)


def get_plugin_schema(name: str) -> dict | None:
    plugin = get_plugin(name)
    if plugin is None or plugin.input_schema is None:
        return None
    return plugin.input_schema.model_json_schema()


def list_plugins() -> list[dict[str, str]]:
    return [
        {
            "name": p.name,
            "description": p.description,
            "version": p.version,
            "has_schema": p.input_schema is not None,
        }
        for p in _registry.values()
    ]


async def execute_plugin(name: str, **kwargs: Any) -> PluginResult:
    plugin = get_plugin(name)
    if plugin is None:
        return PluginResult(
            success=False,
            data={},
            error=f"Plugin '{name}' not found",
        )
    try:
        if plugin.input_schema is not None:
            validated = plugin.input_schema(**kwargs)
            result = await plugin.execute(**validated.model_dump())
        else:
            result = await plugin.execute(**kwargs)
        return result
    except Exception as e:
        return PluginResult(
            success=False,
            data={},
            error=str(e),
        )
