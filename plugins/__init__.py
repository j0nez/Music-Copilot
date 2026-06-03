import importlib.util
import logging
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from plugins.base import Plugin, PluginResult
from plugins.events import event_bus

logger = logging.getLogger("music_copilot.plugins")

_registry: dict[str, Plugin] = {}


def discover_plugins() -> dict[str, Plugin]:
    plugins_dir = Path(__file__).parent
    discovered = 0
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
                discovered += 1
                logger.info("Discovered plugin: %s v%s", instance.name, instance.version)
    logger.info("Plugin discovery complete: %d plugins loaded", discovered)
    return _registry


def _register_plugin_events(plugin: Plugin) -> None:
    for event, method_name in plugin.subscribes_to.items():
        handler = getattr(plugin, method_name, None)
        if handler is not None:
            event_bus.on(event, handler)
            logger.debug("Plugin '%s' subscribed to event '%s'", plugin.name, event)


def get_plugin(name: str) -> Plugin | None:
    return _registry.get(name)


def get_plugin_schema(name: str) -> dict | None:
    plugin = get_plugin(name)
    if plugin is None:
        logger.warning("Schema requested for unknown plugin: %s", name)
        return None
    if plugin.input_schema is None:
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
        logger.warning("Plugin not found: %s", name)
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
        logger.info("Plugin '%s' executed successfully", name)
        return result
    except ValidationError as e:
        logger.warning("Input validation failed for '%s': %s", name, e)
        return PluginResult(
            success=False,
            data={},
            error=str(e),
        )
    except Exception as e:
        logger.error("Plugin '%s' failed: %s", name, e, exc_info=True)
        return PluginResult(
            success=False,
            data={},
            error=str(e),
        )
