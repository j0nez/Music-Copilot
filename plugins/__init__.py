import importlib.util
from pathlib import Path
from typing import Any

from plugins.base import Plugin, PluginResult

_registry: dict[str, Plugin] = {}


def discover_plugins() -> dict[str, Plugin]:
    plugins_dir = Path(__file__).parent
    for entry in sorted(plugins_dir.iterdir()):
        if not entry.is_dir():
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
                _registry[instance.name] = instance
    return _registry


def get_plugin(name: str) -> Plugin | None:
    return _registry.get(name)


def list_plugins() -> list[dict[str, str]]:
    return [
        {"name": p.name, "description": p.description, "version": p.version}
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
        return await plugin.execute(**kwargs)
    except Exception as e:
        return PluginResult(
            success=False,
            data={},
            error=str(e),
        )
